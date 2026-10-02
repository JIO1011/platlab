import type { HomeResponse } from '@platlab/contracts';
import { Skeleton, StatePanel, cn } from '@platlab/ui';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, History, LayoutGrid, Plus, Scale } from 'lucide-react';
import { Link } from 'react-router';
import { ActivityRow } from '../../app/activity-row';
import { useShell } from '../../app/app-shell';
import { useHome } from '../../app/queries';
import { QueryErrorState } from '../../app/states';

/** Fecha de hoy en la zona del espacio, con mayúscula inicial: «Jueves, 2 de octubre». */
function formatToday(timeZone: string): string {
  const text = new Intl.DateTimeFormat('es-EC', { timeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Saludo según la hora en la zona del espacio, la misma que usan fechas y movimientos. */
function greeting(timeZone: string): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Contadores accionables por módulo (01 §7): cada número abre la vista que lo explica. */
const counters: Record<string, Array<{ key: string; label: (n: number) => string }>> = {
  reagents: [
    { key: 'productsWithStock', label: (n) => (n === 1 ? 'reactivo con existencias' : 'reactivos con existencias') },
    { key: 'positionsWithStock', label: (n) => (n === 1 ? 'ubicación con existencias' : 'ubicaciones con existencias') },
  ],
};

/** Acciones rápidas de Reactivos, en el orden del trabajo diario; la primera es la primaria. */
const quickActions = [
  { action: 'salida', label: 'Registrar salida', permission: 'reagents.issue.create', icon: ArrowUpFromLine },
  { action: 'ingreso', label: 'Registrar ingreso', permission: 'reagents.receipt.create', icon: ArrowDownToLine },
  { action: 'ajuste', label: 'Ajustar', permission: 'reagents.adjustment.create', icon: Scale },
  { action: 'reactivo', label: 'Nuevo reactivo', permission: 'reagents.catalog.manage', icon: Plus },
];

type Card = HomeResponse['cards'][number];

export function HomePage() {
  const { workspaceId, me } = useShell();
  const home = useHome(workspaceId);
  const firstName = me.member.displayName.split(' ')[0];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-display text-ink">
        {greeting(me.workspace.timeZone)}, {firstName}
      </h1>
      <p className="mt-2 text-body-lg text-ink-muted">{formatToday(me.workspace.timeZone)}</p>

      <section className="mt-8" aria-label="Módulos">
        {home.isPending ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Skeleton className="h-48 rounded-card lg:col-span-7" />
            <Skeleton className="h-48 rounded-card lg:col-span-5" />
          </div>
        ) : home.isError ? (
          <QueryErrorState error={home.error} onRetry={() => void home.refetch()} />
        ) : home.data.cards.length === 0 ? (
          <div className="rounded-card bg-surface shadow-raised">
            <StatePanel
              icon={LayoutGrid}
              title="No hay módulos para tu rol en este espacio"
              description={
                me.member.isOwner
                  ? 'Como propietario gobiernas el espacio; para operar inventarios necesitas un rol operativo, que puede asignarte un administrador.'
                  : 'Los módulos se habilitan por contrato y se muestran según tu rol. Si esperabas ver alguno, consúltalo con quien administra el espacio.'
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {home.data.cards.map((card) => (
              <ModuleBlocks key={card.moduleCode} card={card} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/** Bloques de un módulo en Inicio: resumen, acciones rápidas y actividad reciente, con datos reales. */
function ModuleBlocks({ card }: { card: Card }) {
  const { workspaceId, me } = useShell();
  const module = me.modules.find((entry) => entry.code === card.moduleCode);
  const path = module?.nav[0]?.path;
  if (!path) return null;
  const href = `/e/${workspaceId}/${path}`;
  const canOperate = module?.access.includes('new_operation') ?? false;
  const actions =
    card.moduleCode === 'reagents' && canOperate
      ? quickActions.filter((action) => me.permissions.includes(action.permission))
      : [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <article
        className={cn(
          'flex min-w-0 flex-col rounded-card bg-surface p-4 shadow-raised sm:p-6',
          actions.length ? 'lg:col-span-7' : 'lg:col-span-12',
        )}
      >
        <header className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">{card.name}</h2>
          <Link to={href} className="group inline-flex items-center gap-1.5 text-sm font-medium text-action">
            Abrir {card.name}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </header>
        <ul className="mt-6 grid flex-1 grid-cols-2 divide-x divide-line">
          {(counters[card.moduleCode] ?? []).map((counter) => {
            const value = card.summary?.[counter.key] ?? 0;
            return (
              <li key={counter.key}>
                <Link
                  to={href}
                  className="group flex h-full flex-col justify-center gap-2 rounded-panel px-3 py-2 transition-colors hover:bg-action-soft sm:px-5"
                >
                  <span className="text-metric-sm tabular-nums text-ink sm:text-metric">{value}</span>
                  <span className="text-sm text-ink-muted">{counter.label(value)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </article>

      {actions.length ? (
        <nav aria-label={`Acciones rápidas de ${card.name}`} className="grid grid-cols-2 gap-3 lg:col-span-5">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.action}
                to={`${href}?registrar=${action.action}`}
                className={cn(
                  'flex min-h-28 flex-col justify-between gap-4 rounded-card p-5 font-medium shadow-raised transition-[background-color,transform] duration-150 ease-out-expo motion-safe:active:scale-[0.98]',
                  index === 0
                    ? 'bg-action text-on-action hover:bg-action-hover'
                    : 'bg-surface text-ink hover:bg-surface-sunken',
                )}
              >
                <span
                  className={cn(
                    'inline-flex size-10 items-center justify-center rounded-full',
                    index === 0 ? 'bg-on-action/15' : 'bg-action-soft text-action',
                  )}
                >
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                {action.label}
              </Link>
            );
          })}
        </nav>
      ) : null}

      <article className="min-w-0 rounded-card bg-surface p-4 shadow-raised sm:p-6 lg:col-span-12">
        <header className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Actividad reciente</h2>
          {card.activity.length ? (
            <Link to={`${href}?pestana=movimientos`} className="whitespace-nowrap text-sm font-medium text-action hover:underline">
              Ver movimientos
            </Link>
          ) : null}
        </header>
        {card.activity.length === 0 ? (
          <StatePanel
            icon={History}
            title="Todavía no hay movimientos"
            description="Los ingresos, salidas y ajustes aparecerán aquí con su responsable."
            className="py-8"
          />
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {card.activity.map((item) => (
              <li key={item.id} className="py-3.5">
                <ActivityRow {...item} timeZone={me.workspace.timeZone} />
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}
