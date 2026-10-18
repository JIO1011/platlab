import type { Plan, PlanList } from '@platlab/contracts';
import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Skeleton, StatePanel } from '@platlab/ui';
import { Building2, CalendarClock, ChevronDown, ChevronRight, MoreHorizontal, Plus, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { useMaintenance } from './context';
import { frequencyText, scopeText } from './plan-text';
import { PlanDetailSheet } from './plan-detail';
import { PlanSheet } from './plan-sheet';
import { ProvidersSheet } from './providers-sheet';
import { usePlans } from './queries';
import { SectionHeader } from './section-header';
import { kindLabels } from './work-text';

/** Una hoja de plan abierta: crear, editar o «Cambiar frecuencia» de un equipo; `n` la monta de nuevo en cada apertura. */
type PlanForm = { n: number; open: boolean; plan?: Plan; ownFor?: { plan: Plan; asset: { id: string; code: string; name: string; area?: string | null } } };

/**
 * Una fila de la lista: título y tipo, a qué se aplica y cada cuánto, la próxima fecha y los atrasados. Toda la fila abre
 * el detalle del plan.
 */
function PlanRow({ plan, onOpen }: { plan: Plan; onOpen: () => void }) {
  return (
    <li className="relative flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-sunken/40 has-[button:focus-visible]:outline-2 has-[button:focus-visible]:-outline-offset-2 has-[button:focus-visible]:outline-action sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="break-words">
          <button type="button" aria-haspopup="dialog" onClick={onOpen} className="text-left font-semibold text-ink after:absolute after:inset-0 focus-visible:outline-none">
            {plan.title}
          </button>
          <span className="text-[13px] text-ink-muted"> · {kindLabels[plan.kind]}</span>
        </p>
        <p className="mt-0.5 break-words text-[13px] text-ink-muted">
          {scopeText(plan)} · {frequencyText(plan.intervalCount, plan.intervalUnit).toLowerCase()}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        <p className="text-sm tabular-nums text-ink">{plan.nextDueOn ? formatDate(plan.nextDueOn) : 'Sin equipos'}</p>
        {plan.overdueCount > 0 ? <Badge tone="danger">{plan.overdueCount === 1 ? '1 atrasado' : `${plan.overdueCount} atrasados`}</Badge> : null}
      </div>
      <ChevronRight className="size-4 shrink-0 text-ink-subtle" aria-hidden />
    </li>
  );
}

/** «N equipos sin plan», desplegable al final: los primeros 50 por código. */
function Uncovered({ uncovered }: { uncovered: PlanList['uncovered'] }) {
  if (uncovered.total === 0) return null;
  return (
    <details className="group rounded-control bg-warning-soft">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-control px-4 py-3 text-sm font-semibold text-warning focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action [&::-webkit-details-marker]:hidden">
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">{uncovered.total === 1 ? '1 equipo sin plan' : `${uncovered.total} equipos sin plan`}</span>
        <ChevronDown className="size-4 shrink-0 transition-transform motion-reduce:transition-none group-open:rotate-180" aria-hidden />
      </summary>
      <div className="grid gap-3 px-4 pb-4 text-sm text-ink">
        <p className="text-ink-muted">
          No generan trabajos por hacer hasta que tengan un plan.{' '}
          {uncovered.total > uncovered.items.length ? `Primeros ${uncovered.items.length} de ${uncovered.total}, por código.` : 'Por código.'}
        </p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {uncovered.items.map((entry) => (
            <li key={entry.id} className="min-w-0 break-words">
              <span className="font-mono text-[13px] tabular-nums text-ink-muted">{entry.code}</span> {entry.name}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

/**
 * Planes de Mantenimiento (ADR 0020), donde se configura una vez lo que luego aparece en Por hacer. La lista son filas
 * simples; tocar una abre su detalle. El Administrador crea; «Proveedores» está en el menú de la cabecera.
 */
export function MaintenancePlansPage() {
  const { workspaceId, canManagePlans } = useMaintenance();
  const plans = usePlans(workspaceId);
  const [form, setForm] = useState<PlanForm | null>(null);
  const [detail, setDetail] = useState<{ planId: string; open: boolean } | null>(null);
  const [providersOpen, setProvidersOpen] = useState(false);
  const openForm = (request: Omit<PlanForm, 'n' | 'open'> = {}) => setForm({ ...request, n: (form?.n ?? 0) + 1, open: true });

  const items = plans.data?.items ?? [];
  // El detalle sigue al plan de la lista: si se archiva, desaparece y la hoja se cierra con él.
  const detailPlan = detail ? items.find((entry) => entry.id === detail.planId) : undefined;

  const actions = (
    <>
      {canManagePlans ? (
        <Button variant="primary" className="h-12 sm:h-10" aria-haspopup="dialog" onClick={() => openForm()}>
          <Plus aria-hidden />
          Nuevo plan
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="h-12 sm:h-10">
            <MoreHorizontal aria-hidden />
            Más
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onSelect={() => setProvidersOpen(true)}>
            <Building2 aria-hidden />
            Proveedores
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return (
    <>
      <SectionHeader title="Planes" updatedAt={plans.dataUpdatedAt} actions={actions} />
      <div className="mt-6">
        {plans.isPending ? (
          <div aria-busy="true">
            <Skeleton className="h-64 rounded-card" />
          </div>
        ) : plans.isError ? (
          <div className="rounded-card bg-surface shadow-raised">
            <QueryErrorState error={plans.error} onRetry={() => void plans.refetch()} />
          </div>
        ) : (
          <div className="grid gap-4">
            {items.length === 0 ? (
              <div className="rounded-card bg-surface shadow-raised">
                <StatePanel
                  icon={CalendarClock}
                  title="Aún no hay planes"
                  description={
                    canManagePlans
                      ? 'Crea el plan de un tipo de equipo, por ejemplo una calibración semestral, y sus fechas aparecerán en Por hacer.'
                      : 'Quien administra el espacio crea los planes. Cuando existan, los verás aquí.'
                  }
                  action={
                    canManagePlans ? (
                      <Button variant="primary" className="h-11 sm:h-10" aria-haspopup="dialog" onClick={() => openForm()}>
                        <Plus aria-hidden />
                        Nuevo plan
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-raised">
                {items.map((plan) => (
                  <PlanRow key={plan.id} plan={plan} onOpen={() => setDetail({ planId: plan.id, open: true })} />
                ))}
              </ul>
            )}
            <Uncovered uncovered={plans.data.uncovered} />
          </div>
        )}
      </div>
      {detail && detailPlan ? (
        <PlanDetailSheet
          key={detail.planId}
          workspaceId={workspaceId}
          plan={detailPlan}
          open={detail.open}
          onOpenChange={(open) => setDetail((current) => (current ? { ...current, open } : current))}
          canManage={canManagePlans}
          onEdit={() => openForm({ plan: detailPlan })}
          onOwnPlan={(asset) => openForm({ ownFor: { plan: detailPlan, asset } })}
        />
      ) : null}
      {form ? (
        <PlanSheet
          key={form.n}
          workspaceId={workspaceId}
          open={form.open}
          onOpenChange={(open) => setForm((current) => (current ? { ...current, open } : current))}
          plan={form.plan}
          ownFor={form.ownFor}
        />
      ) : null}
      {providersOpen ? <ProvidersSheet workspaceId={workspaceId} open={providersOpen} onOpenChange={setProvidersOpen} canManage={canManagePlans} /> : null}
    </>
  );
}
