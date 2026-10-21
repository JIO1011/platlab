import type pg from 'pg';
import type { z } from 'zod';
import { FORM_DEFAULT_LABELS, FORM_STANDARD_FIELDS, type FormField, type LabsForm, type publishFormRequest } from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import { recordAudit, requires, type CommandRequest, type QueryRequest } from '../../core/index.js';
import { insertFormVersion, latestForm, type ILatestFormResult } from '../infrastructure/form.queries.js';
import { FORM_MANAGE, runCommand, runQuery } from './command.js';

/**
 * Formato de solicitud (ADR 0023): uno por espacio de trabajo. Cada guardado publica una versión nueva e
 * inmutable; sin ninguna, la versión 0 es la plantilla estándar sin título.
 */

const toForm = (row: ILatestFormResult | undefined): LabsForm =>
  row
    ? {
        version: row.version,
        title: row.title,
        documentCode: row.document_code,
        subjectLabel: row.subject_label,
        unitLabel: row.unit_label,
        fields: row.fields as FormField[],
        publishedAt: row.published_at.toISOString(),
      }
    : { version: 0, title: null, documentCode: null, ...FORM_DEFAULT_LABELS, fields: FORM_STANDARD_FIELDS, publishedAt: null };

const versionConflict = () => new AppError('VERSION_CONFLICT', 'Otra persona publicó el formato mientras editabas: vuelve a cargarlo');

export function getForm(pool: pg.Pool, request: QueryRequest): Promise<LabsForm> {
  return runQuery(pool, request, async (access) => {
    const [row] = await latestForm.run({ workspaceId: access.workspace.id }, access.client);
    return toForm(row);
  });
}

/** Publica la versión siguiente a la que la persona vio; si ya no es la vigente, VERSION_CONFLICT. */
export function publishForm(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof publishFormRequest>): Promise<LabsForm> {
  return runCommand(pool, request, 'labs.form.publish', input, requires(FORM_MANAGE), async (access) => {
    const workspaceId = access.workspace.id;
    const [latest] = await latestForm.run({ workspaceId }, access.client);
    if ((latest?.version ?? 0) !== input.expectedVersion) throw versionConflict();
    const [published] = await insertFormVersion.run(
      {
        workspaceId,
        version: input.expectedVersion + 1,
        title: input.title,
        documentCode: input.documentCode,
        subjectLabel: input.subjectLabel,
        unitLabel: input.unitLabel,
        fields: JSON.stringify(input.fields),
        publishedBy: access.principalId,
      },
      access.client,
    );
    if (!published) throw versionConflict();
    await recordAudit(access, {
      action: 'labs.form.publish',
      entityType: 'labs.form',
      entityId: workspaceId,
      changes: {
        version: published.version,
        title: input.title,
        documentCode: input.documentCode,
        subjectLabel: input.subjectLabel,
        unitLabel: input.unitLabel,
        fields: input.fields,
      },
    });
    return toForm(published);
  });
}
