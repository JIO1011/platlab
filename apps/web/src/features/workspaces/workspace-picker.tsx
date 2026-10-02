import { Badge, Button, StatePanel } from '@platlab/ui';
import { Building2, ChevronRight, LogOut } from 'lucide-react';
import { Link, Navigate } from 'react-router';
import { Wordmark } from '../../app/brand';
import { useMyWorkspaces } from '../../app/queries';
import { useSession } from '../../app/session';
import { PageLoading, QueryErrorState } from '../../app/states';

const statusLabel: Record<string, string> = {
  trial: 'Prueba',
  suspended: 'Suspendido',
  closing: 'En cierre',
};

/** Selector de espacio (01 §7): si la persona tiene uno solo, entra directamente. */
export function WorkspacePicker() {
  const workspaces = useMyWorkspaces();
  const { signOut } = useSession();

  if (workspaces.isPending) return <PageLoading />;
  if (workspaces.isError) {
    return <QueryErrorState error={workspaces.error} onRetry={() => void workspaces.refetch()} />;
  }
  const list = workspaces.data.workspaces;
  if (list.length === 1 && list[0]) return <Navigate to={`/e/${list[0].id}`} replace />;

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
        {list.length === 0 ? (
          <StatePanel
            icon={Building2}
            title="Todavía no perteneces a ningún espacio"
            description="Cuando un laboratorio te invite, su espacio de trabajo aparecerá aquí."
          />
        ) : (
          <>
            <h1 className="mt-10 text-display text-ink">Elige un espacio de trabajo</h1>
            <p className="mt-1.5 text-sm text-ink-muted">Cada espacio tiene sus propios datos, módulos y roles.</p>
            <ul className="mt-6 overflow-hidden rounded-card bg-surface p-2 shadow-float">
              {list.map((workspace, index) => (
                <li key={workspace.id} className={index > 0 ? 'mt-1' : undefined}>
                  <Link
                    to={`/e/${workspace.id}`}
                    className="group flex items-center gap-4 rounded-panel px-4 py-4 transition-colors hover:bg-canvas"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{workspace.name}</span>
                      <span className="block text-[13px] text-ink-muted">{workspace.code}</span>
                    </span>
                    {workspace.isOwner ? <Badge tone="info">Propietario</Badge> : null}
                    {statusLabel[workspace.status] ? <Badge tone="warning">{statusLabel[workspace.status]}</Badge> : null}
                    <ChevronRight className="size-4 text-ink-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
