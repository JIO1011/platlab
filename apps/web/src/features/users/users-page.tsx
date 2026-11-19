import type { Member, MemberDirectory, PendingInvitation } from '@platlab/contracts';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Segmented,
  Skeleton,
  StatePanel,
} from '@platlab/ui';
import { Ellipsis, Lock, UserRoundPlus, UsersRound } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { useShell } from '../../app/app-shell';
import { dayInZone, relativeDays, todayInZone } from '../../app/format';
import { initialsOf } from '../../app/initials';
import { QueryErrorState } from '../../app/states';
import { useMemberDirectory } from './commands';
import { InviteSheet, RevokeSheet, RoleSheet } from './sheets';
import { roleLabel } from '../../app/member-roles';
import { lastSeenText, membersOf, parseView, usersViews, viewCounts, type UsersView } from './users-model';

type Dialog =
  | { kind: 'invite'; initial?: { name: string; email: string } }
  | { kind: 'role'; member: Member }
  | { kind: 'revoke'; target: { kind: 'member' | 'invitation'; id: string; name: string; email: string | null } };

const hints: Record<UsersView, (days: number) => string> = {
  activos: () => 'Quienes entran hoy al espacio, con su rol y su último acceso.',
  pendientes: () => 'Se unen al entrar a PlatLab con su correo y pulsar «Unirme». Si no tienen cuenta, la crean en el acceso.',
  'sin-actividad': (days) =>
    `No entran hace más de ${days} días o nunca entraron. Si ya no forman parte del laboratorio, quítales el acceso.`,
  quitados: () => 'Ya no entran al espacio. Sus registros conservan su nombre; puedes volver a agregarlos.',
};

const empty: Record<UsersView, string> = {
  activos: 'Todavía no hay usuarios.',
  pendientes: 'Nadie está pendiente de unirse.',
  'sin-actividad': 'Todos entraron en el último mes.',
  quitados: 'No se ha quitado a nadie.',
};

/**
 * Una fila de la lista: la persona, su rol, cuándo entró y su acción. Hasta 1280 px el rol y el acceso van bajo el
 * nombre; en pantallas anchas, en sus columnas (la envoltura se disuelve con `contents`).
 */
function PersonRow({ name, detail, badge, role, when, action }: {
  name: string;
  detail: string;
  badge?: ReactNode;
  role: string;
  when: string;
  action?: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 px-4 py-3.5 sm:px-5 xl:grid-cols-[2.5rem_minmax(0,1fr)_7.5rem_9.5rem_8.5rem]">
      <span aria-hidden className="row-span-2 grid size-10 place-items-center rounded-full bg-action-soft text-sm font-semibold text-action xl:row-span-1">
        {initialsOf(name)}
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-semibold text-ink">
          <span className="break-words">{name}</span>
          {badge}
        </p>
        <p className="truncate text-[13px] text-ink-muted">{detail}</p>
      </div>
      <div className="col-start-2 flex flex-wrap gap-x-3 text-[13px] xl:contents">
        <span className="font-medium text-ink">{role}</span>
        <span className="text-ink-muted">{when}</span>
      </div>
      <div className="col-start-3 row-span-2 row-start-1 flex justify-end xl:col-start-auto xl:row-span-1 xl:row-start-auto">{action}</div>
    </li>
  );
}

