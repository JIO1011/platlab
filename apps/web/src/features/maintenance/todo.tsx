import type { DueList } from '@platlab/contracts';
import { Button, Input, Skeleton, StatePanel, cn } from '@platlab/ui';
import { ClipboardCheck, ClipboardList, Search, ScanLine } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { fold } from '../../app/fold';
import { formatDate } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { assetFichaPath } from './asset-path';
import { CodeTag } from '../../app/code-tag';
import { useMaintenance } from './context';
import { dueTone, groupDue, workStatus, type DueGroup } from './due';
import { DuePill } from './due-view';
import { useDue } from './queries';
import { useRecordLauncher } from './record-launcher';
import { SectionHeader } from '../../app/section-header';
import { titleWithKind } from './work-text';

type DueItem = DueList['items'][number];

const groupId = (group: DueGroup) => `grupo-${group}`;

/** Lleva a un grupo de la lista y deja el foco en su título, para teclado y lectores de pantalla. */
function goToGroup(group: DueGroup) {
  const heading = document.getElementById(groupId(group));
  if (!heading) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  heading.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
  heading.focus({ preventScroll: true });
}

/**
 * Una fila de «Por hacer», en su tarjeta de dos líneas (la altura es la misma en todas): el equipo con su código en
 * etiqueta (enlace a su ficha) y el trabajo; la fecha con su plazo en pastilla; y «Registrar», en contorno.
 */
function DueRow({ item, today, ficha, onRecord }: { item: DueItem; today: string; ficha: string | null; onRecord: (() => void) | null }) {
  const tone = dueTone(item, today);
  const status = workStatus({ ...item, lastPerformedOn: item.lastRecord?.performedOn ?? null }, today);
  const work = titleWithKind(item.plan.title, item.plan.kind);
  return (
    <li className="grid gap-x-4 gap-y-3 rounded-card bg-surface px-4 py-3.5 shadow-raised transition-colors hover:bg-surface-sunken/40 sm:px-5 md:min-h-[4.75rem] md:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <p className="flex min-w-0 items-center gap-2 font-semibold text-ink">
          <CodeTag>{item.asset.code}</CodeTag>
          {ficha ? (
            <Link to={ficha} className="rounded-[4px] break-words text-ink underline-offset-2 hover:text-action hover:underline max-md:inline-flex max-md:min-h-11 max-md:items-center md:truncate">
              {item.asset.name}
            </Link>
          ) : (
            <span className="break-words md:truncate">{item.asset.name}</span>
          )}
        </p>
        <p title={work} className="mt-0.5 break-words text-[13px] text-ink-muted md:truncate">
          {work}
        </p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 md:flex-col md:items-start md:gap-y-1">
        <p className="text-sm tabular-nums text-ink">{formatDate(status.date)}</p>
        <DuePill tone={tone}>{status.text}</DuePill>
      </div>
      {onRecord ? (
        <Button className="h-11 w-full md:h-10 md:w-auto" onClick={onRecord} aria-haspopup="dialog" aria-label={`Registrar: ${item.asset.code}, ${item.plan.title}`}>
          Registrar
        </Button>
      ) : null}
    </li>
  );
}

/**
 * Por hacer, la lista de trabajo de Mantenimiento (ADR 0020, 0021): en la cabecera, «Registrar mantenimiento» (el único
 * botón sólido) y «Escanear»; un buscador, pastillas que llevan a cada grupo con su cuenta, y una tarjeta por trabajo con
 * «Registrar». Las cifras están en el Resumen y los planes se configuran en Planes. `?registrar=<equipo>` abre la hoja
 * con ese equipo.
 */
export function MaintenanceTodoPage() {
  const { workspaceId, me, canRecord } = useMaintenance();
  const due = useDue(workspaceId);
  const [query, setQuery] = useState('');
  const launcher = useRecordLauncher({ fromUrl: true });

  const actions = canRecord ? (
    <>
      <Button variant="primary" className="h-12 sm:h-10" aria-haspopup="dialog" onClick={() => launcher.open()}>
        <ClipboardCheck aria-hidden />
        Registrar mantenimiento
      </Button>
      <Button className="h-12 sm:h-10" aria-haspopup="dialog" onClick={() => launcher.open({ scan: true })}>
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
        {due.isPending ? (
          <div aria-busy="true" className="grid gap-3">
            <Skeleton className="h-11 rounded-control" />
            <Skeleton className="h-20 rounded-card" />
            <Skeleton className="h-20 rounded-card" />
            <Skeleton className="h-20 rounded-card" />
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
            <div className="grid gap-3 sm:grid-cols-[minmax(0,24rem)_1fr] sm:items-center">
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
              {groups.length > 0 ? (
                <nav aria-label="Ir a un grupo" className="flex flex-wrap gap-2 sm:justify-end">
                  {groups.map((group) => (
                    <button
                      key={group.group}
                      type="button"
                      onClick={() => goToGroup(group.group)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-surface py-1 pl-4 pr-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken sm:min-h-10"
                    >
                      {group.label}
                      <span
                        className={cn(
                          'inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums',
                          group.group === 'overdue' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning',
                        )}
                      >
                        {group.items.length}
                      </span>
                    </button>
                  ))}
                </nav>
              ) : null}
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
                    className="mb-3 flex items-baseline gap-2 text-lg font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
                  >
                    {group.label}
                    <span className="text-sm font-medium tabular-nums text-ink-muted">{group.items.length}</span>
                  </h2>
                  <ul className="grid gap-3">
                    {group.items.map((item) => (
                      <DueRow
                        key={`${item.plan.id}-${item.asset.id}`}
                        item={item}
                        today={due.data.today}
                        ficha={assetFichaPath(me, workspaceId, item.asset.id)}
                        onRecord={canRecord ? () => launcher.open({ assetId: item.asset.id, planId: item.plan.id }) : null}
                      />
                    ))}
                  </ul>
                </section>
              ))
            )}
          </>
        )}
      </div>
      {launcher.sheet}
    </>
  );
}
