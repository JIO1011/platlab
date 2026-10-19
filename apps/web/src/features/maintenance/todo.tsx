import type { DueList } from '@platlab/contracts';
import { Button, Input, Skeleton, StatePanel } from '@platlab/ui';
import { ClipboardCheck, ClipboardList, Search, ScanLine } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { fold } from '../../app/fold';
import { formatDate } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { assetFichaPath } from './asset-path';
import { useMaintenance } from './context';
import { dueTone, groupDue, workStatus, type DueGroup } from './due';
import { DueDot, toneText } from './due-view';
import { useDue, useMaintenanceSummary } from './queries';
import { RecordSheet } from './record-sheet';
import { SectionHeader } from './section-header';
import { Tile } from './tile';
import { titleWithKind } from './work-text';

type DueItem = DueList['items'][number];

/** La hoja de registro abierta; `n` la monta de nuevo en cada apertura; `url` es el equipo con que se llegó (`?registrar=`). */
interface Recording {
  n: number;
  open: boolean;
  assetId?: string;
  planId?: string;
  scan: boolean;
  url: string | null;
}

const groupId = (group: DueGroup) => `grupo-${group}`;

/** Lleva a un grupo de la lista y deja el foco en su título, para teclado y lectores de pantalla. */
function goToGroup(group: DueGroup) {
  const heading = document.getElementById(groupId(group));
  if (!heading) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  heading.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
  heading.focus({ preventScroll: true });
}

/** Una fila de «Por hacer»: el equipo (enlace a su ficha), el trabajo, la fecha con su plazo y «Registrar». */
function DueRow({ item, today, ficha, onRecord }: { item: DueItem; today: string; ficha: string | null; onRecord: (() => void) | null }) {
  const tone = dueTone(item, today);
  const status = workStatus({ ...item, lastPerformedOn: item.lastRecord?.performedOn ?? null }, today);
  return (
    <li className="grid gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-surface-sunken/40 sm:px-5 md:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <p className="break-words font-semibold text-ink">
          <span className="mr-1.5 font-mono text-[13px] font-normal tabular-nums text-ink-muted">{item.asset.code}</span>
          {ficha ? (
            <Link to={ficha} className="rounded-[4px] text-ink underline-offset-2 hover:text-action hover:underline">
              {item.asset.name}
            </Link>
          ) : (
            item.asset.name
          )}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted">
          <span className="break-words">{titleWithKind(item.plan.title, item.plan.kind)}</span>
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-sm tabular-nums text-ink">{formatDate(status.date)}</p>
        <p className={`flex items-center gap-1.5 text-[13px] font-medium ${toneText[tone]}`}>
          <DueDot tone={tone} />
          {status.text}
        </p>
      </div>
      {onRecord ? (
        <Button className="h-11 w-full md:w-auto" onClick={onRecord} aria-haspopup="dialog" aria-label={`Registrar: ${item.asset.code}, ${item.plan.title}`}>
          Registrar
        </Button>
      ) : null}
    </li>
  );
}

/**
 * Por hacer, la portada de Mantenimiento (ADR 0020): una acción —«Registrar mantenimiento», con «Escanear»— y una lista.
 * Tres cifras tocables (Atrasados, Próximos 30 días, Sin plan), los dos grupos de la lista y un buscador. Los planes se
 * configuran una vez en Planes; aquí solo se hace lo que toca. `?registrar=<equipo>` abre la hoja con ese equipo.
 */
