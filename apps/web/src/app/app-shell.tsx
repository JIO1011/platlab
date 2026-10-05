import type { ModuleAccess, WorkspaceMeResponse } from '@platlab/contracts';
import { Badge, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, cn } from '@platlab/ui';
import {
  ArrowLeft,
  ArrowLeftRight,
  Boxes,
  Check,
  ChevronRight,
  ChevronsUpDown,
  FlaskConical,
  House,
  Inbox,
  LayoutDashboard,
  LogOut,
  Package,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router';
import type { WorkspaceSummary } from '@platlab/contracts';
import { Wordmark } from './brand';
import { rememberWorkspace } from './last-workspace';
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

/** Icono de cada sección del manifiesto; sin entrada, el de módulo genérico. */
const sectionIcons: Record<string, LucideIcon> = {
  '': LayoutDashboard,
  inventario: Package,
  movimientos: ArrowLeftRight,
  solicitudes: Inbox,
};

function NavItem({
  to,
  end = false,
  icon: Icon,
  children,
  compact = false,
}: {
  to: string;
  end?: boolean;
  icon?: LucideIcon | undefined;
  children: string;
  compact?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group flex shrink-0 items-center gap-3 font-medium transition-[background-color,color,box-shadow] duration-200',
          compact ? 'h-10 rounded-full px-3.5 text-sm' : 'h-12 rounded-control px-4 text-sm',
          // El activo va relleno con el acento, como en ReactiLab; los demás, atenuados.
          isActive
            ? 'bg-action text-on-action shadow-md shadow-action/25'
            : 'text-ink-muted hover:bg-surface-sunken hover:text-action',
        )
      }
    >
      {({ isActive }) => (
        <>
          {Icon && !compact ? (
            <Icon
              className={cn('size-5 transition-colors', isActive ? 'text-on-action/80' : 'text-ink-subtle group-hover:text-action')}
              aria-hidden
            />
          ) : null}
          {children}
        </>
      )}
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
              {/* Cada módulo con su color, aunque el menú esté dentro del tema de otro. */}
              <span data-module={app.code} className="inline-flex text-action">
                <AppIcon className="!text-action" aria-hidden />
              </span>
              <span className="flex-1">{app.name}</span>
              {app.code === current.code ? <Check className="!text-action" aria-label="Módulo actual" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const statusLabel: Record<string, string> = { trial: 'Prueba', suspended: 'Suspendido', closing: 'En cierre' };

/** El rol se dice tal cual (ADR 0011, 05-10-2026): el propietario lo es del espacio; sin rol, «Miembro». */
function roleLabel(member: WorkspaceMeResponse['member']): string {
  if (member.isOwner) return 'Propietario';
  return member.roles.length ? member.roles.join(' · ') : 'Miembro';
}

const menuLabel = 'px-2.5 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle';

/**
 * Los espacios de la persona (ADR 0011): elegir uno lleva a su Inicio. La institución se dice solo
 * si los espacios son de varias, para distinguir dos «Facultad de Ciencias»; entre los de una
 * misma, repetirla es ruido.
 */
function WorkspaceItems({ currentId, workspaces }: { currentId: string; workspaces: WorkspaceSummary[] }) {
  const navigate = useNavigate();
  const mixed = new Set(workspaces.map((workspace) => workspace.institution)).size > 1;
  return (
    <>
      <p className={menuLabel}>Espacios de trabajo</p>
      {workspaces.map((workspace) => {
        const note = [
          mixed ? workspace.institution : null,
          workspace.isOwner ? 'Propietario' : null,
          statusLabel[workspace.status] ?? null,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <DropdownMenuItem key={workspace.id} onSelect={() => navigate(`/e/${workspace.id}`)} className="h-auto min-h-10 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{workspace.name}</span>
              {note ? <span className="block text-[12px] text-ink-muted">{note}</span> : null}
            </span>
            {workspace.id === currentId ? <Check className="!text-action" aria-label="Espacio actual" /> : null}
          </DropdownMenuItem>
        );
      })}
    </>
  );
}

function Initials({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-action text-sm font-bold text-on-action ring-2 ring-surface',
        className,
      )}
    >
      {initials}
    </span>
  );
}

/**
 * Quién eres, en qué espacio y con qué rol, que depende del espacio (ADR 0011, 05-10-2026). Con
 * varios espacios, toda la tarjeta abre el menú para cambiar; con uno, solo lo dice.
 */
