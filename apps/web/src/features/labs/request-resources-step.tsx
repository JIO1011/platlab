import { REQUEST_MAX_LINES, type FormLayout, type RequestLine, type RequestOptions } from '@platlab/contracts';
import { Button, Field, Segmented, formatDecimal } from '@platlab/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Combobox, type ComboOption } from '../../app/combobox';
import { FilledInput } from '../../app/filled';
import {
  LINE_KINDS,
  groupsOf,
  newLine,
  presents,
  totalOf,
  type DraftEquipment,
  type DraftLine,
  type DraftMaterial,
  type DraftReagent,
  type RequestDraft,
  type RequestIssues,
} from './request-draft';
import { LineCheck } from './request-line-check';

export interface ResourcesStepProps {
  draft: RequestDraft;
  layout: FormLayout;
  /** El catálogo de reactivos y los tipos de equipo, con lo disponible hoy; mientras cargan, no se agrega nada. */
  options: RequestOptions | undefined;
  /** Lo que el servidor dijo de cada línea al guardar; con cambios sin guardar es `null` y se pide guardar. */
  saved: readonly RequestLine[] | null;
  issues: RequestIssues;
  onChange: (patch: Partial<RequestDraft>) => void;
}

const hints = {
  reagents: 'Del catálogo, en su unidad de inventario; si no está, descríbelo con su unidad.',
  equipment: 'Se piden por tipo, en unidades; si no está catalogado, descríbelo.',
  materials: 'Texto libre con su cantidad: todavía no se llevan en inventario.',
} as const;

/** El marco común de una línea: sus controles, el aviso de lo que falta, lo que dijo el servidor y «Quitar». */
function LineShell({ label, error, check, toggle, onRemove, children }: { label: string; error: string | undefined; check: ReactNode; toggle: ReactNode; onRemove: () => void; children: ReactNode }) {
  return (
    <li className="grid gap-3 rounded-control border border-line p-3">
      {children}
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">{check}</div>
        <div className="flex flex-wrap gap-1">
          {toggle}
          <Button variant="ghost" size="sm" className="h-11 sm:h-8" aria-label={`Quitar ${label || 'esta línea'}`} onClick={onRemove}>
            <Trash2 aria-hidden />
            Quitar
          </Button>
        </div>
      </div>
    </li>
  );
}

/** Cambiar entre el catálogo y «no catalogado»: lo elegido o escrito se descarta. */
function CatalogToggle({ catalog, enabled, onToggle }: { catalog: boolean; enabled: boolean; onToggle: () => void }) {
  if (!enabled) return null;
  return (
    <Button variant="ghost" size="sm" className="h-11 sm:h-8" onClick={onToggle}>
      {catalog ? 'No está en el catálogo' : 'Elegir del catálogo'}
    </Button>
  );
}

/** El total o lo pedido por grupo; por grupo, el total sale de los grupos de la solicitud. */
function QuantityFields({ line, groups, byGroupAllowed, integer, onChange }: {
  line: DraftEquipment | DraftMaterial;
  groups: number;
  byGroupAllowed: boolean;
  integer: boolean;
  onChange: (patch: Partial<Pick<DraftEquipment, 'byGroup' | 'perGroup' | 'quantity'>>) => void;
}) {
  const mode = integer ? { inputMode: 'numeric' as const, step: 1, min: 1 } : { inputMode: 'decimal' as const };
  const total = totalOf(line.perGroup, groups);
  return (
    <div className="grid gap-3">
      {byGroupAllowed ? (
        <Segmented
          label="Cómo se pide la cantidad"
          value={line.byGroup ? 'group' : 'total'}
          options={[
            { value: 'total', label: 'Total' },
            { value: 'group', label: 'Por grupo' },
          ]}
          onValueChange={(value) => onChange({ byGroup: value === 'group' })}
        />
      ) : null}
      {line.byGroup ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <Field label="Por grupo">
            <FilledInput {...mode} value={line.perGroup} onChange={(event) => onChange({ perGroup: event.target.value })} />
          </Field>
          <p className="flex min-h-11 items-center text-sm tabular-nums text-ink-muted">
            × {groups} {groups === 1 ? 'grupo' : 'grupos'} = {total === '' ? '—' : formatDecimal(total)}
          </p>
        </div>
      ) : (
        <Field label="Total">
          <FilledInput {...mode} value={line.quantity} onChange={(event) => onChange({ quantity: event.target.value })} />
        </Field>
      )}
    </div>
  );
}

