import { z } from 'zod';
import { text } from './common.js';

/**
 * Áreas y departamentos del Núcleo (ADR 0024), bajo /v1/workspaces/:workspaceId. Los ven quienes consultan
 * el catálogo de algún módulo que los declara; los cambia quien lo administra. Cada comando es idempotente.
 */

/** Cifra de cada módulo, por su código (`reagents`, `equipment`): solo los que el miembro consulta. */
const moduleCounts = z.record(z.string(), z.number().int());

const shelf = z.object({ id: z.uuid(), code: z.string(), name: z.string(), parentId: z.uuid() });

/** Un área: el primer nivel bajo la sede o el edificio (su grupo), o la raíz; con sus estantes y niveles. */
const workspaceArea = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  group: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  manager: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  shelves: z.array(shelf),
  counts: moduleCounts,
});

export const department = z.object({ id: z.uuid(), name: z.string() });

/** GET /areas: áreas y departamentos activos con sus cifras, y si el miembro puede cambiarlos. */
export const areasOverview = z.object({
  areas: z.array(workspaceArea),
  departments: z.array(department.extend({ counts: moduleCounts })),
  canManage: z.boolean(),
});

/** GET /departments: los activos, para elegir en los formularios. */
export const departmentList = z.object({ items: z.array(department) });

/** POST /departments y PATCH /departments/:departmentId: un nombre activo repetido responde NAME_TAKEN. */
export const departmentRequest = z.object({ name: text(120) }).strict();
export const departmentParams = z.object({ workspaceId: z.uuid(), departmentId: z.uuid() });

/** PATCH /locations/:locationId: solo el nombre; repetido bajo el mismo padre responde NAME_TAKEN. */
export const renameLocationRequest = z.object({ name: text(200) }).strict();
export const locationParams = z.object({ workspaceId: z.uuid(), locationId: z.uuid() });

/** POST /locations/:locationId/archive: la ubicación y su descendencia archivadas. */
export const archivedLocations = z.object({ ids: z.array(z.uuid()) });

/** GET /areas/managers: miembros activos que pueden ser encargados de un área. */
export const memberList = z.object({ items: z.array(z.object({ id: z.uuid(), name: z.string() })) });
/** PUT /areas/:areaId/manager: asigna el encargado del área o lo quita con `null`. */
export const assignAreaManagerRequest = z.object({ managerId: z.uuid().nullable() }).strict();

export const areaManager = z.object({ areaId: z.uuid(), managerId: z.uuid().nullable() });

export type AreasOverview = z.infer<typeof areasOverview>;
export type Department = z.infer<typeof department>;
export type DepartmentList = z.infer<typeof departmentList>;
export type ArchivedLocations = z.infer<typeof archivedLocations>;
export type AreaManager = z.infer<typeof areaManager>;
export type MemberList = z.infer<typeof memberList>;
