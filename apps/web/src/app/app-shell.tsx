import type { ModuleAccess, WorkspaceMeResponse } from '@platlab/contracts';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, cn } from '@platlab/ui';
import { ArrowLeft, Boxes, Check, ChevronsUpDown, FlaskConical, House, LogOut } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router';
import { Wordmark } from './brand';
import { useMyWorkspaces, useWorkspaceMe } from './queries';
import { useSession } from './session';
import { PageLoading, QueryErrorState } from './states';

export const moduleIcons: Record<string, typeof Boxes> = { reagents: FlaskConical };

export interface ShellContext {
  workspaceId: string;
  me: WorkspaceMeResponse;
}

export const useShell = () => useOutletContext<ShellContext>();

type ModuleApp = ModuleAccess['nav'][number] & { code: string; name: string };

/** Las apps de módulo que el miembro puede abrir, con su entrada y sus secciones (ADR 0011). */
export function moduleApps(me: WorkspaceMeResponse): ModuleApp[] {
  return me.modules.flatMap((module) =>
    module.nav.map((entry) => ({ ...entry, code: module.code, name: module.name })),
  );
}

function NavItem({
  to,
  end = false,
  icon: Icon,
  children,
  compact = false,
}: {
  to: string;
  end?: boolean;
  icon?: typeof Boxes;
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
          compact ? 'h-10 rounded-full px-3.5 text-sm' : 'h-11 rounded-control px-3.5 text-body-lg',
          isActive
            ? 'bg-action-soft text-action'
            : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
        )
      }
    >
      {Icon ? <Icon className="size-[18px]" aria-hidden /> : null}
      {children}
    </NavLink>
  );
}

/** Saltar de un módulo a otro sin pasar por el Inicio: el actual va marcado. */
function ModuleSwitcher({
  base,
  apps,
  current,
  compact = false,
}: {
  base: string;
  apps: ModuleApp[];
  current: ModuleApp;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const Icon = moduleIcons[current.code] ?? Boxes;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${current.name}. Cambiar de módulo`}
        className={cn(
          'flex items-center text-left transition-colors data-[state=open]:bg-surface-sunken',
          compact
            ? 'h-10 shrink-0 gap-2 rounded-full bg-surface px-3 shadow-raised hover:bg-surface-sunken'
            : 'h-12 w-full gap-3 rounded-control px-3 hover:bg-surface-sunken',
        )}
      >
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center bg-action text-on-action',
            compact ? 'size-6 rounded-full' : 'size-8 rounded-[8px]',
          )}
        >
          <Icon className={compact ? 'size-3.5' : 'size-[18px]'} aria-hidden />
        </span>
        <span className={cn('min-w-0 truncate font-semibold text-ink', compact ? 'text-sm' : 'flex-1 text-body-lg')}>
          {current.name}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-ink-muted" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-52">
        {apps.map((app) => {
          const AppIcon = moduleIcons[app.code] ?? Boxes;
          return (
            <DropdownMenuItem key={app.code} onSelect={() => navigate(`${base}/${app.path}`)}>
              <AppIcon aria-hidden />
              <span className="flex-1">{app.name}</span>
              {app.code === current.code ? <Check className="!text-action" aria-label="Módulo actual" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Shell flotante (ADR 0010) con dos modos (ADR 0011). En el Inicio, el menú es el de la plataforma
 * y los módulos se abren desde sus tarjetas. Dentro de un módulo, el menú pasa a ser el de esa app:
 * sus secciones, el regreso al Inicio y el salto a otro módulo. En el móvil, las secciones son una
 * fila de píldoras bajo la barra. El espacio actual nunca se recorta.
 */
export function AppShell() {
  const { workspaceId = '' } = useParams();
  const { pathname } = useLocation();
  const me = useWorkspaceMe(workspaceId);
  const workspaces = useMyWorkspaces();
  const { signOut } = useSession();
  const pills = useRef<HTMLElement>(null);

  // En la fila desplazable del móvil, la sección actual se trae a la vista en cada navegación.
  useEffect(() => {
    pills.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);

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
  const apps = moduleApps(me.data);
  const segment = pathname.slice(base.length + 1).split('/')[0] ?? '';
  const app = apps.find((entry) => entry.path === segment);
  const canSwitch = (workspaces.data?.workspaces.length ?? 0) > 1;

  const sections = (compact: boolean) =>
    app?.sections.map((section) => (
      <NavItem
        key={section.path}
        to={section.path ? `${base}/${app.path}/${section.path}` : `${base}/${app.path}`}
        end={section.path === ''}
        compact={compact}
      >
        {section.label}
      </NavItem>
    ));

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
        {app ? (
          <>
            <Link
              to={base}
              className="mb-2 flex h-9 items-center gap-2 rounded-control px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Inicio
            </Link>
            <ModuleSwitcher base={base} apps={apps} current={app} />
            <div className="my-3 h-px bg-line" aria-hidden />
            <nav aria-label={`Secciones de ${app.name}`} className="flex flex-col gap-1">
              {sections(false)}
            </nav>
          </>
        ) : (
          <nav aria-label="Secciones" className="flex flex-col gap-1">
            <NavItem to={base} end icon={House}>
              Inicio
            </NavItem>
          </nav>
        )}
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 px-3 pt-3 md:top-4 md:px-0 md:pt-0">
          <div className="flex min-h-14 items-center gap-3 rounded-panel bg-surface px-4 py-2 shadow-float md:px-6">
            {/* En el móvil, dentro de un módulo, la marca cede su lugar al regreso al Inicio. */}
            {app ? (
              <Link
                to={base}
                aria-label="Volver al Inicio"
                className="-ml-1 inline-flex size-10 shrink-0 items-center justify-center rounded-control text-ink transition-colors hover:bg-surface-sunken md:hidden"
              >
                <ArrowLeft className="size-5" aria-hidden />
              </Link>
            ) : (
              <Link to={base} aria-label="PlatLab, ir al Inicio" className="shrink-0 md:hidden">
                <Wordmark compact />
              </Link>
            )}
            {workspace}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <span className="hidden text-sm font-medium text-ink-muted md:inline">{me.data.member.displayName}</span>
              <Button variant="ghost" size="sm" onClick={() => void signOut()} aria-label="Salir de PlatLab">
                <LogOut aria-hidden />
                <span className="hidden md:inline">Salir</span>
              </Button>
            </div>
          </div>
          {app ? (
            // En el móvil, el módulo se nombra a la izquierda y no se desplaza: con varios módulos,
            // «Inventario» solo no basta. Las secciones se desplazan a su derecha; una máscara
            // desvanece los dos bordes y avisa de que hay más.
            <div className="mt-2 flex items-center gap-1.5 md:hidden">
              <ModuleSwitcher base={base} apps={apps} current={app} compact />
              <nav
                ref={pills}
                aria-label={`Secciones de ${app.name} en el móvil`}
                className="flex min-w-0 flex-1 scroll-ps-4 scroll-pe-10 gap-1 overflow-x-auto py-1 pl-1 pr-8 [scrollbar-width:none] [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-40px),transparent)]"
              >
                {sections(true)}
              </nav>
            </div>
          ) : null}
        </header>
        <main className="px-4 pb-16 pt-6 md:px-6 md:pt-8">
          <Outlet context={{ workspaceId, me: me.data } satisfies ShellContext} />
        </main>
      </div>
    </div>
  );
}
