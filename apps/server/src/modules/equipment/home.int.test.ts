import { describe, expect, it } from 'vitest';
import { homeTasksResponse } from '@platlab/contracts';
import { call } from '../../testing/api.js';
import { createAsset, createEquipmentLab } from './equipment.fixtures.js';

/** «Por atender» con Equipos (ADR 0026, IN-01): las fallas sin atender, solo para quien las atiende. */

describe('Inicio con Equipos', () => {
  it('las fallas sin atender las ve quien las atiende, no quien solo las reporta', async () => {
    const lab = await createEquipmentLab();
    const asset = await createAsset(lab);
    const reported = await call(lab.teacher.subject, `${lab.base}/faults`, {
      method: 'POST',
      body: { assetId: asset.id, faultType: 'other', description: 'No enciende', usable: false },
    });
    expect(reported.status).toBe(201);
    const tasks = async (subject: string) => homeTasksResponse.parse((await call(subject, `/workspaces/${lab.workspace.id}/home/tasks`)).body).tasks;
    expect(await tasks(lab.operator.subject)).toEqual([
      {
        moduleCode: 'equipment',
        kind: 'unattendedFaults',
        count: 1,
        tone: 'warning',
        cases: [{ ref: expect.any(String), title: asset.name, detail: `${asset.code} · No enciende`, date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }],
      },
    ]);
    expect(await tasks(lab.teacher.subject)).toEqual([]);
  });
});
