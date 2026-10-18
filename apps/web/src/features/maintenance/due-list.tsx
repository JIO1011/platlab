import type { DueList, WorkKind, WorkspaceMeResponse } from '@platlab/contracts';
import { Badge, Button, Input, Select, StatePanel } from '@platlab/ui';
import { ClipboardList, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { fold } from '../../app/fold';
import { formatDate } from '../../app/format';
import { assetFichaPath } from './asset-path';
import { dueText, dueTone, groupDue } from './due';
import { DueDot, toneText } from './due-view';
import { UncoveredLink } from './uncovered-notice';
import { kindLabels } from './work-text';

type DueItem = DueList['items'][number];

const ALL = 'all';
const NO_AREA = '__none';
const kindOptions = [{ value: ALL, label: 'Todos los tipos' }, ...(Object.keys(kindLabels) as WorkKind[]).map((value) => ({ value, label: kindLabels[value] }))];

/** Una fila de «Por hacer»: el equipo (enlace a su ficha), el plan, el área, la fecha con su plazo y «Registrar». */
function DueRow({
  item,
  today,
  ficha,
  onRecord,
}: {
  item: DueItem;
  today: string;
  ficha: string | null;
  onRecord: (() => void) | null;
}) {
  const tone = dueTone(item, today);
  const assetText = (
    <>
      <span className="mr-1.5 font-mono text-[13px] font-normal tabular-nums text-ink-muted">{item.asset.code}</span>
      {ficha ? (
        <Link to={ficha} className="rounded-[4px] text-ink underline-offset-2 hover:text-action hover:underline">
          {item.asset.name}
        </Link>
      ) : (
        item.asset.name
      )}
    </>
  );
  return (
    <li className="grid gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-surface-sunken/40 sm:px-5 md:grid-cols-[minmax(0,1.7fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <p className="break-words font-semibold text-ink">{assetText}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted">
          <span className="break-words">
            {item.plan.title} · {kindLabels[item.plan.kind]}
          </span>
          {item.lastResult === 'fail' ? <Badge tone="danger">No conforme</Badge> : null}
        </p>
      </div>
      <p className="text-[13px] text-ink-muted md:text-sm">
        <span className="md:hidden">Área: </span>
        {item.asset.area ?? 'Sin área'}
      </p>
      <div className="min-w-0">
        <p className="text-sm tabular-nums text-ink">{formatDate(item.dueOn)}</p>
        <p className={`flex items-center gap-1.5 text-[13px] font-medium ${toneText[tone]}`}>
          <DueDot tone={tone} />
          {dueText(item.dueOn, today)}
        </p>
      </div>
      {onRecord ? (
        <Button
          className="h-11 w-full md:h-9 md:w-auto"
          onClick={onRecord}
          aria-haspopup="dialog"
          aria-label={`Registrar: ${item.asset.code}, ${item.plan.title}`}
        >
          Registrar
        </Button>
      ) : null}
    </li>
  );
}

/**
 * «Por hacer» (ADR 0020): No conformes, Vencidos, Próximos 7 días y De 8 a 30 días, cada grupo con su cantidad. La
 * búsqueda y los filtros por área y tipo trabajan sobre la lista completa que llegó, no sobre un grupo.
 */
export function DueTab({
  due,
  me,
  workspaceId,
  base,
  onRecord,
}: {
  due: DueList;
  me: WorkspaceMeResponse;
  workspaceId: string;
  base: string;
  onRecord: ((assetId: string, planId: string) => void) | null;
}) {
  const [query, setQuery] = useState('');
  const [area, setArea] = useState(ALL);
  const [kind, setKind] = useState(ALL);
  const areas = [...new Set(due.items.map((item) => item.asset.area).filter((value): value is string => value !== null))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );
  const areaOptions = [
    { value: ALL, label: 'Todas las áreas' },
    ...areas.map((value) => ({ value, label: value })),
    ...(due.items.some((item) => item.asset.area === null) ? [{ value: NO_AREA, label: 'Sin área' }] : []),
  ];
  const term = fold(query.trim());
  const items = due.items.filter(
    (item) =>
      (term === '' || fold(`${item.asset.code} ${item.asset.name}`).includes(term)) &&
      (area === ALL || (area === NO_AREA ? item.asset.area === null : item.asset.area === area)) &&
      (kind === ALL || item.plan.kind === kind),
  );
  const groups = groupDue(items, due.today);
  const filtering = term !== '' || area !== ALL || kind !== ALL;
  const clear = () => {
    setQuery('');
    setArea(ALL);
    setKind(ALL);
  };

  if (due.items.length === 0) {
    return (
      <div className="grid gap-4">
        <div className="rounded-card bg-surface shadow-raised">
          <StatePanel
            icon={ClipboardList}
            title="Sin trabajos vencidos ni previstos en 30 días"
            description="Los planes con fecha dentro de 30 días, y los que quedaron No conformes, aparecerán aquí."
          />
        </div>
        <UncoveredLink workspaceId={workspaceId} base={base} />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <Input
            type="search"
            aria-label="Buscar por código o nombre del equipo"
            placeholder="Código o nombre del equipo"
            autoComplete="off"
            className="h-11 pl-9 sm:h-10"
            value={query}
            onChange={(event) => setQuery(event.target.value.slice(0, 100))}
          />
        </div>
        <Select aria-label="Filtrar por área" value={area} onValueChange={setArea} placeholder="Todas las áreas" options={areaOptions} triggerClassName="h-11 sm:h-10" />
        <Select aria-label="Filtrar por tipo de trabajo" value={kind} onValueChange={setKind} placeholder="Todos los tipos" options={kindOptions} triggerClassName="h-11 sm:h-10" />
      </div>
      {due.truncated ? (
        <p role="status" className="rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted">
          Se muestran {due.items.length} de {due.total} trabajos. Primero van los No conformes y después los de fecha más antigua.
        </p>
      ) : null}
      <p role="status" className="sr-only">
        {filtering ? `${items.length} de ${due.items.length} trabajos` : ''}
      </p>
      {groups.length === 0 ? (
        <div className="rounded-card bg-surface shadow-raised">
          <StatePanel
            icon={Search}
            title="Ningún trabajo coincide"
            description="Prueba con otra parte del código o del nombre, o quita los filtros."
            action={<Button onClick={clear}>Quitar filtros</Button>}
          />
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.group} aria-labelledby={`grupo-${group.group}`}>
            <h2 id={`grupo-${group.group}`} className="mb-2 flex items-baseline gap-2 text-base font-semibold text-ink">
              {group.label}
              <span className="text-sm font-normal tabular-nums text-ink-muted">{group.items.length}</span>
            </h2>
            <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-raised">
              {group.items.map((item) => (
                <DueRow
                  key={`${item.plan.id}-${item.asset.id}`}
                  item={item}
                  today={due.today}
                  ficha={assetFichaPath(me, workspaceId, item.asset.id)}
                  onRecord={onRecord ? () => onRecord(item.asset.id, item.plan.id) : null}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