function PersonCard({ me, workspaces, initials }: { me: WorkspaceMeResponse; workspaces: WorkspaceSummary[]; initials: string }) {
  const content = (
    <>
      <Initials initials={initials} />
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-bold leading-snug text-ink">{me.member.displayName}</span>
        <span className="block text-[13px] leading-snug text-ink-muted">{me.workspace.name}</span>
        <span className="mt-1 block">
          <Badge tone="info" className="text-[11px] font-bold uppercase tracking-wider">
            {roleLabel(me.member)}
          </Badge>
        </span>
      </span>
    </>
  );
  // Alineada con el menú; la flecha va en la esquina para no recortar el nombre.
  const card = 'relative mx-4 mb-6 flex items-center gap-3 rounded-panel border border-line bg-canvas p-4 text-left';
  if (workspaces.length < 2) return <div className={card}>{content}</div>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${me.workspace.name}. Cambiar de espacio de trabajo`}
        className={cn(card, 'pr-8 transition-colors hover:bg-surface-sunken data-[state=open]:bg-surface-sunken')}
      >
        {content}
        <ChevronsUpDown className="absolute right-3 top-3 size-4 text-ink-muted" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        <WorkspaceItems currentId={me.workspace.id} workspaces={workspaces} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** En el móvil, sin barra lateral: las iniciales abren la persona, sus espacios y «Salir». */
function AccountMenu({
  me,
  workspaces,
  initials,
  onSignOut,
}: {
  me: WorkspaceMeResponse;
  workspaces: WorkspaceSummary[];
  initials: string;
  onSignOut: () => void;
}) {
  const several = workspaces.length > 1;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={several ? `${me.workspace.name}. Cambiar de espacio de trabajo` : 'Tu cuenta'}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full md:hidden"
      >
        <Initials initials={initials} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-bold text-ink">{me.member.displayName}</p>
          <p className="text-[13px] leading-snug text-ink-muted">
            {roleLabel(me.member)} · {me.workspace.name}
          </p>
        </div>
        {several ? <WorkspaceItems currentId={me.workspace.id} workspaces={workspaces} /> : null}
        <div aria-hidden className="my-1 h-px bg-line" />
        <DropdownMenuItem onSelect={onSignOut}>
          <LogOut aria-hidden />
          Salir
        </DropdownMenuItem>
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
  const { session, signOut } = useSession();
  const pills = useRef<HTMLElement>(null);
  const base = `/e/${workspaceId}`;
  const segment = pathname.slice(base.length + 1).split('/')[0] ?? '';
  const moduleCode = me.data ? moduleApps(me.data).find((entry) => entry.path === segment)?.code : undefined;
  const userId = session?.user.id;
  const loaded = me.isSuccess;

  // En la fila desplazable del móvil, la sección actual se trae a la vista en cada navegación y
  // al llegar /me: al entrar por URL, la fila aún no existe cuando cambia la ruta.
  useEffect(() => {
    pills.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pathname, loaded]);

  // El tema del módulo se marca en <html>: hojas, menús y avisos viven en portales fuera del shell.
  // Antes de pintar, para que no asome un cuadro en azul al entrar ni en lila al salir.
  useLayoutEffect(() => {
    if (!moduleCode) return;
    document.documentElement.dataset['module'] = moduleCode;
    return () => {
      delete document.documentElement.dataset['module'];
    };
  }, [moduleCode]);

  // Solo se recuerda un espacio que se pudo abrir.
  useEffect(() => {
    if (userId && loaded) rememberWorkspace(userId, workspaceId);
  }, [userId, loaded, workspaceId]);

  if (me.isPending) return <PageLoading />;
  if (me.isError) {
    // La entrada llevaría de vuelta a este mismo espacio: se ofrecen los demás directamente.
    const others = workspaces.data?.workspaces.filter((workspace) => workspace.id !== workspaceId) ?? [];
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <div className="text-center">
          <QueryErrorState error={me.error} onRetry={() => void me.refetch()} />
          {others.length ? (
            <ul className="mt-2 flex flex-wrap justify-center gap-2">
              {others.map((workspace) => (
                <li key={workspace.id}>
                  <Link to={`/e/${workspace.id}`} className="text-sm font-medium text-action underline">
                    Ir a {workspace.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </main>
    );
  }

  const apps = moduleApps(me.data);
  const app = apps.find((entry) => entry.path === segment);
  const workspaceList = workspaces.data?.workspaces ?? [];

  const sections = (compact: boolean) =>
    app?.sections.map((section) => (
      <NavItem
        key={section.path}
        to={section.path ? `${base}/${app.path}/${section.path}` : `${base}/${app.path}`}
        end={section.path === ''}
        icon={sectionIcons[section.path] ?? FlaskConical}
        compact={compact}
      >
        {section.label}
      </NavItem>
    ));

  // La sección actual del módulo, para decir arriba dónde se está; la ficha cuenta como Inventario.
  const sectionPath = app ? (pathname.slice(`${base}/${app.path}`.length + 1).split('/')[0] ?? '') : '';
  const section = app?.sections.find((entry) => entry.path === sectionPath);

  const initials = me.data.member.displayName
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <Link to={base} aria-label="PlatLab, ir al Inicio" className="px-8 pb-6 pt-8">
          <Wordmark large className="text-2xl font-bold" />
        </Link>
        {/* La persona, su espacio y su rol, como la tarjeta de ReactiLab; también cambia de espacio. */}
        <PersonCard me={me.data} workspaces={workspaceList} initials={initials} />
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {app ? (
            <>
              <Link
                to={base}
                className="mb-2 flex h-9 items-center gap-2 rounded-control px-4 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-action"
              >
                <ArrowLeft className="size-4" aria-hidden />
                Inicio
              </Link>
              <ModuleSwitcher base={base} apps={apps} current={app} />
              <p className="mb-2 mt-4 px-4 text-xs font-semibold uppercase tracking-wider text-ink-subtle">Menú de {app.name}</p>
              <nav aria-label={`Secciones de ${app.name}`} className="flex flex-col gap-1.5">
                {sections(false)}
              </nav>
            </>
          ) : (
            <>
              <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-ink-subtle">Menú principal</p>
              <nav aria-label="Secciones" className="flex flex-col gap-1.5">
                <NavItem to={base} end icon={House}>
                  Inicio
                </NavItem>
              </nav>
            </>
          )}
        </div>
        <div className="border-t border-line p-4">
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex h-12 w-full items-center gap-3 rounded-control px-4 text-sm font-medium text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <LogOut className="size-5" aria-hidden />
            Salir
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/80 backdrop-blur-md">
          <div className="flex min-h-16 items-center gap-3 px-4 py-2 md:px-8">
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
            {/* En escritorio, la barra dice dónde se está: módulo › sección. */}
            <p className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
              <span className="font-semibold text-ink">{app ? app.name : 'Inicio'}</span>
              {section ? (
                <>
                  <ChevronRight className="size-4 shrink-0 text-ink-subtle" aria-hidden />
                  <span className="truncate text-ink-muted">{section.label}</span>
                </>
              ) : null}
            </p>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <span className="hidden text-sm font-medium text-ink-muted md:inline">{me.data.member.displayName}</span>
              {/* En escritorio, espacios y «Salir» viven en la barra lateral. */}
              <AccountMenu me={me.data} workspaces={workspaceList} initials={initials} onSignOut={() => void signOut()} />
            </div>
          </div>
          {app ? (
            // En el móvil, el módulo se nombra a la izquierda y no se desplaza: con varios módulos,
            // «Inventario» solo no basta. Las secciones se desplazan a su derecha; una máscara
            // desvanece los dos bordes y avisa de que hay más.
            <div className="flex items-center gap-1.5 px-3 pb-2 md:hidden">
              <ModuleSwitcher base={base} apps={apps} current={app} compact />
              <nav
                ref={pills}
                aria-label={`Secciones de ${app.name} en el móvil`}
                className="flex min-w-0 flex-1 scroll-ps-6 scroll-pe-10 gap-1 overflow-x-auto py-1 pl-2 pr-8 [scrollbar-width:none] [mask-image:linear-gradient(to_right,transparent,black_20px,black_calc(100%-40px),transparent)]"
              >
                {sections(true)}
              </nav>
            </div>
          ) : null}
        </header>
        <main className="px-4 pb-16 pt-6 md:px-8 md:pt-8">
          <Outlet context={{ workspaceId, me: me.data } satisfies ShellContext} />
        </main>
      </div>
    </div>
  );
}
