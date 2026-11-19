import type { Member, MemberDirectory } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { lastSeenText, membersOf, parseView, viewCounts } from './users-model';

const member = (overrides: Partial<Member>): Member => ({
  membershipId: crypto.randomUUID(),
  principalId: crypto.randomUUID(),
  name: 'Persona',
  email: null,
  isOwner: false,
  role: 'teacher',
  status: 'active',
  joinedAt: '2026-10-01T12:00:00Z',
  revokedAt: null,
  lastSeenAt: null,
  inactive: false,
  ...overrides,
});

const directory: MemberDirectory = {
  members: [
    member({ name: 'Diego', inactive: true }),
    member({ name: 'Paula', isOwner: true, role: null }),
    member({ name: 'Rosa', status: 'revoked', role: null, revokedAt: '2026-11-01T10:00:00Z' }),
    member({ name: 'Raúl', status: 'revoked', role: null, revokedAt: '2026-11-10T10:00:00Z' }),
  ],
  invitations: [{ id: crypto.randomUUID(), name: 'Elena', email: 'elena@demo.test', role: 'student', invitedAt: '2026-11-18T10:00:00Z' }],
  inactiveAfterDays: 30,
};

describe('Usuarios (ADR 0027)', () => {
  it('cuenta cada vista', () => {
    expect(viewCounts(directory)).toEqual({ activos: 2, pendientes: 1, 'sin-actividad': 1, quitados: 2 });
  });

  it('pone al Propietario primero y los quitados del más reciente', () => {
    expect(membersOf(directory, 'activos').map((entry) => entry.name)).toEqual(['Paula', 'Diego']);
    expect(membersOf(directory, 'sin-actividad').map((entry) => entry.name)).toEqual(['Diego']);
    expect(membersOf(directory, 'quitados').map((entry) => entry.name)).toEqual(['Raúl', 'Rosa']);
  });

  it('una vista desconocida es la de activos', () => {
    expect(parseView('quitados')).toBe('quitados');
    expect(parseView('otra')).toBe('activos');
    expect(parseView(null)).toBe('activos');
  });

  it('dice el último acceso en días de la zona del espacio', () => {
    const now = Date.parse('2026-11-19T15:00:00Z');
    expect(lastSeenText(null, 'America/Guayaquil', now)).toBe('Nunca entró');
    expect(lastSeenText('2026-11-19T13:00:00Z', 'America/Guayaquil', now)).toBe('Entró hoy');
    // 01:00 UTC del 19 todavía es el 18 en Guayaquil.
    expect(lastSeenText('2026-11-19T01:00:00Z', 'America/Guayaquil', now)).toBe('Entró hace 1 día');
    expect(lastSeenText('2026-10-05T12:00:00Z', 'America/Guayaquil', now)).toBe('Entró hace 45 días');
  });
});
