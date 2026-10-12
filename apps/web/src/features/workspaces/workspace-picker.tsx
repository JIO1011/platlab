import { Button, StatePanel } from '@platlab/ui';
import { Building2, LogOut } from 'lucide-react';
import { Navigate } from 'react-router';
import { Wordmark } from '../../app/brand';
import { lastWorkspace } from '../../app/last-workspace';
import { useMyWorkspaces } from '../../app/queries';
import { useSession } from '../../app/session';
import { PageLoading, QueryErrorState } from '../../app/states';

/**
 * Entrada al iniciar sesión (ADR 0011, entrada directa): sin pantalla para elegir, se abre el
 * último espacio usado en este navegador o, la primera vez, el primero de la lista. Se cambia de
 * espacio desde la barra superior. Solo se ve una página si la persona no tiene ningún espacio.
 */
export function WorkspacePicker() {
  const workspaces = useMyWorkspaces();
  const { session, signOut } = useSession();

  if (workspaces.isPending) return <PageLoading />;
  if (workspaces.isError) {
    return <QueryErrorState error={workspaces.error} onRetry={() => void workspaces.refetch()} />;
  }
  const list = workspaces.data.workspaces;
  const remembered = session ? lastWorkspace(session.user.id) : null;
  const target = list.find((workspace) => workspace.id === remembered) ?? list[0];
  if (target) return <Navigate to={`/e/${target.id}`} replace />;

  return (
    <main className="min-h-dvh px-4 py-10">
      <div className="mx-auto w-full max-w-[520px]">
        <div className="flex items-center justify-between">
          <Wordmark className="text-lg" />
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            <LogOut aria-hidden />
            Salir
          </Button>
        </div>
        <StatePanel
          icon={Building2}
          title="Todavía no perteneces a ningún espacio"
          description="Cuando un laboratorio te invite, su espacio de trabajo aparecerá aquí."
        />
      </div>
    </main>
  );
}