interface LineProps<L extends DraftLine> {
  line: L;
  options: RequestOptions | undefined;
  check: ReactNode;
  error: string | undefined;
  onChange: (line: L) => void;
  onRemove: () => void;
}

function ReagentLine({ line, options, check, error, onChange, onRemove }: LineProps<DraftReagent>) {
  const reagents = options?.reagents ?? [];
  const choices: ComboOption[] = reagents.map((reagent) => ({
    id: reagent.id,
    label: reagent.name,
    keywords: reagent.code,
    detail: `${reagent.code} · Disponible: ${formatDecimal(reagent.available)} ${reagent.unit}`,
  }));
  return (
    <LineShell
      label={line.name}
      error={error}
      check={check}
      onRemove={onRemove}
      toggle={<CatalogToggle catalog={line.catalog} enabled={options?.reagentsEnabled ?? false} onToggle={() => onChange({ ...line, catalog: !line.catalog, itemId: null, name: '', unit: '' })} />}
    >
      <Field label={line.catalog ? 'Reactivo del catálogo' : 'Reactivo no catalogado'} required>
        {line.catalog ? (
          <Combobox
            value={line.name}
            onChange={(name) => onChange({ ...line, name, itemId: null, unit: '' })}
            options={choices}
            onPick={(option) => onChange({ ...line, name: option.label, itemId: option.id, unit: reagents.find((reagent) => reagent.id === option.id)?.unit ?? '' })}
            openOnFocus
            placeholder="Busca por nombre o código"
          />
        ) : (
          <FilledInput maxLength={200} autoComplete="off" value={line.name} onChange={(event) => onChange({ ...line, name: event.target.value })} />
        )}
      </Field>
      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
        <Field label="Cantidad" required>
          <FilledInput inputMode="decimal" value={line.quantity} onChange={(event) => onChange({ ...line, quantity: event.target.value })} />
        </Field>
        <Field label="Unidad" required>
          <FilledInput readOnly={line.catalog} maxLength={10} autoComplete="off" value={line.unit} onChange={(event) => onChange({ ...line, unit: event.target.value })} />
        </Field>
      </div>
    </LineShell>
  );
}

function EquipmentLine({ line, options, check, error, groups, byGroupAllowed, onChange, onRemove }: LineProps<DraftEquipment> & { groups: number; byGroupAllowed: boolean }) {
  const types = options?.equipmentTypes ?? [];
  const choices: ComboOption[] = types.map((type) => ({ id: type.id, label: type.name, detail: `${type.available} operativos` }));
  return (
    <LineShell
      label={line.name}
      error={error}
      check={check}
      onRemove={onRemove}
      toggle={<CatalogToggle catalog={line.catalog} enabled={options?.equipmentEnabled ?? false} onToggle={() => onChange({ ...line, catalog: !line.catalog, assetTypeId: null, name: '' })} />}
    >
      <Field label={line.catalog ? 'Tipo de equipo' : 'Equipo no catalogado'} required>
        {line.catalog ? (
          <Combobox
            value={line.name}
            onChange={(name) => onChange({ ...line, name, assetTypeId: null })}
            options={choices}
            onPick={(option) => onChange({ ...line, name: option.label, assetTypeId: option.id })}
            openOnFocus
            placeholder="Busca por nombre"
          />
        ) : (
          <FilledInput maxLength={200} autoComplete="off" value={line.name} onChange={(event) => onChange({ ...line, name: event.target.value })} />
        )}
      </Field>
      <QuantityFields line={line} groups={groups} byGroupAllowed={byGroupAllowed} integer onChange={(patch) => onChange({ ...line, ...patch })} />
    </LineShell>
  );
}

