import type { Writable } from 'node:stream';
import type pg from 'pg';
import {
  conditionLabel,
  conservationLabel,
  usefulLifeStateLabel,
  warrantyStateLabel,
  type Asset,
} from '@platlab/contracts';
import { startReport, type ReportColumn } from '../../../platform/export/report.js';
import {
  activeDepartments,
  activeLocations,
  recordAudit,
  listActiveMembers,
  requirePermission,
  type QueryRequest,
  type WorkspaceAccess,
} from '../../core/index.js';
import { listAssets as listAssetsQuery, listAssetTypes } from '../infrastructure/assets.queries.js';
import { REPORT, runQuery } from './command.js';
import { assetFilterParams, type AssetFilters } from './filters.js';
import { toAsset } from './queries.js';

/** Equipos por lote: el Excel sale por partes, sin cargar el inventario entero (ADR 0017). */
const EXPORT_BATCH = 500;

/** Columnas del Excel: todos los datos de la ficha (ADR 0019, E-01c), con su ancho en caracteres. */
const COLUMNS: ReportColumn<Asset>[] = [
  ['Código', 12, (asset) => asset.code],
  ['Nombre', 32, (asset) => asset.name],
  ['Tipo', 18, (asset) => asset.type.name],
  ['Marca', 16, (asset) => asset.brand],
  ['Modelo', 16, (asset) => asset.model],
  ['Serie', 16, (asset) => asset.serialNumber],
  ['Alimentación', 12, (asset) => asset.powerSupply],
  ['Ubicación', 36, (asset) => (asset.location.path.length > 0 ? asset.location.path : [asset.location.name]).join(' › ')],
  ['Estado', 16, (asset) => conditionLabel[asset.condition]],
  ['Estado físico', 12, (asset) => (asset.conservation ? conservationLabel[asset.conservation] : null)],
  ['Responsable', 22, (asset) => asset.responsible?.name ?? null],
  ['Departamento', 22, (asset) => asset.department?.name ?? null],
  ['Proveedor', 20, (asset) => asset.supplier],
  ['Fecha de compra', 14, (asset) => (asset.acquiredOn ? { date: asset.acquiredOn } : null)],
  ['Garantía hasta', 14, (asset) => (asset.warrantyUntil ? { date: asset.warrantyUntil } : null)],
  ['Vida útil (años)', 12, (asset) => (asset.usefulLifeYears === null ? null : { number: String(asset.usefulLifeYears) })],
  ['Valor de reposición (USD)', 16, (asset) => (asset.replacementValue ? { number: asset.replacementValue } : null)],
];

/** Los filtros en palabras para el encabezado: «Estado: Fuera de servicio · Tipo: Balanza». */
async function filtersText(access: WorkspaceAccess, filters: AssetFilters): Promise<string> {
  const parts: string[] = [];
  if (filters.condition) parts.push(`Estado: ${filters.condition.map((value) => conditionLabel[value]).join(', ')}`);
  if (filters.type) {
    const types = await listAssetTypes.run({ workspaceId: access.workspace.id }, access.client);
    const names = new Map(types.map((type) => [type.id, type.name]));
    parts.push(`Tipo: ${filters.type.map((id) => names.get(id) ?? 'tipo archivado').join(', ')}`);
  }
  if (filters.location) {
    const names = new Map((await activeLocations(access)).map((location) => [location.id, location.name]));
    parts.push(`Ubicación: ${filters.location.map((id) => names.get(id) ?? 'ubicación archivada').join(', ')}`);
  }
  if (filters.departamento) {
    const names = new Map((await activeDepartments(access)).map((department) => [department.id, department.name]));
    parts.push(`Departamento: ${filters.departamento.map((id) => names.get(id) ?? 'departamento archivado').join(', ')}`);
  }
  if (filters.responsible) {
    const people = await listActiveMembers(access);
    const names = new Map(people.map((person) => [person.id, person.name]));
    const chosen = filters.responsible.map((id) => (id === 'none' ? 'Sin responsable' : (names.get(id) ?? 'miembro inactivo')));
    parts.push(`Responsable: ${chosen.join(', ')}`);
  }
  if (filters.conservation) {
    const chosen = filters.conservation.map((value) => (value === 'none' ? 'Sin dato' : conservationLabel[value]));
    parts.push(`Estado físico: ${chosen.join(', ')}`);
  }
  if (filters.warranty) parts.push(`Garantía: ${filters.warranty.map((value) => warrantyStateLabel[value]).join(', ')}`);
  if (filters.usefulLife) parts.push(`Vida útil: ${filters.usefulLife.map((value) => usefulLifeStateLabel[value]).join(', ')}`);
  if (filters.q) parts.push(`Búsqueda: «${filters.q}»`);
  return parts.length > 0 ? parts.join(' · ') : 'ninguno (sin los dados de baja)';
}

/**
 * Excel del Informe (ADR 0017, 0019): lo filtrado, con el espacio, la fecha, quién lo generó y los
 * filtros en el encabezado. Es un reporte (01 §5) y queda en la auditoría. Abre el destino solo
 * después de autorizar, así un rechazo responde con su error; si algo falla después, revierte, y el
 * archivo solo se completa tras confirmar la auditoría.
 */
export async function exportAssets(
  pool: pg.Pool,
  request: QueryRequest,
  filters: AssetFilters,
  open: (fileName: string) => Writable,
): Promise<void> {
  const sheet = await runQuery(pool, request, async (access) => {
    await requirePermission(access, REPORT);
    const book = await startReport(open, {
      fileName: 'informe-equipos',
      sheetName: 'Equipos',
      title: 'Informe de equipos',
      workspace: access.workspace,
      author: access.displayName,
      filters: await filtersText(access, filters),
      columns: COLUMNS,
    });

    const params = assetFilterParams(access.workspace.timeZone, filters);
    let afterCode: string | null = null;
    let rows = 0;
    for (;;) {
      const batch = await listAssetsQuery.run(
        {
          workspaceId: access.workspace.id,
          ...params,
          afterCode,
          limit: EXPORT_BATCH,
        },
        access.client,
      );
      for (const row of batch) await book.add(toAsset(row));
      rows += batch.length;
      const last = batch.at(-1);
      if (batch.length < EXPORT_BATCH || !last) break;
      afterCode = last.sort_code;
    }

    await recordAudit(access, {
      action: 'equipment.report.export',
      entityType: 'equipment.report',
      changes: { format: 'xlsx', filters, rows },
    });
    return book;
  });
  // El cierre del archivo sale después de confirmar la auditoría: sin ella, la descarga queda incompleta.
  await sheet.end();
}
