import type { MaintenanceIndicators } from '@platlab/contracts';
import { cn, formatDecimal } from '@platlab/ui';
import { ArrowRight, CalendarX } from 'lucide-react';
import { Link } from 'react-router';
import { NoticeCard } from '../../app/notice-card';
import { useMaintenance } from './context';
import { toneText } from './due-view';
import { compliancePercent, onTimeText, withoutRequirementText } from './indicator-text';
import { Panel } from './panel';

/** Una cantidad de dinero del Resumen: la cadena decimal tal cual llega, con su signo de moneda. */
const money = (value: string) => `$\u00A0${formatDecimal(value)}`;

/** Un enlace de tarjeta: texto de acción con flecha, de 44 px en el móvil. */
function CardLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-control text-sm font-medium text-action transition-colors hover:text-action-hover sm:min-h-0">
      {children}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

/** «Costo preventivo frente a correctivo»: lo registrado en el periodo, con los importes tal como llegan. */
export function CostCard({ costs }: { costs: MaintenanceIndicators['costs'] }) {
  const { base } = useMaintenance();
  const { withoutCost } = costs;
  return (
    <Panel
      title="Costo preventivo frente a correctivo"
      description="Lo registrado en los últimos 12 meses; el preventivo incluye calibración, verificación y limpieza."
      action={<CardLink to={`${base}/historial`}>Ver historial</CardLink>}
    >
      <dl className="grid grid-cols-2 gap-4">
        {(
          [
            ['Preventivo', costs.preventive],
            ['Correctivo', costs.corrective],
          ] as const
        ).map(([name, value]) => (
          <div key={name} className="min-w-0 rounded-panel bg-surface-sunken px-4 py-3">
            <dt className="text-sm font-medium text-ink-muted">{name}</dt>
            <dd className="mt-1 break-words text-2xl font-bold tracking-tight text-ink tabular-nums">{money(value)}</dd>
          </div>
        ))}
      </dl>
      {withoutCost > 0 ? (
        <p className="mt-3 text-[13px] text-ink-muted">
          {withoutCost} {withoutCost === 1 ? 'registro sin costo' : 'registros sin costo'}
        </p>
      ) : null}
    </Panel>
  );
}

/** «Cumplimiento por requisito»: una barra de progreso por requisito de los planes, con el % siempre en texto. */
export function RequirementsCard({ items, compliance }: { items: MaintenanceIndicators['requirements']; compliance: MaintenanceIndicators['compliance'] }) {
  const { base, canManagePlans } = useMaintenance();
  const without = withoutRequirementText(compliance, items);
  return (
    <Panel title="Cumplimiento por requisito" description="Los trabajos programados hasta hoy, agrupados por el requisito que dice su plan.">
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Ningún plan tiene requisito todavía. Se agrega en el plan, en el campo «Requisito».
          {canManagePlans ? (
            <>
              {' '}
              <Link to={`${base}/planes`} className="inline-flex min-h-11 items-center font-medium text-action underline-offset-2 hover:underline sm:min-h-0">
                Ir a Planes
              </Link>
            </>
          ) : null}
        </p>
      ) : (
        <ul className="grid gap-4">
          {items.map((item) => {
            const percent = compliancePercent(item);
            return (
              <li key={item.requirement}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <span className="min-w-0 break-words font-medium text-ink">{item.requirement}</span>
                  <span className="text-sm tabular-nums text-ink-muted">
                    {/* Bajo el 100 % el número pide atención; la barra queda neutra (ADR 0021). */}
                    {percent === null ? null : (
                      <strong className={cn('font-semibold', percent < 100 ? toneText.warning : 'text-ink')}>
                        {percent}
                        {'\u00A0'}%
                      </strong>
                    )}
                    {percent === null ? null : ' · '}
                    {onTimeText(item)}
                  </span>
                </div>
                {/* El texto de arriba dice lo mismo: la barra es solo una ayuda a la vista. */}
                <div aria-hidden className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunken">
                  <div className="h-full rounded-full bg-ink-subtle" style={{ width: `${percent ?? 0}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {items.length > 0 && without ? <p className="mt-4 border-t border-line pt-3 text-sm text-ink-muted">{without}</p> : null}
    </Panel>
  );
}

/** «N equipos sin plan · Asignar plan»: un aviso en tarjeta con su icono y su acción, que lleva a Planes. */
export function NoPlanNotice({ count }: { count: number }) {
  const { base, canManagePlans } = useMaintenance();
  return (
    <NoticeCard
      icon={CalendarX}
      title={`${count} ${count === 1 ? 'equipo sin plan' : 'equipos sin plan'}`}
      text="Ningún plan de mantenimiento los cubre, así que no aparecen en Por hacer."
      action={canManagePlans ? 'Asignar plan' : 'Ver planes'}
      to={`${base}/planes`}
    />
  );
}
