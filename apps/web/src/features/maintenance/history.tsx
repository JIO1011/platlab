import type { MaintenanceRecord } from '@platlab/contracts';
import { Badge, Button, Skeleton, StatePanel, cn, formatDecimal } from '@platlab/ui';
import { History, X } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { QueryErrorState } from '../../app/states';
import { formatDate } from '../../app/format';
import { AttachSheet } from './attach-sheet';
import { useMaintenance } from './context';
import { RecordDetail, resultTone } from './record-detail';
import { useRecords } from './queries';
import { SectionHeader } from './section-header';
import { kindLabels, resultLabels } from './work-text';

/** Una hoja abierta; `n` la monta de nuevo en cada apertura (formulario limpio). */
interface OpenRecord {
  n: number;
  open: boolean;
  record: MaintenanceRecord;
}

/**
 * Historial (ADR 0020): lo registrado, del más reciente al más antiguo, con el resultado, quién lo hizo, el costo y el
 * certificado. Abrir uno muestra su detalle de solo lectura. Con `?equipo=` son los de un solo equipo.
 */
export function MaintenanceHistoryPage() {
  const { workspaceId, me, canRecord } = useMaintenance();
  const [params, setParams] = useSearchParams();
  const assetId = params.get('equipo');
  const records = useRecords(workspaceId, assetId ?? undefined);
  const [detail, setDetail] = useState<OpenRecord | null>(null);
  const [attach, setAttach] = useState<OpenRecord | null>(null);
  const items = records.data?.pages.flatMap((page) => page.items) ?? [];
  const filtered = items[0]?.asset;
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

  return (
    <>
      <SectionHeader title="Historial" updatedAt={records.dataUpdatedAt} />
      <div className="mt-6 grid gap-4">
        {assetId ? (
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
            <StatePanel
              icon={History}
              title={assetId ? 'Este equipo aún no tiene mantenimientos registrados' : 'Aún no hay mantenimientos registrados'}
              description="Cada mantenimiento que se registre quedará aquí, con su resultado y su certificado."
            />
          </div>
        ) : (
          <ul
            className={cn('divide-y divide-line overflow-hidden rounded-card bg-surface shadow-raised', records.isPlaceholderData && 'opacity-60 transition-opacity')}
          >
            <li aria-hidden className="hidden gap-x-4 px-5 py-2.5 text-[13px] font-medium text-ink-muted md:grid md:grid-cols-[6.5rem_minmax(0,1.6fr)_minmax(0,1fr)_5.5rem_11rem]">
              <span>Fecha</span>
              <span>Equipo y plan</span>
              <span>Resultado</span>
              <span className="text-right">Costo</span>
              <span>Certificado</span>
            </li>
            {items.map((record) => (
              <li
                key={record.id}
                className="relative grid gap-x-4 gap-y-1.5 px-4 py-3.5 transition-colors hover:bg-surface-sunken/40 has-[button:focus-visible]:outline-2 has-[button:focus-visible]:-outline-offset-2 has-[button:focus-visible]:outline-action sm:px-5 md:grid-cols-[6.5rem_minmax(0,1.6fr)_minmax(0,1fr)_5.5rem_11rem] md:items-center"
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
                    {record.plan ? `${record.plan.title} · ${kindLabels[record.kind]}` : `${kindLabels[record.kind]} · sin plan`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge tone={resultTone[record.result]}>{resultLabels[record.result]}</Badge>
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
                  ) : canRecord ? (
                    <Button size="sm" className="max-sm:h-11" aria-haspopup="dialog" aria-label={`Adjuntar certificado de ${record.asset.code}`} onClick={() => attachTo(record)}>
                      Adjuntar certificado
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
      </div>
    </>
  );
}