export function MaintenanceTodoPage() {
  const { workspaceId, me, base, canRecord } = useMaintenance();
  const [params, setParams] = useSearchParams();
  const registrar = params.get('registrar');
  const due = useDue(workspaceId);
  const summary = useMaintenanceSummary(workspaceId);
  const [query, setQuery] = useState('');
  const [recording, setRecording] = useState<Recording | null>(null);

  // El enlace de un equipo (su ficha, un QR) llega con `?registrar=`: abre «Registrar mantenimiento» con ese equipo.
  if (registrar && canRecord && recording?.url !== registrar) {
    setRecording({ n: (recording?.n ?? 0) + 1, open: true, assetId: registrar, scan: false, url: registrar });
  }

  const openRecording = (options: { assetId?: string; planId?: string; scan?: boolean } = {}) =>
    setRecording({
      n: (recording?.n ?? 0) + 1,
      open: true,
      scan: options.scan ?? false,
      url: null,
      ...(options.assetId ? { assetId: options.assetId } : {}),
      ...(options.planId ? { planId: options.planId } : {}),
    });
  // Al cerrar se quita `?registrar=`: volver a entrar con ese enlace abre la hoja otra vez.
  const closeRecording = (open: boolean) => {
    if (open) return;
    setRecording((current) => (current ? { ...current, open: false } : current));
    if (registrar) {
      setParams(
        (previous) => {
          const search = new URLSearchParams(previous);
          search.delete('registrar');
          return search;
        },
        { replace: true },
      );
    }
  };

  const actions = canRecord ? (
    <>
      <Button variant="primary" className="h-12 sm:h-10" aria-haspopup="dialog" onClick={() => openRecording()}>
        <ClipboardCheck aria-hidden />
        Registrar mantenimiento
      </Button>
      <Button className="h-12 sm:h-10" aria-haspopup="dialog" onClick={() => openRecording({ scan: true })}>
        <ScanLine aria-hidden />
        Escanear
      </Button>
    </>
  ) : undefined;

  const term = fold(query.trim());
  const items = due.data ? due.data.items.filter((item) => term === '' || fold(`${item.asset.code} ${item.asset.name}`).includes(term)) : [];
  const groups = due.data ? groupDue(items, due.data.today) : [];

  return (
    <>
      <SectionHeader title="Por hacer" updatedAt={due.dataUpdatedAt} actions={actions} />
      <div className="mt-6 grid gap-5">
        {summary.isPending ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-4" aria-busy="true">
            <Skeleton className="h-24 rounded-card" />
            <Skeleton className="h-24 rounded-card" />
            <Skeleton className="h-24 rounded-card" />
          </div>
        ) : summary.isError ? (
          <div className="rounded-card bg-surface shadow-raised">
            <QueryErrorState error={summary.error} onRetry={() => void summary.refetch()} />
          </div>
        ) : (
          <>
            <section aria-label="Cifras" className="grid grid-cols-3 gap-2 sm:gap-4">
              <Tile
                label="Atrasados"
                value={summary.data.overdue}
                tone={summary.data.overdue > 0 ? 'danger' : 'neutral'}
                hint={summary.data.nonconforming > 0 ? `${summary.data.nonconforming} ${summary.data.nonconforming === 1 ? 'no conforme' : 'no conformes'}` : undefined}
                hintTone="danger"
                cta={summary.data.overdue > 0 ? 'Ver lista' : undefined}
                onClick={summary.data.overdue > 0 ? () => goToGroup('overdue') : undefined}
              />
              <Tile
                label="Próximos 30 días"
                value={summary.data.next30}
                tone={summary.data.next30 > 0 ? 'warning' : 'neutral'}
                cta={summary.data.next30 > 0 ? 'Ver lista' : undefined}
                onClick={summary.data.next30 > 0 ? () => goToGroup('upcoming') : undefined}
              />
              <Tile
                label="Sin plan"
                value={summary.data.uncovered}
                tone="neutral"
                cta={summary.data.uncovered > 0 ? 'Ver planes' : undefined}
                to={`${base}/planes`}
              />
            </section>
            {summary.data.replacement ? (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                <span>
                  {summary.data.replacement} {summary.data.replacement === 1 ? 'equipo' : 'equipos'} para evaluar reemplazo
                </span>
                <Link to={`${base}/indicadores#reemplazo`} className="inline-flex min-h-11 items-center font-medium text-action underline-offset-2 hover:underline sm:min-h-0">
                  Revisar
                </Link>
              </p>
            ) : null}
          </>
        )}

        {due.isPending ? (
          <div aria-busy="true" className="grid gap-3">
            <Skeleton className="h-11 rounded-control" />
            <Skeleton className="h-64 rounded-card" />
          </div>
        ) : due.isError ? (
          <div className="rounded-card bg-surface shadow-raised">
            <QueryErrorState error={due.error} onRetry={() => void due.refetch()} />
          </div>
        ) : due.data.items.length === 0 ? (
          <div className="rounded-card bg-surface shadow-raised">
            <StatePanel
              icon={ClipboardList}
              title="Sin trabajos vencidos ni previstos en 30 días"
              description="Los trabajos de los planes que tocan en los próximos 30 días, y los que quedaron No conformes, aparecerán aquí."
            />
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
              <Input
                type="search"
                aria-label="Buscar por código o nombre del equipo"
                placeholder="Buscar equipo por código o nombre"
                autoComplete="off"
                className="h-11 pl-9 sm:h-10"
                value={query}
                onChange={(event) => setQuery(event.target.value.slice(0, 100))}
              />
            </div>
            {due.data.truncated ? (
              <p className="rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted">
                Se muestran {due.data.items.length} de {due.data.total} trabajos. Primero van los atrasados y después los de fecha más cercana.
              </p>
            ) : null}
            <p role="status" className="sr-only">
              {term !== '' ? `${items.length} de ${due.data.items.length} trabajos` : ''}
            </p>
            {groups.length === 0 ? (
              <div className="rounded-card bg-surface shadow-raised">
                <StatePanel
                  icon={Search}
                  title="Ningún trabajo coincide"
                  description="Prueba con otra parte del código o del nombre."
                  action={<Button onClick={() => setQuery('')}>Quitar búsqueda</Button>}
                />
              </div>
            ) : (
              groups.map((group) => (
                <section key={group.group} aria-labelledby={groupId(group.group)} className="scroll-mt-4">
                  <h2
                    id={groupId(group.group)}
                    tabIndex={-1}
                    className="mb-2 text-base font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
                  >
                    {group.label}
                  </h2>
                  <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-raised">
                    {group.items.map((item) => (
                      <DueRow
                        key={`${item.plan.id}-${item.asset.id}`}
                        item={item}
                        today={due.data.today}
                        ficha={assetFichaPath(me, workspaceId, item.asset.id)}
                        onRecord={canRecord ? () => openRecording({ assetId: item.asset.id, planId: item.plan.id }) : null}
                      />
                    ))}
                  </ul>
                </section>
              ))
            )}
          </>
        )}
      </div>
      {recording ? (
        <RecordSheet
          key={recording.n}
          workspaceId={workspaceId}
          me={me}
          open={recording.open}
          onOpenChange={closeRecording}
          scan={recording.scan}
          {...(recording.assetId ? { assetId: recording.assetId } : {})}
          {...(recording.planId ? { planId: recording.planId } : {})}
        />
      ) : null}
    </>
  );
}
