import type { Writable } from 'node:stream';
import type pg from 'pg';
import { workKindLabel, workResultLabel, type MaintenanceRecord, type RecordFilters } from '@platlab/contracts';
import { writeXlsx, type XlsxCell } from '../../../platform/export/xlsx.js';
import { activeLocations, recordAudit, requirePermission, type QueryRequest, type WorkspaceAccess } from '../../core/index.js';
import { listProviders } from '../infrastructure/providers.queries.js';
import { findAssets, workspaceToday } from '../infrastructure/work.queries.js';
import { REPORT, runQuery } from './command.js';
import { recordBatches } from './records.js';

/** Registros por lote: el Excel sale por partes, sin cargar el historial entero (ADR 0017). */
const EXPORT_BATCH = 500;

const yesNo = (value: boolean) => (value ? 'Sí' : 'No');
const day = (value: string | null): XlsxCell => (value ? { date: value } : null);

/** Fecha y hora en la zona del espacio: «19/10/26, 10:21». */
const dateTime = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('es-EC', { timeZone, dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

/** La lista de verificación en una celda: «✓ Limpiar filtros; ✗ Revisar sellos». */
const checklistText = (checklist: MaintenanceRecord['checklist']) =>
  checklist.length > 0 ? checklist.map(({ item, done }) => `${done ? '✓' : '✗'} ${item}`).join('; ') : null;

function voidText(record: MaintenanceRecord, timeZone: string): string | null {
  if (!record.voided) return null;
  const by = record.voided.by ? ` por ${record.voided.by.name}` : '';
  return `Anulado el ${dateTime(record.voided.at, timeZone)}${by}: ${record.voided.reason}`;
}

/**
 * Columnas del Excel del Historial (M-01d): todo lo que el registro guarda, con su ancho en caracteres. «A
 * tiempo» compara la fecha del trabajo con la que tocaba, como Indicadores (M-01c).
 */
const columns = (timeZone: string): Array<[title: string, width: number, value: (record: MaintenanceRecord) => XlsxCell]> => [
  ['Fecha del trabajo', 12, (record) => day(record.performedOn)],
  ['Código', 12, (record) => record.asset.code],
  ['Equipo', 28, (record) => record.asset.name],
  ['Área', 20, (record) => record.asset.area],
  ['Tipo de trabajo', 14, (record) => workKindLabel[record.kind]],
  ['Plan', 28, (record) => record.plan?.title ?? null],
  ['Requisito', 20, (record) => record.plan?.requirement ?? null],
  ['Resultado', 16, (record) => workResultLabel[record.result]],
  ['Fecha que tocaba', 12, (record) => day(record.dueOn)],
  ['A tiempo', 9, (record) => (record.dueOn ? yesNo(record.performedOn <= record.dueOn) : null)],
  ['Quién lo hizo', 22, (record) => record.provider?.name ?? 'Interno'],
  ['Costo (USD)', 12, (record) => (record.cost ? { number: record.cost } : null)],
  ['Válida hasta', 12, (record) => day(record.validUntil)],
  ['Observaciones', 40, (record) => record.observations],
  ['Lista de verificación', 40, (record) => checklistText(record.checklist)],
  ['Criterio de aceptación', 30, (record) => record.acceptanceCriteria],
  ['Certificado', 11, (record) => yesNo(record.certificate !== null)],
  ['Registrado por', 22, (record) => record.recordedBy?.name ?? null],
  ['Registrado el', 16, (record) => dateTime(record.recordedAt, timeZone)],
  ['Corrige al registro del', 14, (record) => day(record.corrects?.performedOn ?? null)],
  ['Anulación', 40, (record) => voidText(record, timeZone)],
];

/** Los filtros en palabras para el encabezado: «Periodo: 2026-01-01 a 2026-06-30 · Tipo: Calibración». */
async function filtersText(access: WorkspaceAccess, filters: RecordFilters): Promise<string> {
  const workspaceId = access.workspace.id;
  const parts: string[] = [];
  if (filters.assetId) {
    const [asset] = await findAssets.run({ workspaceId, q: null, code: null, assetId: filters.assetId }, access.client);
    parts.push(`Equipo: ${asset ? `${asset.code} ${asset.name}` : 'equipo no encontrado'}`);
  }
  if (filters.from || filters.to) parts.push(`Periodo: ${filters.from ?? 'el inicio'} a ${filters.to ?? 'hoy'}`);
  if (filters.kind) parts.push(`Tipo: ${filters.kind.map((kind) => workKindLabel[kind]).join(', ')}`);
  if (filters.result) parts.push(`Resultado: ${filters.result.map((result) => workResultLabel[result]).join(', ')}`);
  if (filters.area) {
    const names = new Map((await activeLocations(access)).map((location) => [location.id, location.name]));
    parts.push(`Área: ${filters.area.map((id) => names.get(id) ?? 'área archivada').join(', ')}`);
  }
  if (filters.provider) {
    const providers = await listProviders.run({ workspaceId, providerId: null }, access.client);
    const names = new Map(providers.map((provider) => [provider.id, provider.name]));
    const chosen = filters.provider.map((id) => (id === 'internal' ? 'Interno' : (names.get(id) ?? 'proveedor archivado')));
    parts.push(`Quién lo hizo: ${chosen.join(', ')}`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'ninguno';
}

const stamp = (timeZone: string) => dateTime(new Date().toISOString(), timeZone);

/**
 * Excel del Historial (M-01d), del Administrador: lo filtrado, con los anulados y su motivo, el espacio, la fecha, quién lo generó
 * y los filtros en el encabezado. Es un reporte (01 §5) y queda en la auditoría. Abre el destino solo después
 * de autorizar, así un rechazo responde con su error; si algo falla después, revierte, y el archivo solo se
 * completa tras confirmar la auditoría.
 */
export async function exportRecords(
  pool: pg.Pool,
  request: QueryRequest,
  filters: RecordFilters,
  open: (fileName: string) => Writable,
): Promise<void> {
  const sheet = await runQuery(pool, request, async (access) => {
    await requirePermission(access, REPORT);
    const { timeZone } = access.workspace;
    const [{ today }] = (await workspaceToday.run({ timeZone }, access.client)) as [{ today: string }];
    const filterLine = await filtersText(access, filters);
    const sheetColumns = columns(timeZone);
    const book = writeXlsx(open(`historial-mantenimiento-${today}.xlsx`), {
      sheetName: 'Historial',
      widths: sheetColumns.map(([, width]) => width),
    });
    await book.row(['Historial de mantenimiento'], { bold: true });
    await book.row([`Espacio: ${access.workspace.name}`]);
    await book.row([`Generado el ${stamp(timeZone)} por ${access.displayName}`]);
    await book.row([`Filtros: ${filterLine}`]);
    await book.row([]);
    await book.row(
      sheetColumns.map(([title]) => title),
      { bold: true },
    );

    let rows = 0;
    for await (const batch of recordBatches(access, filters, EXPORT_BATCH)) {
      for (const record of batch) await book.row(sheetColumns.map(([, , value]) => value(record)));
      rows += batch.length;
    }

    await recordAudit(access, {
      action: 'maintenance.history.export',
      entityType: 'maintenance.history',
      changes: { format: 'xlsx', filters, rows },
    });
    return book;
  });
  // El cierre del archivo sale después de confirmar la auditoría: sin ella, la descarga queda incompleta.
  await sheet.end();
}
