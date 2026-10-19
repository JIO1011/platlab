import type { AssetEvent, Fault } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { eventEntries, faultEntries } from './asset-history';

const timeZone = 'America/Guayaquil';

describe('eventEntries', () => {
  it('cada hecho de Equipos lleva su día en la zona del espacio y su hora', () => {
    // 03:00 UTC del 17 aún es el 16 en Guayaquil.
    const created: AssetEvent = { kind: 'created', occurredAt: '2026-10-17T03:00:00.000Z', actor: 'Administradora' };
    const [entry] = eventEntries([created], timeZone);
    expect(entry).toMatchObject({ day: '2026-10-16', at: '2026-10-17T03:00:00.000Z', title: 'Alta del equipo', actor: 'Administradora' });
  });
});

describe('faultEntries', () => {
  const fault = {
    id: 'f1',
    faultType: 'electrical',
    description: 'No enciende',
    usable: false,
    status: 'resolved',
    reportedBy: { name: 'Docente' },
    reportedAt: '2026-10-01T15:00:00.000Z',
    attendedBy: null,
    attendedAt: null,
    resolution: 'Se cambió el fusible',
    resolvedBy: { name: 'Operador' },
    resolvedAt: '2026-10-03T16:00:00.000Z',
  } as unknown as Fault;

  it('un hecho por paso ya ocurrido, con su tipo y quién lo hizo', () => {
    const entries = faultEntries([fault], timeZone);
    expect(entries.map(({ key, day, title, actor }) => ({ key, day, title, actor }))).toEqual([
      { key: 'fault-f1-reported', day: '2026-10-01', title: 'Incidente reportado: Eléctrica', actor: 'Docente' },
      { key: 'fault-f1-resolved', day: '2026-10-03', title: 'Incidente solucionado: Eléctrica', actor: 'Operador' },
    ]);
  });

  it('un incidente abierto es solo su reporte', () => {
    const open = { ...fault, status: 'open', resolution: null, resolvedBy: null, resolvedAt: null } as Fault;
    expect(faultEntries([open], timeZone).map((entry) => entry.key)).toEqual(['fault-f1-reported']);
  });
});
