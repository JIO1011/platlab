import type pg from 'pg';
import type { z } from 'zod';
import {
  FORM_STANDARD_LAYOUT,
  type createFormRequest,
  type FormLayout,
  type FormList,
  type LabsForm,
  type publishFormRequest,
  type updateFormRequest,
} from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import { hasPermission, recordAudit, requireEditable, requires, type CommandRequest, type QueryRequest, type WorkspaceAccess } from '../../core/index.js';
import {
  archiveForm as archiveFormQuery,
  formById as formByIdQuery,
  insertForm,
  insertFormRevision,
  lastRevision,
  listForms as listFormsQuery,
  lockForm,
  renameForm,
} from '../infrastructure/form.queries.js';
import { FORM_MANAGE, runCommand, runQuery } from './command.js';

/**
 * Formatos de solicitud (ADR 0023, «Diseño por filas y varios formatos»): el Administrador los crea desde la plantilla
 * estándar o duplicando otro, los renombra y los archiva; cada guardado publica una revisión nueva e inmutable. Quien
 * no los administra (el Docente, que los llenará en L-01b) solo ve los activos.
 */

const notFound = () => new AppError('NOT_FOUND', 'Recurso no encontrado');
const revisionConflict = () => new AppError('VERSION_CONFLICT', 'Otra persona publicó el formato mientras editabas: vuelve a cargarlo');

async function formById(access: WorkspaceAccess, formId: string): Promise<LabsForm> {
  const [row] = await formByIdQuery.run({ workspaceId: access.workspace.id, formId }, access.client);
  if (!row) throw notFound();
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    archivedAt: row.archived_at?.toISOString() ?? null,
    revision: row.revision,
    title: row.title,
    documentCode: row.document_code,
    layout: row.layout as FormLayout,
    publishedAt: row.published_at.toISOString(),
  };
}

/** Un nombre activo repetido (forms_active_name), también si otra persona lo tomó a la vez, es NAME_TAKEN. */
async function withUniqueName<T>(name: string, write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if ((error as { constraint?: unknown }).constraint === 'forms_active_name') {
      throw new AppError('NAME_TAKEN', `Ya existe el formato «${name}»`);
    }
    throw error;
  }
}

export function listForms(pool: pg.Pool, request: QueryRequest): Promise<FormList> {
  return runQuery(pool, request, async (access) => {
    const includeArchived = await hasPermission(access, FORM_MANAGE);
    const rows = await listFormsQuery.run({ workspaceId: access.workspace.id, includeArchived }, access.client);
    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        version: row.version,
        archivedAt: row.archived_at?.toISOString() ?? null,
        revision: row.revision,
        title: row.title,
        publishedAt: row.published_at.toISOString(),
      })),
    };
  });
}

export function getForm(pool: pg.Pool, request: QueryRequest, formId: string): Promise<LabsForm> {
  return runQuery(pool, request, async (access) => {
    const form = await formById(access, formId);
    if (form.archivedAt && !(await hasPermission(access, FORM_MANAGE))) throw notFound();
    return form;
  });
}

/**
 * Crea el formato con su revisión 1: la plantilla estándar con el nombre como título o, con `from`, la última
 * revisión de otro formato del espacio (aunque esté archivado).
 */
export function createForm(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof createFormRequest>): Promise<LabsForm> {
  return runCommand(pool, request, 'labs.form.create', input, requires(FORM_MANAGE), async (access) => {
    const workspaceId = access.workspace.id;
    const source = input.from ? await formById(access, input.from) : undefined;
    const [created] = await withUniqueName(input.name, () => insertForm.run({ workspaceId, name: input.name, createdBy: access.principalId }, access.client));
    const formId = created!.id;
    const content = {
      title: source?.title ?? input.name,
      documentCode: source?.documentCode ?? null,
      layout: source?.layout ?? FORM_STANDARD_LAYOUT,
    };
    await insertFormRevision.run(
      { workspaceId, formId, revision: 1, ...content, layout: JSON.stringify(content.layout), publishedBy: access.principalId },
      access.client,
    );
    await recordAudit(access, { action: 'labs.form.create', entityType: 'labs.form', entityId: formId, changes: { name: input.name, from: input.from ?? null } });
    return formById(access, formId);
  });
}

/** Renombra con la versión que la persona vio; un formato archivado no se edita. */
export function updateForm(pool: pg.Pool, request: CommandRequest, formId: string, { expectedVersion, name }: z.infer<typeof updateFormRequest>): Promise<LabsForm> {
  return runCommand(pool, request, 'labs.form.update', { formId, expectedVersion, name }, requires(FORM_MANAGE), async (access) => {
    const workspaceId = access.workspace.id;
    const [current] = await lockForm.run({ workspaceId, formId }, access.client);
    requireEditable(current, expectedVersion);
    await withUniqueName(name, () => renameForm.run({ workspaceId, formId, name }, access.client));
    await recordAudit(access, { action: 'labs.form.update', entityType: 'labs.form', entityId: formId, changes: { name } });
    return formById(access, formId);
  });
}

/** Deja de ofrecerse para llenar; no se borra y sus revisiones se conservan. */
export function archiveForm(pool: pg.Pool, request: CommandRequest, formId: string): Promise<LabsForm> {
  return runCommand(pool, request, 'labs.form.archive', { formId }, requires(FORM_MANAGE), async (access) => {
    const [current] = await lockForm.run({ workspaceId: access.workspace.id, formId }, access.client);
    requireEditable(current);
    await archiveFormQuery.run({ workspaceId: access.workspace.id, formId }, access.client);
    await recordAudit(access, { action: 'labs.form.archive', entityType: 'labs.form', entityId: formId, changes: { archived: true } });
    return formById(access, formId);
  });
}

/** Publica la revisión siguiente a la que la persona vio, con el formato bloqueado; si ya no es la última, VERSION_CONFLICT. */
export function publishForm(pool: pg.Pool, request: CommandRequest, formId: string, input: z.infer<typeof publishFormRequest>): Promise<LabsForm> {
  return runCommand(pool, request, 'labs.form.publish', { formId, ...input }, requires(FORM_MANAGE), async (access) => {
    const workspaceId = access.workspace.id;
    const [current] = await lockForm.run({ workspaceId, formId }, access.client);
    requireEditable(current);
    const [last] = await lastRevision.run({ workspaceId, formId }, access.client);
    if (last?.revision !== input.expectedRevision) throw revisionConflict();
    const revision = input.expectedRevision + 1;
    const [published] = await insertFormRevision.run(
      {
        workspaceId,
        formId,
        revision,
        title: input.title,
        documentCode: input.documentCode,
        layout: JSON.stringify(input.layout),
        publishedBy: access.principalId,
      },
      access.client,
    );
    if (!published) throw revisionConflict();
    await recordAudit(access, {
      action: 'labs.form.publish',
      entityType: 'labs.form',
      entityId: formId,
      changes: { revision, title: input.title, documentCode: input.documentCode, layout: input.layout },
    });
    return formById(access, formId);
  });
}
