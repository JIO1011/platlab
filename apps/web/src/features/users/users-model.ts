import type { Member, MemberDirectory } from '@platlab/contracts';
import { dayInZone, relativeDays, todayInZone } from '../../app/format';

/** Las vistas de la lista de Usuarios (ADR 0027). */
export type UsersView = 'activos' | 'pendientes' | 'sin-actividad' | 'quitados';

export const usersViews: ReadonlyArray<{ value: UsersView; label: string }> = [
  { value: 'activos', label: 'Activos' },
  { value: 'pendientes', label: 'Pendientes' },
  { value: 'sin-actividad', label: 'Sin actividad' },
  { value: 'quitados', label: 'Quitados' },
];

export const parseView = (value: string | null): UsersView =>
  usersViews.find((view) => view.value === value)?.value ?? 'activos';

/** Cuántos hay en cada vista, para nombrarlas con su cifra. */
export function viewCounts(directory: MemberDirectory): Record<UsersView, number> {
  const active = directory.members.filter((member) => member.status === 'active');
  return {
    activos: active.length,
    pendientes: directory.invitations.length,
    'sin-actividad': active.filter((member) => member.inactive).length,
    quitados: directory.members.length - active.length,
  };
}

/** Los miembros de la vista: el Propietario primero entre los activos; los quitados, del más reciente. */
export function membersOf(directory: MemberDirectory, view: Exclude<UsersView, 'pendientes'>): Member[] {
  if (view === 'quitados') {
    return directory.members
      .filter((member) => member.status === 'revoked')
      .sort((a, b) => (b.revokedAt ?? '').localeCompare(a.revokedAt ?? ''));
  }
  const active = directory.members.filter((member) => member.status === 'active' && (view === 'activos' || member.inactive));
  return [...active.filter((member) => member.isOwner), ...active.filter((member) => !member.isOwner)];
}

/** «Entró hoy», «Entró hace 3 días» o «Nunca entró», en días civiles de la zona del espacio. */
export function lastSeenText(lastSeenAt: string | null, timeZone: string, now = Date.now()): string {
  if (!lastSeenAt) return 'Nunca entró';
  return `Entró ${relativeDays(dayInZone(lastSeenAt, timeZone), todayInZone(timeZone, now))}`;
}
