import { REQUEST_MAX_LINES, type FormLayout, type RequestOptions } from '@platlab/contracts';
import { Button, Sheet, Skeleton } from '@platlab/ui';
import { PackagePlus } from 'lucide-react';
import { useId, useState } from 'react';
import { useMediaQuery } from '../../app/use-media-query';
import { RESOURCE_LABELS, type Draft } from './form-draft';
import { CatalogPane, type NewResource } from './request-catalog';
import { catalogOf, scopeText, slotted, verdictOf, type CheckAnswer, type CheckPlan } from './request-check';
import { LINE_KINDS, groupsOf, presents, type DraftLine, type RequestDraft } from './request-draft';
import { OrderPane } from './request-order';

/**
 * El panel «Recursos» del docente (ADR 0023, «Disponibilidad y recursos»): sobre la hoja, el catálogo con lo libre a la
 * izquierda y «Tu pedido» a la derecha; en el móvil, el pedido y el catálogo en una hoja. Todo se pide aquí: la tabla de la
 * planilla se llena sola y se imprime igual. Lo que dice sale de la consulta sin guardar, que no guarda ni aparta nada.
 */

/** Una línea nueva del pedido: del catálogo si trae su id; si no, «sin catálogo». Los equipos parten de uno. */
function lineOf(resource: NewResource): DraftLine {
  const id = crypto.randomUUID();
  if (resource.kind === 'reagent') return { id, kind: 'reagent', catalog: resource.itemId !== null, itemId: resource.itemId, name: resource.name, quantity: '', unit: resource.unit };
  if (resource.kind === 'equipment') return { id, kind: 'equipment', catalog: resource.assetTypeId !== null, assetTypeId: resource.assetTypeId, name: resource.name, byGroup: false, perGroup: '', quantity: '1' };
  return { id, kind: 'material', name: resource.name, byGroup: false, perGroup: '', quantity: '' };
}

const catalogId = (line: DraftLine): string | null => (line.kind === 'reagent' ? line.itemId : line.kind === 'equipment' ? line.assetTypeId : null);

interface PanelProps {
  paper: Draft;
  draft: RequestDraft;
  layout: FormLayout;
  options: RequestOptions | undefined;
  plan: CheckPlan | null;
  answer: CheckAnswer | undefined;
  /** La consulta falló: se puede seguir llenando y reintentar. */
  failed: boolean;
  onRetry: () => void;
  issues: Readonly<Record<number, string>>;
  onChange: (patch: Partial<RequestDraft>) => void;
}

/** Una frase para el estado del pedido, anunciada al cambiar: cuántas líneas alcanzan y cuántas no. */
function summaryOf({ draft, plan, answer, failed }: PanelProps): string {
  if (failed) return 'No se pudo comprobar lo libre.';
  const verdicts = draft.lines.map((line, index) => verdictOf(line, index, plan, answer));
  if (verdicts.some((verdict) => verdict.state === 'checking')) return 'Comprobando…';
  const short = verdicts.filter((verdict) => verdict.state === 'checked' && verdict.line.check === 'short').length;
  const ok = verdicts.filter((verdict) => verdict.state === 'checked' && verdict.line.check === 'ok').length;
  if (short > 0) return short === 1 ? '1 recurso no alcanza' : `${short} recursos no alcanzan`;
  return ok > 0 ? 'Lo del catálogo alcanza' : '';
}

export function ResourcesPanel(props: PanelProps) {
  const { paper, draft, layout, options, plan, answer, failed, onRetry, issues, onChange } = props;
  const titleId = useId();
  const wide = useMediaQuery('(min-width: 64rem)');
  const [picking, setPicking] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);

  const kinds = paper.resources.filter((resource) => resource.shown).map((resource) => ({ kind: LINE_KINDS[resource.kind], label: resource.label.trim() || RESOURCE_LABELS[resource.kind] }));
  const groups = Number.isInteger(groupsOf(draft, layout)) ? groupsOf(draft, layout) : 1;
  const chosen = new Set(draft.lines.flatMap((line) => (line.kind !== 'material' && line.catalog && catalogId(line) ? [catalogId(line)!] : [])));
  const full = draft.lines.length >= REQUEST_MAX_LINES;

  const add = (resource: NewResource) => {
    const line = lineOf(resource);
    onChange({ lines: [...draft.lines, line] });
    // En el móvil el catálogo está en una hoja encima: el foco se queda en ella para seguir agregando.
    setFocusId(wide ? line.id : null);
  };

  const catalog = options ? (
    <CatalogPane kinds={kinds} options={options} catalog={catalogOf(plan, answer)} slotted={plan ? slotted(plan.body) : false} chosen={chosen} full={full} onAdd={add} />
  ) : (
    <div className="grid gap-3" aria-busy="true" aria-label="Cargando el catálogo">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  );

  const order = (
    <OrderPane
      lines={draft.lines}
      kinds={kinds}
      groups={groups}
      byGroupAllowed={presents(layout, 'grupos')}
      plan={plan}
      answer={answer}
      issues={issues}
      focusId={focusId}
      onLine={(next) => onChange({ lines: draft.lines.map((line) => (line.id === next.id ? next : line)) })}
      onRemove={(id) => onChange({ lines: draft.lines.filter((line) => line.id !== id) })}
      empty={
        wide ? (
          <p>Todavía no pides nada. Busca en el catálogo y agrega lo que necesitas.</p>
        ) : (
          <p>Todavía no pides nada.</p>
        )
      }
    />
  );

  const summary = summaryOf(props);

  return (
    <section aria-labelledby={titleId} className="rounded-panel border border-line bg-surface shadow-raised print:hidden">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-bold tracking-tight text-ink">
            Recursos
          </h2>
          <p className="text-[13px] text-ink-muted">{scopeText(plan?.body)}</p>
        </div>
        <p role="status" className="flex items-center gap-2 text-[13px] text-ink-muted">
          {summary}
          {failed ? (
            <Button size="sm" variant="ghost" className="text-action max-sm:h-11" onClick={onRetry}>
              Reintentar
            </Button>
          ) : null}
        </p>
      </header>
      {wide ? (
        <div className="grid grid-cols-2 divide-x divide-line">
          <div className="p-5">{catalog}</div>
          <div className="p-5">
            <h3 className="mb-2 text-sm font-semibold text-ink">Tu pedido</h3>
            {order}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 p-4">
          {order}
          <Button className="h-11 w-full" disabled={full} aria-haspopup="dialog" onClick={() => setPicking(true)}>
            <PackagePlus aria-hidden />
            Agregar recurso
          </Button>
          <Sheet
            open={picking}
            onOpenChange={setPicking}
            title="Agregar recurso"
            description={scopeText(plan?.body)}
            icon={PackagePlus}
            fullscreenMobile
            focusFirst
            footer={
              <Button variant="primary" className="h-11 w-full" onClick={() => setPicking(false)}>
                Listo
              </Button>
            }
          >
            {catalog}
          </Sheet>
        </div>
      )}
    </section>
  );
}
