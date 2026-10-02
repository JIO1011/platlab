import type { WorkspaceMeResponse } from '@platlab/contracts';
import { Button, cn } from '@platlab/ui';
import { Boxes, ChevronsUpDown, FlaskConical, House, LogOut } from 'lucide-react';
import { Link, NavLink, Outlet, useOutletContext, useParams } from 'react-router';
import { Wordmark } from './brand';
import { useMyWorkspaces, useWorkspaceMe } from './queries';
import { useSession } from './session';
import { PageLoading, QueryErrorState } from './states';

const moduleIcons: Record<string, typeof Boxes> = { reagents: FlaskConical };

export interface ShellContext {
  workspaceId: string;
  me: WorkspaceMeResponse;
}

export const useShell = () => useOutletContext<ShellContext>();

function NavItem({
  to,
  end = false,
  icon: Icon,
  children,
  compact = false,
}: {
  to: string;
  end?: boolean;
  icon: typeof Boxes;
  children: string;
  compact?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex shrink-0 items-center gap-3 font-medium transition-[background-color,color,box-shadow] duration-150',
          compact ? 'h-10 rounded-full px-4 text-sm' : 'h-11 rounded-control px-3.5 text-body-lg',
          isActive
            ? 'bg-action-soft text-action'
            : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
        )
      }
    >
      <Icon className="size-[18px]" aria-hidden />
      {children}
    </NavLink>
  );
}

/**
 * Shell flotante (01 §7, ADR 0010 «precisión suave»): navegación y barra como paneles sobre el
 * lienzo. La navegación se compone solo con los módulos visibles para el rol; en el móvil pasa a
 * una fila de píldoras bajo la barra. El espacio actual nunca se recorta.
 */
export function AppShell() {
  const { workspaceId = '' } = useParams();
  const me = useWorkspaceMe(workspaceId);
  const workspaces = useMyWorkspaces();
  const { signOut } = useSession();

  if (me.isPending) return <PageLoading />;
  if (me.isError) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <div className="text-center">
          <QueryErrorState error={me.error} onRetry={() => void me.refetch()} />
          <Link to="/espacios" className="text-sm font-medium text-action underline">
            Volver a mis espacios
          </Link>
        </div>
      </main>
    );
  }

  const base = `/e/${workspaceId}`;
  const canSwitch = (workspaces.data?.workspaces.length ?? 0) > 1;
  const items = (compact: boolean) => (
    <>
      <NavItem to={base} end icon={House} compact={compact}>
        Inicio
      </NavItem>
      {me.data.modules.flatMap((module) =>
        module.nav.map((entry) => (
          <NavItem
            key={`${module.code}-${entry.path}`}
            to={`${base}/${entry.path}`}
            icon={moduleIcons[module.code] ?? Boxes}
            compact={compact}
          >
            {entry.label}
          </NavItem>
        )),
      )}
    </>
  );
  // El espacio actual nunca se recorta; con varios espacios, es el propio selector.
  const workspace = canSwitch ? (
    <Link
      to="/espacios"
      aria-label={`${me.data.workspace.name}. Cambiar de espacio de trabajo`}
      className="-mx-2 flex min-w-0 items-center gap-2 rounded-control px-2 py-1.5 transition-colors hover:bg-surface-sunken"
    >
      <span className="text-body-lg font-semibold leading-snug text-ink">{me.data.workspace.name}</span>
      <ChevronsUpDown className="size-4 shrink-0 text-ink-muted" aria-hidden />
    </Link>
  ) : (
    <span className="text-body-lg font-semibold leading-snug text-ink">{me.data.workspace.name}</span>
  );

  return (
    <div className="min-h-dvh md:flex md:gap-2 md:p-4">
      <aside className="sticky top-4 hidden h-[calc(100dvh-2rem)] w-60 shrink-0 flex-col rounded-card bg-surface p-4 shadow-float md:flex">
        <Link to={base} aria-label="PlatLab, ir al Inicio" className="px-2 pb-6 pt-1">
          <Wordmark className="text-lg" />
        </Link>
        <nav aria-label="Secciones" className="flex flex-col gap-1">
          {items(false)}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 px-3 pt-3 md:top-4 md:px-0 md:pt-0">
          <div className="flex min-h-14 items-center gap-3 rounded-panel bg-surface px-4 py-2 shadow-float md:px-6">
            <Link to={base} aria-label="PlatLab, ir al Inicio" className="shrink-0 md:hidden">
              <Wordmark compact />
            </Link>
            {workspace}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <span className="hidden text-sm font-medium text-ink-muted md:inline">{me.data.member.displayName}</span>
              <Button variant="ghost" size="sm" onClick={() => void signOut()} aria-label="Salir de PlatLab">
                <LogOut aria-hidden />
                <span className="hidden md:inline">Salir</span>
              </Button>
            </div>
          </div>
          <nav aria-label="Secciones" className="mt-2 flex gap-1.5 overflow-x-auto pb-1 md:hidden">
            {items(true)}
          </nav>
        </header>
        <main className="px-4 pb-16 pt-6 md:px-6 md:pt-8">
          <Outlet context={{ workspaceId, me: me.data } satisfies ShellContext} />
        </main>
      </div>
    </div>
  );
}
