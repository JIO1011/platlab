import type { WorkspaceMeResponse } from '@platlab/contracts';
import { Button, cn } from '@platlab/ui';
import { Boxes, FlaskConical, House, LogOut } from 'lucide-react';
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

function NavItem({ to, end = false, icon: Icon, children }: { to: string; end?: boolean; icon: typeof Boxes; children: string }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex shrink-0 items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-action-soft text-action' : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
        )
      }
    >
      <Icon className="size-4" aria-hidden />
      {children}
    </NavLink>
  );
}

/**
 * Shell de la aplicación (01 §7): barra con el espacio y la persona, y navegación compuesta solo
 * con los módulos visibles para su rol. En el móvil, la navegación pasa a una fila bajo la barra.
 */
export function AppShell() {
  const { workspaceId = '' } = useParams();
  const me = useWorkspaceMe(workspaceId);
  const workspaces = useMyWorkspaces();
  const { signOut } = useSession();

  if (me.isPending) return <PageLoading />;
  if (me.isError) {
    return (
      <main className="grid min-h-dvh place-items-center bg-canvas">
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
  const nav = (
    <>
      <NavItem to={base} end icon={House}>
        Inicio
      </NavItem>
      {me.data.modules.flatMap((module) =>
        module.nav.map((entry) => (
          <NavItem key={`${module.code}-${entry.path}`} to={`${base}/${entry.path}`} icon={moduleIcons[module.code] ?? Boxes}>
            {entry.label}
          </NavItem>
        )),
      )}
    </>
  );

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-sm">
        <div className="flex min-h-14 items-center gap-3 px-4 py-2 sm:gap-4 md:px-6">
          <Link to={base} aria-label="PlatLab, ir al Inicio" className="shrink-0">
            <Wordmark compact />
          </Link>
          <span className="hidden h-5 w-px bg-line sm:block" aria-hidden />
          {/* El espacio actual nunca se recorta: en el móvil puede ocupar dos líneas. */}
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-medium leading-snug text-ink">{me.data.workspace.name}</span>
            {canSwitch ? (
              <Link to="/espacios" className="shrink-0 text-[13px] text-action hover:underline">
                Cambiar
              </Link>
            ) : null}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <span className="hidden text-sm text-ink-muted sm:inline">{me.data.member.displayName}</span>
            <Button variant="ghost" size="sm" onClick={() => void signOut()} aria-label="Salir de PlatLab">
              <LogOut aria-hidden />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
        <nav aria-label="Secciones" className="flex gap-1 overflow-x-auto border-t border-line px-3 py-2 md:hidden">
          {nav}
        </nav>
      </header>
      <div className="mx-auto flex w-full max-w-[1400px]">
        <nav aria-label="Secciones" className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 flex-col gap-1 p-3 md:flex">
          {nav}
        </nav>
        <main className="min-w-0 flex-1 px-4 pb-16 pt-6 md:px-8 md:pt-8">
          <Outlet context={{ workspaceId, me: me.data } satisfies ShellContext} />
        </main>
      </div>
    </div>
  );
}
