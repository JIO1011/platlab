import type { Plan, PlanList } from '@platlab/contracts';
import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, IconChip, Skeleton, StatePanel } from '@platlab/ui';
import { Building2, CalendarClock, CalendarX, ChevronDown, ChevronRight, MoreHorizontal, Plus } from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { CodeTag } from '../../app/code-tag';
import { useMaintenance } from './context';
import { DuePill } from './due-view';
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
 * Un plan en su tarjeta (ADR 0021): el título arriba; debajo, tres etiquetas (el tipo de trabajo, con el color del
 * módulo; la frecuencia y el alcance, neutras) y, a la derecha, la próxima fecha y los atrasados en pastilla. Toda la
 * tarjeta abre el detalle del plan.
 */
function PlanCard({ plan, onOpen }: { plan: Plan; onOpen: () => void }) {
  return (
    <li className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 rounded-card bg-surface px-4 py-4 shadow-raised transition-colors hover:bg-surface-sunken/40 has-[button:focus-visible]:outline-2 has-[button:focus-visible]:outline-offset-2 has-[button:focus-visible]:outline-action sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-5">
      <div className="min-w-0">
        <p className="break-words">
          <button type="button" aria-haspopup="dialog" onClick={onOpen} className="text-left font-semibold text-ink after:absolute after:inset-0 focus-visible:outline-none">
            {plan.title}
          </button>
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          <li>
            <Badge tone="info" className="px-2.5">
              {kindLabels[plan.kind]}
            </Badge>
          </li>
          <li>
            <Badge className="px-2.5">{frequencyText(plan.intervalCount, plan.intervalUnit)}</Badge>
          </li>
          <li className="min-w-0">
            <Badge className="max-w-full px-2.5">
              <span className="truncate">{scopeText(plan)}</span>
            </Badge>
          </li>
        </ul>
      </div>
      <ChevronRight className="size-4 shrink-0 text-ink-subtle sm:order-last" aria-hidden />
      <div className="col-span-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 sm:col-span-1 sm:flex-col sm:items-end sm:justify-center">
        {plan.nextDueOn ? (
          <p className="text-right text-sm tabular-nums text-ink">
            {/* Con un atraso, la fecha de la tarjeta es la siguiente del calendario, no la del atrasado. */}
            <span className="text-[13px] text-ink-muted">{plan.overdueCount > 0 ? 'Próxima programada ' : 'Próxima '}</span>
            {formatDate(plan.nextDueOn)}
          </p>
        ) : (
          <p className="text-sm text-ink-muted">Sin equipos</p>
        )}
        {plan.overdueCount > 0 ? <DuePill tone="danger">{plan.overdueCount === 1 ? '1 atrasado' : `${plan.overdueCount} atrasados`}</DuePill> : null}
      </div>
    </li>
  );
}

/**
 * «N equipos sin plan», el aviso del Resumen (tarjeta con icono) que aquí se despliega al final: los primeros 50 por
 * código. Sin enlace a Planes: ya se está en ellos.
 */
function Uncovered({ uncovered }: { uncovered: PlanList['uncovered'] }) {
  if (uncovered.total === 0) return null;
  return (
    <details className="group rounded-card bg-surface shadow-raised">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-x-4 rounded-card px-4 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:px-6 [&::-webkit-details-marker]:hidden">
        <IconChip icon={CalendarX} tone="warning" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{uncovered.total === 1 ? '1 equipo sin plan' : `${uncovered.total} equipos sin plan`}</p>
          <p className="text-sm text-ink-muted">No generan trabajos por hacer hasta que tengan un plan.</p>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-action">
          <span className="max-sm:sr-only">Ver equipos</span>
          <ChevronDown className="size-4 shrink-0 transition-transform motion-reduce:transition-none group-open:rotate-180" aria-hidden />
        </span>
      </summary>
      <div className="grid gap-3 border-t border-line px-4 py-4 text-sm text-ink sm:px-6">
        <p className="text-ink-muted">{uncovered.total > uncovered.items.length ? `Primeros ${uncovered.items.length} de ${uncovered.total}, por código.` : 'Por código.'}</p>
        <ul className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
          {uncovered.items.map((entry) => (
            <li key={entry.id} className="flex min-w-0 items-center gap-2">
              <CodeTag>{entry.code}</CodeTag>
              <span className="min-w-0 break-words">{entry.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

/**
 * Planes de Mantenimiento (ADR 0020), donde se configura una vez lo que luego aparece en Por hacer. Cada plan es una
 * tarjeta; tocar una abre su detalle. El Administrador crea; «Proveedores» está en el menú de la cabecera.
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
          <div className="grid gap-3 sm:gap-4">
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
              <ul className="grid gap-3 sm:gap-4">
                {items.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} onOpen={() => setDetail({ planId: plan.id, open: true })} />
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
