import { Link } from 'react-router';
import { useShell } from '../../app/app-shell';
import { webModule } from '../../app/modules';

/**
 * Accesos rápidos del Inicio (ADR 0026): las operaciones frecuentes que cada módulo declara, solo las que el rol puede
 * hacer y en los módulos que admiten operaciones nuevas. Cada uno abre donde se hace la operación.
 */
export function QuickActions() {
  const { workspaceId, me } = useShell();
  const actions = me.modules
    .filter((module) => module.access.includes('new_operation'))
    .flatMap((module) => (webModule(module.code)?.home.quick ?? []).filter((action) => me.permissions.includes(action.permission)));
  if (actions.length === 0) return null;
  return (
    <nav aria-label="Accesos rápidos" className="mt-5">
      <ul className="flex flex-wrap gap-2">
        {actions.map(({ label, href, Icon }) => (
          <li key={href}>
            <Link
              to={`/e/${workspaceId}/${href}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-semibold text-ink shadow-raised transition-[box-shadow,transform] duration-150 ease-out-expo hover:shadow-float active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action motion-reduce:transition-none sm:min-h-10"
            >
              <Icon className="size-4 text-action" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
