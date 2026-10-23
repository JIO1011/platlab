import type { MaintenanceRecord } from '@platlab/contracts';
import { Badge, Button, Skeleton, StatePanel, cn, formatDecimal } from '@platlab/ui';
import { History, SearchX, X } from 'lucide-react';
import { Suspense, lazy, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { QueryErrorState } from '../../app/states';
import { formatDate } from '../../app/format';
import { AttachSheet } from './attach-sheet';
import { useMaintenance } from './context';
import { CodeTag } from '../../app/code-tag';
import { DuePill } from './due-view';
import { RecordDetail, resultTone } from './record-detail';
import { HistoryExport } from './history-export';
import { emptyHistoryFilters, historySearch, INTERNAL, isHistoryFiltered, parseHistoryFilters, type HistoryFilters } from './history-filters';
import { HistoryFilterBar } from './history-filter-bar';
import { recordsText, type HistoryNames } from './history-text';
import { useMaintenanceAreas, useProviders, useRecords } from './queries';
import { SectionHeader } from '../../app/section-header';
import { VoidSheet } from './void-sheet';
import { kindLabels, resultLabels } from './work-text';

/** La hoja de registro se descarga al corregir: el historial no carga el formulario ni el escáner. */
const RecordSheet = lazy(async () => ({ default: (await import('./record-sheet')).RecordSheet }));

/** Una hoja abierta; `n` la monta de nuevo en cada apertura (formulario limpio). */
interface OpenRecord {
  n: number;
  open: boolean;
  record: MaintenanceRecord;
}

/**
 * Las columnas de la lista cuando la propia lista mide 48 rem o más (consulta de contenedor: el ancho de la ventana
 * no dice cuánto cabe junto al menú lateral). Más angosta, cada registro se apila.
 */
const columns = '@3xl:grid-cols-[6.5rem_minmax(0,1fr)_9.5rem_5.5rem_7.5rem]';

/** El trabajo de un registro: el plan con su tipo; sin plan, el tipo (un correctivo nunca tiene plan). */
const planText = (record: MaintenanceRecord): string =>
  record.plan ? `${record.plan.title} · ${kindLabels[record.kind]}` : record.kind === 'corrective' ? kindLabels.corrective : `${kindLabels[record.kind]} · sin plan`;

/**
 * Historial (ADR 0020): lo registrado, del más reciente al más antiguo, con el resultado, quién lo hizo, el costo y el
 * certificado. Abrir uno muestra su detalle de solo lectura. Con `?equipo=` son los de un solo equipo. Para el
 * auditor (M-01d): filtros en la dirección (periodo, tipo, resultado, área y quién lo hizo), en una barra sobre la
 * lista (ADR 0021), y «Exportar» (imprimir o Excel) de lo mismo que se filtra.
 */
export function MaintenanceHistoryPage() {
  const { workspaceId, me, canRecord, canOperate } = useMaintenance();
  // Corregir y anular son del Administrador (M-01b).
  const canVoid = canOperate && me.permissions.includes('maintenance.record.void');
  const [params, setParams] = useSearchParams();
  const filters = parseHistoryFilters(params);
  const records = useRecords(workspaceId, filters);
  const areas = useMaintenanceAreas(workspaceId);
  const providers = useProviders(workspaceId);
  const [detail, setDetail] = useState<OpenRecord | null>(null);
  const [attach, setAttach] = useState<OpenRecord | null>(null);
  const [correct, setCorrect] = useState<OpenRecord | null>(null);
  const [annul, setAnnul] = useState<OpenRecord | null>(null);
  const items = records.data?.pages.flatMap((page) => page.items) ?? [];
  const filtered = items[0]?.asset;

  // Cada cambio escribe la URL, sin sumar entradas al historial del navegador; el equipo de la ficha se conserva.
  const apply = (change: Partial<HistoryFilters>) => setParams(historySearch({ ...filters, ...change }), { replace: true });
  const clearFilters = () => setParams(historySearch({ ...emptyHistoryFilters, assetId: filters.assetId }), { replace: true });
  const names = useMemo<HistoryNames>(
    () => ({
      asset: filtered ? `${filtered.code} ${filtered.name}` : undefined,
      areas: new Map((areas.data?.items ?? []).map((area) => [area.id, area.name])),
      providers: new Map((providers.data?.items ?? []).map((provider) => [provider.id, provider.name])),
    }),
    [filtered, areas.data, providers.data],
  );
  const namesPending = (filters.areas.length > 0 && areas.isPending) || (filters.providers.some((id) => id !== INTERNAL) && providers.isPending);
  const count = records.isPending ? undefined : recordsText(items.length, records.hasNextPage);

  const clearAsset = () =>
    setParams(
      (previous) => {
        const search = new URLSearchParams(previous);
        search.delete('equipo');
        return search;
      },
      { replace: true },
    );

  const open = (record: MaintenanceRecord) => setDetail({ n: (detail?.n ?? 0) + 1, open: true, record });
  const attachTo = (record: MaintenanceRecord) => setAttach({ n: (attach?.n ?? 0) + 1, open: true, record });
  const correctTo = (record: MaintenanceRecord) => setCorrect({ n: (correct?.n ?? 0) + 1, open: true, record });
  const voidTo = (record: MaintenanceRecord) => setAnnul({ n: (annul?.n ?? 0) + 1, open: true, record });

  return (
    <>
      <SectionHeader
        title="Historial"
        updatedAt={records.dataUpdatedAt}
        actions={<HistoryExport records={records} filters={filters} names={names} namesPending={namesPending} />}
      />
      <div className="mt-6">
        <div className="grid min-w-0 gap-4">
          {filters.assetId ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
              <span>
                Solo los del equipo{' '}
                <span className="font-semibold text-ink">
                  {filtered ? (
                    <>
                      <span className="font-mono text-[13px] font-normal tabular-nums">{filtered.code}</span> {filtered.name}
                    </>
                  ) : (
                    'elegido'
                  )}
                </span>
              </span>
              <Button size="sm" className="max-sm:h-11" onClick={clearAsset}>
                <X aria-hidden />
                Ver todos
              </Button>
            </p>
          ) : null}
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="w-full min-w-0 sm:w-auto sm:flex-1">
              <HistoryFilterBar filters={filters} areas={areas} providers={providers} onChange={apply} onClear={clearFilters} />
            </div>
            {/* La cuenta se dice en voz baja: las filas ya están a la vista. */}
            <p className="text-sm tabular-nums text-ink-muted" aria-live="polite">
              {count ?? ''}
            </p>
          </div>
          {records.isPending ? (
            <div aria-busy="true">
              <Skeleton className="h-64 rounded-card" />
            </div>
          ) : records.isError ? (
            <div className="rounded-card bg-surface shadow-raised">
              <QueryErrorState error={records.error} onRetry={() => void records.refetch()} />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-card bg-surface shadow-raised">
              {isHistoryFiltered(filters) ? (
                <StatePanel
                  icon={SearchX}
                  title="Sin resultados con estos filtros"
                  description="Cambia o quita algún filtro para ver más registros."
                  action={
                    <Button size="sm" onClick={clearFilters}>
                      Limpiar filtros
                    </Button>
                  }
                />
              ) : (
                <StatePanel
                  icon={History}
                  title={filters.assetId ? 'Este equipo aún no tiene mantenimientos registrados' : 'Aún no hay mantenimientos registrados'}
                  description="Cada mantenimiento que se registre quedará aquí, con su resultado y su certificado."
                />
              )}
            </div>
          ) : (
            <div className="@container">
              <ul className={cn('divide-y divide-line overflow-hidden rounded-card bg-surface shadow-raised', records.isPlaceholderData && 'opacity-60 transition-opacity')}>
                {/* Encabezado solo visual: cada celda dice su rótulo al lector de pantalla. */}
                <li aria-hidden className={cn('hidden gap-x-4 px-5 py-2.5 text-[13px] font-medium text-ink-muted @3xl:grid', columns)}>
                  <span>Fecha</span>
                  <span>Equipo y plan</span>
                  <span>Resultado</span>
                  <span className="text-right">Costo</span>
                  <span>Certificado</span>
                </li>
                {items.map((record) => (
                  <li
                    key={record.id}
                    className={cn(
                      'relative grid gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-surface-sunken/60 has-[button:focus-visible]:outline-2 has-[button:focus-visible]:-outline-offset-2 has-[button:focus-visible]:outline-action sm:px-5 @3xl:min-h-[4.5rem] @3xl:items-center',
                      columns,
                    )}
                  >
                    <div className="min-w-0 @3xl:col-start-2 @3xl:row-start-1">
                      <p className="flex min-w-0 items-start gap-2 font-semibold text-ink @3xl:items-center">
                        <CodeTag>{record.asset.code}</CodeTag>
                        <button
                          type="button"
                          aria-haspopup="dialog"
                          onClick={() => open(record)}
                          className="min-w-0 break-words text-left font-semibold after:absolute after:inset-0 focus-visible:outline-none @3xl:truncate"
                        >
                          {record.asset.name}
                        </button>
                      </p>
                      <p className="mt-0.5 break-words text-[13px] text-ink-muted @3xl:truncate" title={planText(record)}>
                        {planText(record)}
                      </p>
                      {record.corrects ? (
                        <p className="text-[13px] text-ink-muted">Corrige al del {formatDate(record.corrects.performedOn)}</p>
                      ) : record.voided?.correctedBy ? (
                        <p className="text-[13px] text-ink-muted">Corregido por el del {formatDate(record.voided.correctedBy.performedOn)}</p>
                      ) : null}
                    </div>
                    {/* Apilado, la fecha, el resultado, el costo y el certificado van en una fila que se parte; en columnas, cada uno a la suya. */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 @3xl:contents">
                      <p className="text-sm tabular-nums text-ink-muted @3xl:col-start-1 @3xl:row-start-1">
                        <span className="sr-only">Fecha: </span>
                        {formatDate(record.performedOn)}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 @3xl:col-start-3 @3xl:row-start-1 @3xl:flex-col @3xl:items-start @3xl:gap-y-0.5">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="sr-only">Resultado: </span>
                          {record.voided ? <Badge tone="neutral">Anulado</Badge> : null}
                          <DuePill tone={resultTone[record.result]}>{resultLabels[record.result]}</DuePill>
                        </span>
                        <span className="text-[13px] text-ink-muted">{record.provider?.name ?? 'Interno'}</span>
                      </div>
                      <p className="ml-auto text-sm tabular-nums text-ink @3xl:col-start-4 @3xl:row-start-1 @3xl:ml-0 @3xl:text-right">
                        <span className="sr-only">Costo: </span>
                        {record.cost ? `$\u00A0${formatDecimal(record.cost)}` : <span className="text-ink-muted">Sin dato</span>}
                      </p>
                      <div className="relative z-10 @3xl:col-start-5 @3xl:row-start-1">
                        {record.certificate ? (
                          <a
                            href={record.certificate.url}
                            target="_blank"
                            rel="noopener"
                            className="inline-flex min-h-11 items-center text-sm font-semibold text-action underline-offset-2 hover:underline @3xl:min-h-8"
                          >
                            Ver certificado
                            <span className="sr-only"> de {record.asset.code} (PDF, se abre en otra pestaña)</span>
                          </a>
                        ) : canRecord && !record.voided ? (
                          <Button
                            size="sm"
                            className="h-11 border-line text-ink-muted hover:text-ink @3xl:h-8"
                            aria-haspopup="dialog"
                            aria-label={`Adjuntar certificado de ${record.asset.code}`}
                            onClick={() => attachTo(record)}
                          >
                            Adjuntar
                          </Button>
                        ) : (
                          <span className="text-[13px] text-ink-muted">Sin certificado</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {records.hasNextPage ? (
            <div className="text-center">
              <Button className="h-[44px] sm:h-10" loading={records.isFetchingNextPage} onClick={() => void records.fetchNextPage()}>
                Cargar más
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      {detail ? (
        <RecordDetail
          key={detail.n}
          record={detail.record}
          me={me}
          workspaceId={workspaceId}
          open={detail.open}
          onOpenChange={(next) => setDetail((current) => (current ? { ...current, open: next } : current))}
          canAttach={canRecord}
          onAttach={() => {
            setDetail((current) => (current ? { ...current, open: false } : current));
            attachTo(detail.record);
          }}
          {...(canVoid
            ? {
                actions: {
                  onCorrect: () => {
                    setDetail((current) => (current ? { ...current, open: false } : current));
                    correctTo(detail.record);
                  },
                  onVoid: () => {
                    setDetail((current) => (current ? { ...current, open: false } : current));
                    voidTo(detail.record);
                  },
                },
              }
            : {})}
        />
      ) : null}
      {attach ? (
        <AttachSheet
          key={attach.n}
          workspaceId={workspaceId}
          open={attach.open}
          onOpenChange={(next) => setAttach((current) => (current ? { ...current, open: next } : current))}
          record={attach.record}
        />
      ) : null}
      {annul ? (
        <VoidSheet
          key={annul.n}
          workspaceId={workspaceId}
          open={annul.open}
          onOpenChange={(next) => setAnnul((current) => (current ? { ...current, open: next } : current))}
          record={annul.record}
        />
      ) : null}
      {correct ? (
        <Suspense fallback={null}>
          <RecordSheet
            key={correct.n}
            workspaceId={workspaceId}
            me={me}
            open={correct.open}
            onOpenChange={(next) => setCorrect((current) => (current ? { ...current, open: next } : current))}
            correcting={correct.record}
          />
        </Suspense>
      ) : null}
    </>
  );
}
