import type { WorkspaceMeResponse } from '@platlab/contracts';
import { type QueryKey, useIsFetching, useQueryClient } from '@tanstack/react-query';
import { Outlet, useOutletContext } from 'react-router';
import { useShell } from './app-shell';

/** Lo que toda app de módulo comparte con sus secciones: el espacio, la persona, el modo consulta y «Actualizar». */
export interface ModuleContext {
  workspaceId: string;
  me: WorkspaceMeResponse;
  /** Puede registrar cambios; sin esto, el módulo está en modo consulta (ADR 0009). */
  canOperate: boolean;
  /** El aviso que la cabecera de sección muestra en modo consulta. */
  readOnlyNotice: string;
  freshness: { refreshing: boolean; refresh: () => void };
}

/**
 * La base del contexto de una app de módulo. `queryKey` es la caché entera del módulo: «Actualizar» la invalida y las
 * consultas activas se vuelven a pedir.
 */
export function useModuleApp(code: string, queryKey: QueryKey, readOnlyNotice: string): ModuleContext {
  const { workspaceId, me } = useShell();
  const queryClient = useQueryClient();
  const refreshing = useIsFetching({ queryKey }) > 0;
  return {
    workspaceId,
    me,
    canOperate: me.modules.find((entry) => entry.code === code)?.access.includes('new_operation') ?? false,
    readOnlyNotice,
    freshness: { refreshing, refresh: () => void queryClient.invalidateQueries({ queryKey }) },
  };
}

/** El contenedor común de las secciones de una app de módulo, con su contexto. */
export function ModuleOutlet<T extends ModuleContext>({ context }: { context: T }) {
  return (
    <div className="mx-auto max-w-6xl">
      <Outlet context={context} />
    </div>
  );
}

export const useModuleContext = () => useOutletContext<ModuleContext>();
