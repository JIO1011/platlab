import { describe, expect, it } from 'vitest';
import { homeTasksResponse } from '@platlab/contracts';
import { addDays, todayIn } from '../../platform/dates.js';
import { call, createLab, createProduct, receive } from './reagents.fixtures.js';

/** «Por atender» con Reactivos (ADR 0026, IN-01): frascos vencidos en rojo antes que los por vencer, en ámbar. */

describe('Inicio con Reactivos', () => {
  it('vencidos y por vencer, con las cifras del Resumen y lo rojo primero', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const today = todayIn('America/Guayaquil');
    for (const [code, offset] of [['V-1', -1], ['H-5', 5], ['H-10', 10]] as const) {
      const response = await receive(lab, product.id, '10', lab.storage, lab.adminMember.subject, { codes: [code], expiresOn: addDays(today, offset) });
      expect(response.status).toBe(201);
    }
    const tasks = homeTasksResponse.parse((await call(lab.adminMember.subject, `/workspaces/${lab.workspace.id}/home/tasks`)).body).tasks;
    expect(tasks).toEqual([
      { moduleCode: 'reagents', kind: 'expiredContainers', count: 1, tone: 'danger' },
      { moduleCode: 'reagents', kind: 'expiringContainers', count: 2, tone: 'warning' },
    ]);
  });
});