function MemberRows({ members, timeZone, onDialog }: { members: Member[]; timeZone: string; onDialog: (dialog: Dialog) => void }) {
  const today = todayInZone(timeZone);
  return members.map((member) => {
    const revokeTarget = { kind: 'member' as const, id: member.membershipId, name: member.name, email: member.email };
    const action =
      member.status === 'revoked' ? (
        member.email ? (
          <Button variant="ghost" size="sm" onClick={() => onDialog({ kind: 'invite', initial: { name: member.name, email: member.email ?? '' } })}>
            Volver a agregar
          </Button>
        ) : null
      ) : member.isOwner ? null : (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Acciones de ${member.name}`}
            className="inline-flex size-10 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink data-[state=open]:bg-surface-sunken"
          >
            <Ellipsis className="size-5" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => onDialog({ kind: 'role', member })}>Cambiar rol</DropdownMenuItem>
            <DropdownMenuItem className="text-danger" onSelect={() => onDialog({ kind: 'revoke', target: revokeTarget })}>
              Quitar acceso
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    return (
      <PersonRow
        key={member.membershipId}
        name={member.name}
        detail={member.email ?? 'Correo sin registrar'}
        badge={member.inactive ? <Badge tone="warning">Sin actividad</Badge> : null}
        role={member.isOwner ? 'Propietario' : member.role ? roleLabel(member.role) : 'Sin rol'}
        when={
          member.status === 'revoked' && member.revokedAt
            ? `Se quitó ${relativeDays(dayInZone(member.revokedAt, timeZone), today)}`
            : lastSeenText(member.lastSeenAt, timeZone)
        }
        action={action}
      />
    );
  });
}

function InvitationRows({ invitations, timeZone, onDialog }: {
  invitations: PendingInvitation[];
  timeZone: string;
  onDialog: (dialog: Dialog) => void;
}) {
  const today = todayInZone(timeZone);
  return invitations.map((invitation) => (
    <PersonRow
      key={invitation.id}
      name={invitation.name}
      detail={invitation.email}
      badge={<Badge tone="info">Pendiente</Badge>}
      role={roleLabel(invitation.role)}
      when={`Se agregó ${relativeDays(dayInZone(invitation.invitedAt, timeZone), today)}`}
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDialog({ kind: 'revoke', target: { kind: 'invitation', id: invitation.id, name: invitation.name, email: invitation.email } })}
        >
          Quitar
        </Button>
      }
    />
  ));
}

function UsersList({ directory, view, timeZone, onDialog }: {
  directory: MemberDirectory;
  view: UsersView;
  timeZone: string;
  onDialog: (dialog: Dialog) => void;
}) {
  const rows =
    view === 'pendientes' ? (
      directory.invitations.length > 0 ? <InvitationRows invitations={directory.invitations} timeZone={timeZone} onDialog={onDialog} /> : null
    ) : (
      (() => {
        const members = membersOf(directory, view);
        return members.length > 0 ? <MemberRows members={members} timeZone={timeZone} onDialog={onDialog} /> : null;
      })()
    );
  return (
    <section aria-label={usersViews.find((entry) => entry.value === view)?.label} className="mt-4 overflow-hidden rounded-card bg-surface shadow-raised">
      {rows ? <ul className="divide-y divide-line">{rows}</ul> : <StatePanel icon={UsersRound} title={empty[view]} description="" />}
    </section>
  );
}

/**
 * Usuarios (ADR 0027): la lista blanca del Propietario. Agrega personas con su correo y su rol, ve quién no entra hace
 * más de un mes y quita el acceso a quien ya no forma parte del laboratorio. Nada se borra: quitar revoca.
 */
export function UsersPage() {
  const { workspaceId, me } = useShell();
  const isOwner = me.member.isOwner;
  const directory = useMemberDirectory(workspaceId, isOwner);
  const [params, setParams] = useSearchParams();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const view = parseView(params.get('vista'));
  const timeZone = me.workspace.timeZone;
  const data = directory.data;
  const counts = data ? viewCounts(data) : null;

  const changeView = (next: UsersView) =>
    setParams(
      (current) => {
        const copy = new URLSearchParams(current);
        if (next === 'activos') copy.delete('vista');
        else copy.set('vista', next);
        return copy;
      },
      { replace: true },
    );

  const close = () => setDialog(null);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 tabIndex={-1} data-focus-fallback className="text-display text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action">
            Usuarios
          </h1>
          <p className="mt-2 max-w-prose text-body-lg font-medium text-ink-muted">
            Quién entra a este espacio y con qué rol. Cada persona se une al entrar con el correo que agregues.
          </p>
        </div>
        {isOwner ? (
          <Button variant="primary" onClick={() => setDialog({ kind: 'invite' })}>
            <UserRoundPlus aria-hidden />
            Agregar persona
          </Button>
        ) : null}
      </header>

      <div className="mt-8">
        {!isOwner ? (
          <div className="rounded-card bg-surface shadow-raised">
            <StatePanel icon={Lock} title="Solo el Propietario" description="Los usuarios del espacio los gestiona su Propietario." />
          </div>
        ) : directory.isPending ? (
          <div role="status" aria-busy="true" aria-label="Cargando" className="grid gap-3">
            <Skeleton className="h-10 w-96 max-w-full rounded-full" />
            <Skeleton className="h-64 rounded-card" />
          </div>
        ) : data === undefined || counts === null ? (
          <QueryErrorState error={directory.error} onRetry={() => void directory.refetch()} />
        ) : (
          <>
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <Segmented<UsersView>
                label="Vista"
                value={view}
                onValueChange={changeView}
                options={usersViews.map((entry) => ({ value: entry.value, label: `${entry.label} · ${counts[entry.value]}` }))}
              />
            </div>
            <p aria-live="polite" className="mt-3 max-w-prose text-sm text-ink-muted">
              {hints[view](data.inactiveAfterDays)}
            </p>
            <UsersList directory={data} view={view} timeZone={timeZone} onDialog={setDialog} />
          </>
        )}
      </div>

      {dialog?.kind === 'invite' ? <InviteSheet workspaceId={workspaceId} initial={dialog.initial} onClose={close} /> : null}
      {dialog?.kind === 'role' ? <RoleSheet workspaceId={workspaceId} member={dialog.member} onClose={close} /> : null}
      {dialog?.kind === 'revoke' ? <RevokeSheet workspaceId={workspaceId} target={dialog.target} onClose={close} /> : null}
    </div>
  );
}