function MaterialLine({ line, check, error, groups, byGroupAllowed, onChange, onRemove }: LineProps<DraftMaterial> & { groups: number; byGroupAllowed: boolean }) {
  return (
    <LineShell label={line.name} error={error} check={check} toggle={null} onRemove={onRemove}>
      <Field label="Material" required>
        <FilledInput maxLength={200} autoComplete="off" value={line.name} onChange={(event) => onChange({ ...line, name: event.target.value })} />
      </Field>
      <QuantityFields line={line} groups={groups} byGroupAllowed={byGroupAllowed} integer={false} onChange={(patch) => onChange({ ...line, ...patch })} />
    </LineShell>
  );
}

/**
 * Paso «Recursos»: solo las columnas que muestra la revisión, con sus nombres. Reactivos del catálogo (en su unidad base)
 * o no catalogados, equipos por tipo o no catalogados (por grupo o en total) y materiales en texto. Tras guardar, cada
 * línea lleva lo que el servidor comprobó (✔ ⚠ ✖ y lo disponible); validar no reserva nada.
 */
export function ResourcesStep({ draft, layout, options, saved, issues, onChange }: ResourcesStepProps) {
  const groups = groupsOf(draft, layout);
  const byGroupAllowed = presents(layout, 'grupos');
  const setLine = (next: DraftLine) => onChange({ lines: draft.lines.map((line) => (line.id === next.id ? next : line)) });
  const removeLine = (id: string) => onChange({ lines: draft.lines.filter((line) => line.id !== id) });
  const add = (kind: DraftLine['kind']) => {
    const catalog = kind === 'reagent' ? (options?.reagentsEnabled ?? false) : kind === 'equipment' ? (options?.equipmentEnabled ?? false) : false;
    onChange({ lines: [...draft.lines, newLine(kind, catalog)] });
  };

  const lineFor = (line: DraftLine, index: number) => {
    const verdict = saved?.[index];
    const shared = { options, check: verdict ? <LineCheck line={verdict} /> : null, error: issues.lines[index], onRemove: () => removeLine(line.id) };
    if (line.kind === 'reagent') return <ReagentLine key={line.id} {...shared} line={line} onChange={setLine} />;
    if (line.kind === 'equipment') return <EquipmentLine key={line.id} {...shared} line={line} groups={groups} byGroupAllowed={byGroupAllowed} onChange={setLine} />;
    return <MaterialLine key={line.id} {...shared} line={line} groups={groups} byGroupAllowed={byGroupAllowed} onChange={setLine} />;
  };

  return (
    <div className="grid gap-4">
      {saved === null && draft.lines.length > 0 ? (
        <p role="status" className="rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted">
          Guarda el borrador para comprobar si lo que pides alcanza.
        </p>
      ) : null}
      {layout.resources.map((resource) => {
        const kind = LINE_KINDS[resource.kind];
        const lines = draft.lines.flatMap((line, index) => (line.kind === kind ? [{ line, index }] : []));
        return (
          <section key={resource.kind} aria-label={resource.label} className="grid gap-3 rounded-card bg-surface px-4 py-5 shadow-raised sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <h2 className="text-lg font-semibold text-ink">{resource.label}</h2>
              <Button size="sm" className="h-11 sm:h-8" disabled={!options || draft.lines.length >= REQUEST_MAX_LINES} onClick={() => add(kind)}>
                <Plus aria-hidden />
                Agregar
              </Button>
            </div>
            <p className="text-sm text-ink-muted">{hints[resource.kind]}</p>
            {lines.length === 0 ? (
              <p className="rounded-control bg-surface-sunken px-3 py-3 text-sm text-ink-muted">Nada pedido todavía.</p>
            ) : (
              <ul className="grid gap-3">{lines.map(({ line, index }) => lineFor(line, index))}</ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
