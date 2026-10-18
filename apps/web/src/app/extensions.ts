import type { WorkspaceMeResponse } from '@platlab/contracts';
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { webModules } from './modules';
import type { ExtensionPoints, ModuleExtension } from './web-module';

type Lazy<P extends keyof ExtensionPoints> = LazyExoticComponent<ComponentType<ExtensionPoints[P]>>;

/** Un componente diferido por módulo y punto, creado una sola vez: si se creara en cada render, se remontaría. */
const loaded = new Map<string, unknown>();

function component<P extends keyof ExtensionPoints>(
  code: string,
  point: P,
  load: () => Promise<ComponentType<ExtensionPoints[P]>>,
): Lazy<P> {
  const key = `${code}:${point}`;
  let found = loaded.get(key) as Lazy<P> | undefined;
  if (!found) {
    found = lazy(async () => ({ default: await load() }));
    loaded.set(key, found);
  }
  return found;
}

/**
 * Lo que los módulos aportan a un punto de extensión (ADR 0020), en el orden del registro: solo de los
 * módulos que la persona ve en el espacio y con el permiso de cada aporte. El componente se descarga al
 * mostrarse; quien lo pinta lo envuelve en `Suspense`.
 */
export function useExtensions<P extends keyof ExtensionPoints>(
  point: P,
  me: WorkspaceMeResponse,
): Array<{ code: string; label: string; Component: Lazy<P> }> {
  return webModules.flatMap((module) =>
    me.modules.some((entry) => entry.code === module.code)
      ? (module.extensions ?? [])
          .filter((extension): extension is ModuleExtension & { point: P } => extension.point === point)
          .filter((extension) => me.permissions.includes(extension.permission))
          .map((extension) => ({
            code: module.code,
            label: extension.label,
            // `point` es P: su `load` da las props de ese punto (TypeScript no estrecha la unión con un genérico).
            Component: component(module.code, point, extension.load as () => Promise<ComponentType<ExtensionPoints[P]>>),
          }))
      : [],
  );
}
