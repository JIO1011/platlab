import { expect } from 'vitest';
import { plan as planContract, provider as providerContract } from '@platlab/contracts';
import { admin, app, call, signer } from '../../testing/api.js';
import { addMember, uniqueSuffix, type Member } from '../../testing/core-fixtures.js';
import { createEquipmentLab, type EquipmentLab } from '../equipment/equipment.fixtures.js';

/** M-01a por HTTP contra la base local (ADR 0020): el laboratorio de Equipos con Mantenimiento. */
export { admin, call, count, errorCode } from '../../testing/api.js';
export { createAsset, createType, pdf } from '../equipment/equipment.fixtures.js';

export interface MaintenanceLab extends EquipmentLab {
  /** Prefijo de las rutas de Mantenimiento. */
  maintenance: string;
  student: Member;
}

/** Espacio con Equipos y Mantenimiento, sus miembros de Equipos y un Estudiante. */
export async function createMaintenanceLab(): Promise<MaintenanceLab> {
  const lab = await createEquipmentLab(['equipment', 'maintenance']);
  return {
    ...lab,
    maintenance: `/workspaces/${lab.workspace.id}/maintenance`,
    student: await addMember(admin, lab.workspace.id, { roles: [{ role: 'student' }], displayName: 'Estudiante' }),
  };
}

export const key = () => `mantenimiento-${uniqueSuffix()}`;

/** El día `days` después (o antes) de una fecha AAAA-MM-DD. */
export function shiftDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Hoy en la zona del espacio, como lo calcula el servidor. */
export async function todayIn(lab: MaintenanceLab): Promise<string> {
  const summary = await call(lab.adminMember.subject, `${lab.maintenance}/summary`);
  return (summary.body as { today: string }).today;
}

/** El Administrador crea un plan preventivo semestral desde el 1 de enero, con el alcance que se indique. */
export async function createPlan(lab: MaintenanceLab, body: Record<string, unknown>) {
  const created = await call(lab.adminMember.subject, `${lab.maintenance}/plans`, {
    method: 'POST',
    body: { kind: 'preventive', title: `Preventivo ${uniqueSuffix()}`, intervalCount: 6, intervalUnit: 'month', startsOn: '2026-01-01', ...body },
    key: key(),
  });
  expect(created.status).toBe(201);
  return planContract.parse(created.body);
}

export async function createProvider(lab: MaintenanceLab, name = `Servicio técnico ${uniqueSuffix()}`) {
  const created = await call(lab.adminMember.subject, `${lab.maintenance}/providers`, { method: 'POST', body: { name }, key: key() });
  expect(created.status).toBe(201);
  return providerContract.parse(created.body);
}

/** «Registrar mantenimiento» con una clave nueva, salvo que se pase una. */
export const recordWork = (lab: MaintenanceLab, subject: string, body: Record<string, unknown>, idempotencyKey = key()) =>
  call(subject, `${lab.maintenance}/records`, { method: 'POST', body, key: idempotencyKey });

/** Adjunta el certificado como lo hace la web: el PDF en el cuerpo. */
export async function uploadCertificate(lab: MaintenanceLab, subject: string, recordId: string, file: Buffer) {
  const response = await app.inject({
    method: 'POST',
    url: `/v1${lab.maintenance}/records/${recordId}/certificate`,
    headers: {
      authorization: `Bearer ${await signer.sign(subject)}`,
      'content-type': 'application/pdf',
      'idempotency-key': key(),
    },
    payload: file,
  });
  return { status: response.statusCode, body: response.json() as unknown };
}
