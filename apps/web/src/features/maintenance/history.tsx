import type { MaintenanceRecord } from '@platlab/contracts';
import { Badge, Button, Drawer, Skeleton, StatePanel, cn, formatDecimal } from '@platlab/ui';
import { History, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { Suspense, lazy, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { FilterPanelClear } from '../../app/filter-group';
import { QueryErrorState } from '../../app/states';
import { formatDate } from '../../app/format';
import { useMediaQuery, useStoredFlag } from '../../app/use-media-query';
import { AttachSheet } from './attach-sheet';
import { useMaintenance } from './context';
import { RecordDetail, resultTone } from './record-detail';
import { HistoryChips } from './history-chips';
import { HistoryExport } from './history-export';
import { emptyHistoryFilters, historySearch, INTERNAL, isHistoryFiltered, parseHistoryFilters, type HistoryFilters } from './history-filters';
import { HistoryFilterPanel, type HistoryGroupId } from './history-panel';
import { activeHistoryFilters, recordsText, type HistoryNames } from './history-text';
import { useMaintenanceAreas, useProviders, useRecords } from './queries';
import { SectionHeader } from './section-header';
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

const panelId = 'filtros-historial';
/** Las columnas de la lista desde 768 px; con el panel de filtros a la vista la lista es más angosta y las cede. */
const wideColumns = 'md:grid-cols-[6.5rem_minmax(0,1.6fr)_minmax(0,1fr)_5.5rem_11rem]';
const panelColumns = 'md:grid-cols-[6.25rem_minmax(0,1.6fr)_minmax(0,1fr)_4.5rem_7rem]';

/**
 * Historial (ADR 0020): lo registrado, del más reciente al más antiguo, con el resultado, quién lo hizo, el costo y el
 * certificado. Abrir uno muestra su detalle de solo lectura. Con `?equipo=` son los de un solo equipo. Para el
 * auditor (M-01d): filtros en la dirección (periodo, tipo, resultado, área y quién lo hizo), en un panel a la
 * derecha desde 1280 px y en un cajón por debajo, y «Exportar» (imprimir o Excel) de lo mismo que se filtra.
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

  const wide = useMediaQuery('(min-width: 80rem)');
  const [panelOpen, setPanelOpen] = useStoredFlag('platlab.mantenimiento.historial.filtros', true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Solo un grupo plegable abierto a la vez, como en Movimientos.
  const [openGroup, setOpenGroup] = useState<HistoryGroupId | null>(null);
  const showPanel = wide && panelOpen;
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
  const chips = activeHistoryFilters(filters, names);
  const namesPending = (filters.areas.length > 0 && areas.isPending) || (filters.providers.some((id) => id !== INTERNAL) && providers.isPending);
  const groupsApplied = [filters.kinds, filters.results, filters.areas, filters.providers].filter((values) => values.length > 0).length + (filters.from || filters.to ? 1 : 0);
  const count = records.isPending ? undefined : recordsText(items.length, records.hasNextPage);
  const columns = showPanel ? panelColumns : wideColumns;
  const filtersLabel = showPanel ? 'Ocultar filtros' : groupsApplied > 0 ? `Filtros (${groupsApplied})` : 'Filtros';

  const panel = (
    <HistoryFilterPanel
      filters={filters}
      areas={areas}
      providers={providers}
      openGroup={openGroup}
      onToggleGroup={(group) => setOpenGroup((previous) => (previous === group ? null : group))}
      onChange={apply}
    />
  );

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
      <div className={cn('mt-6', showPanel && 'grid grid-cols-[minmax(0,1fr)_18rem] items-start gap-6')}>
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
          <div className="flex items-center justify-between gap-3">
            {/* La cuenta se dice en voz baja: las filas ya están a la vista. */}
            <p className="text-sm text-ink-muted" aria-live="polite">
              {count ?? ''}
            </p>
            <Button
              size="sm"
              className="ml-auto h-[44px] sm:h-8"
              aria-expanded={wide ? panelOpen : undefined}
              aria-controls={wide ? panelId : undefined}
              aria-haspopup={wide ? undefined : 'dialog'}
              onClick={() => (wide ? setPanelOpen(!panelOpen) : setDrawerOpen(true))}
            >
              <SlidersHorizontal aria-hidden />
              {filtersLabel}
            </Button>
          </div>
          {/* Con el panel a la vista, sus filtros ya se ven ahí. */}
          {showPanel ? null : <HistoryChips filters={chips} onRemove={apply} onClear={clearFilters} />}
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
            <ul
              className={cn('divide-y divide-line overflow-hidden rounded-card bg-surface shadow-raised', records.isPlaceholderData && 'opacity-60 transition-opacity')}
            >
              <li aria-hidden className={cn('hidden gap-x-4 px-5 py-2.5 text-[13px] font-medium text-ink-muted md:grid', columns)}>
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
                    'relative grid gap-x-4 gap-y-1.5 px-4 py-3.5 transition-colors hover:bg-surface-sunken/40 has-[button:focus-visible]:outline-2 has-[button:focus-visible]:-outline-offset-2 has-[button:focus-visible]:outline-action sm:px-5 md:items-center',
                    columns,
                  )}
                >
                  <p className="text-sm tabular-nums text-ink-muted">{formatDate(record.performedOn)}</p>
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-ink">
                      <span className="mr-1.5 font-mono text-[13px] font-normal tabular-nums text-ink-muted">{record.asset.code}</span>
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        onClick={() => open(record)}
                        className="text-left font-semibold after:absolute after:inset-0 focus-visible:outline-none"
                      >
                        {record.asset.name}
                      </button>
                    </p>
                    <p className="break-words text-[13px] text-ink-muted">
                      {record.plan
                        ? `${record.plan.title} · ${kindLabels[record.kind]}`
                        : record.kind === 'corrective'
                          ? kindLabels.corrective
                          : `${kindLabels[record.kind]} · sin plan`}
                    </p>
                    {record.corrects ? (
                      <p className="text-[13px] text-ink-muted">Corrige al del {formatDate(record.corrects.performedOn)}</p>
                    ) : record.voided?.correctedBy ? (
                      <p className="text-[13px] text-ink-muted">Corregido por el del {formatDate(record.voided.correctedBy.performedOn)}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {record.voided ? <Badge tone="neutral">Anulado</Badge> : null}
                    <Badge tone={resultTone[record.result]}>
                      {resultLabels[record.result]}
                    </Badge>
                    <span className="text-[13px] text-ink-muted">{record.provider?.name ?? 'Interno'}</span>
                  </div>
                  <p className="text-sm tabular-nums text-ink md:text-right">
                    <span className="text-[13px] text-ink-muted md:hidden">Costo: </span>
                    {record.cost ? `$ ${formatDecimal(record.cost)}` : <span className="text-ink-muted">Sin dato</span>}
                  </p>
                  <div className="relative z-10">
                    {record.certificate ? (
                      <a
                        href={record.certificate.url}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex min-h-11 items-center text-sm font-semibold text-action underline-offset-2 hover:underline md:min-h-8"
                      >
                        Ver certificado
                        <span className="sr-only"> de {record.asset.code} (PDF, se abre en otra pestaña)</span>
                      </a>
                    ) : canRecord && !record.voided ? (
                      <Button variant="ghost" size="sm" className="max-sm:h-11" aria-haspopup="dialog" aria-label={`Adjuntar certificado de ${record.asset.code}`} onClick={() => attachTo(record)}>
                        Adjuntar
                      </Button>
                    ) : (
                      <span className="text-[13px] text-ink-muted">Sin certificado</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {records.hasNextPage ? (
            <div className="text-center">
              <Button className="h-[44px] sm:h-10" loading={records.isFetchingNextPage} onClick={() => void records.fetchNextPage()}>
                Cargar más
              </Button>
            </div>
          ) : null}
        </div>

        {showPanel ? (
          <aside
            id={panelId}
            aria-label="Filtros"
            className="sticky top-20 max-h-[calc(100dvh-6.5rem)] overflow-y-auto rounded-panel bg-surface p-2 shadow-raised"
          >
            {chips.length > 0 ? <FilterPanelClear onClear={clearFilters} /> : null}
            {panel}
          </aside>
        ) : null}
      </div>
      <Drawer
        open={drawerOpen && !wide}
        onOpenChange={setDrawerOpen}
        title="Filtros"
        footer={
          <Button variant="primary" className="h-[44px] w-full" onClick={() => setDrawerOpen(false)}>
            {count === undefined ? 'Ver registros' : `Ver ${count}`}
          </Button>
        }
      >
        {chips.length > 0 ? <FilterPanelClear onClear={clearFilters} /> : null}
        {panel}
      </Drawer>
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
