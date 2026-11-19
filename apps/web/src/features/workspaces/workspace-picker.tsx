import { acceptedInvitation, type MyInvitations } from '@platlab/contracts';
import { Button, StatePanel } from '@platlab/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, LogOut, MailCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { api, isApiError } from '../../app/api';
import { commonErrorMessage } from '../../app/commands';
import { Wordmark } from '../../app/brand';
import { lastWorkspace } from '../../app/last-workspace';
import { useMyInvitations, useMyWorkspaces, useUserKey } from '../../app/queries';
import { useSession } from '../../app/session';
import { PageLoading, QueryErrorState } from '../../app/states';
import { roleLabel } from '../../app/member-roles';

type Invitation = MyInvitations['invitations'][number];

/**
 * «Unirme» (ADR 0027): una acción explícita, nunca al abrir la página. Al unirse se refrescan los espacios y se entra
 * al nuevo. Si el Propietario la quitó mientras tanto, se dice y la lista se actualiza.
 */
function InvitationCard({ invitation }: { invitation: Invitation }) {
  const queryClient = useQueryClient();
  const user = useUserKey();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const join = useMutation({
    mutationFn: () =>
      api(`/workspaces/${invitation.workspaceId}/invitations/${invitation.id}/accept`, { method: 'POST', schema: acceptedInvitation }),
    onSuccess: async ({ workspaceId }) => {
      await queryClient.invalidateQueries({ queryKey: ['user', user] });
      navigate(`/e/${workspaceId}`);
    },
    onError: (failure) => {
      if (isApiError(failure, 'NOT_FOUND')) {
        setError('Esta invitación ya no está disponible.');
        void queryClient.invalidateQueries({ queryKey: ['user', user, 'invitations'] });
      } else if (isApiError(failure, 'WORKSPACE_RESTRICTED')) setError('Este espacio no admite nuevos miembros por ahora.');
      else setError(commonErrorMessage(failure, 'No pudimos unirte. Vuelve a intentarlo.'));
    },
  });

  return (
    <li className="rounded-card bg-surface p-5 shadow-raised">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">{invitation.institution ?? 'Espacio de trabajo'}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{invitation.workspaceName}</p>
      <p className="mt-1 text-sm text-ink-muted">Te agregaron como {roleLabel(invitation.role)}.</p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button variant="primary" className="mt-4 w-full sm:w-auto" loading={join.isPending} onClick={() => join.mutate()}>
        Unirme
      </Button>
    </li>
  );
}

/**
 * Entrada al iniciar sesión (ADR 0011, entrada directa): sin pantalla para elegir, se abre el último espacio usado en
 * este navegador o, la primera vez, el primero de la lista. Se cambia de espacio desde la barra superior. Hay página
 * solo si la persona tiene invitaciones pendientes (ADR 0027) o ningún espacio.
 */
export function WorkspacePicker() {
  const workspaces = useMyWorkspaces();
  const invitations = useMyInvitations();
  const { session, signOut } = useSession();

  if (workspaces.isPending || invitations.isPending) return <PageLoading />;
  if (workspaces.isError) {
    return <QueryErrorState error={workspaces.error} onRetry={() => void workspaces.refetch()} />;
  }
  const list = workspaces.data.workspaces;
  // Si las invitaciones no cargan, se entra como siempre: no deben impedir el uso de los espacios propios.
  const pending = invitations.data?.invitations ?? [];
  const remembered = session ? lastWorkspace(session.user.id) : null;
  const target = list.find((workspace) => workspace.id === remembered) ?? list[0];
  if (target && pending.length === 0) return <Navigate to={`/e/${target.id}`} replace />;

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
        {pending.length > 0 ? (
          <section aria-labelledby="invitaciones" className="mt-10">
            <MailCheck className="size-8 text-action" aria-hidden />
            <h1 id="invitaciones" className="mt-4 text-display text-ink">
              Te invitaron
            </h1>
            <p className="mt-1.5 text-sm text-ink-muted">Únete para entrar a su espacio de trabajo con el rol que te dieron.</p>
            <ul className="mt-6 grid gap-4">
              {pending.map((invitation) => (
                <InvitationCard key={invitation.id} invitation={invitation} />
              ))}
            </ul>
            {target ? (
              <Link to={`/e/${target.id}`} className="mt-6 inline-block text-sm font-semibold text-action underline-offset-2 hover:underline">
                Ahora no: ir a {target.name}
              </Link>
            ) : null}
          </section>
        ) : (
          <StatePanel
            icon={Building2}
            title="Todavía no perteneces a ningún espacio"
            description="Cuando un laboratorio agregue tu correo a su lista, su espacio de trabajo aparecerá aquí para que te unas."
          />
        )}
      </div>
    </main>
  );
}
