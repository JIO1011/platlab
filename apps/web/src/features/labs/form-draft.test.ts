import { FORM_ESSENTIAL_KEYS, FORM_STANDARD_LAYOUT, publishFormRequest, type FormLayout, type LabsForm } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { draftFrom, fieldsOf, formIssues, newField, publishPayload, type Draft } from './form-draft';
import { addField, setRequester } from './form-edit';

const published: LabsForm = {
  id: '0d8f6d4e-6a8c-4f4e-9d0b-3f1d2b5a7c11',
  name: 'Práctica académica',
  version: 1,
  archivedAt: null,
  revision: 2,
  title: 'Solicitud de laboratorio',
  publishedAt: '2026-10-01T10:00:00Z',
  documentCode: 'FOR-LAB-01',
  layout: FORM_STANDARD_LAYOUT,
};

const draft = (patch: Partial<Draft> = {}): Draft => ({ ...draftFrom(published), ...patch });

const issuesOf = (value: Draft) => {
  const parsed = publishFormRequest.safeParse(publishPayload(value));
  if (parsed.success) throw new Error('Debía fallar');
  return formIssues(parsed.error, value);
};

/** Las claves de los datos libres que el borrador publicaría, en el orden de la hoja. */
const freeKeysOf = (value: Draft): string[] =>
  publishPayload(value).layout.rows.flatMap((row) => (row.kind === 'row' ? row.fields.filter((field) => 'type' in field).map((field) => field.key) : []));

describe('draftFrom', () => {
  it('parte de la revisión vigente: membrete, filas y firmas', () => {
    const value = draftFrom(published);
    expect(value).toMatchObject({ baseRevision: 2, title: 'Solicitud de laboratorio', documentCode: 'FOR-LAB-01', equipmentCode: true, notes: true });
    expect(value.rows).toHaveLength(FORM_STANDARD_LAYOUT.rows.length);
    expect(value.signatures.map(({ label, requester }) => ({ label, requester }))).toEqual(FORM_STANDARD_LAYOUT.signatures);
  });

  it('un formato sin código lo deja vacío', () => {
    expect(draftFrom({ ...published, documentCode: null }).documentCode).toBe('');
  });

  it('cada dato lleva su clave como id, del sistema o libre', () => {
    const fields = fieldsOf(draftFrom(published).rows);
    expect(fields.map((field) => field.id)).toEqual(['titulo', 'docente', 'tipo', 'asignatura', 'carrera', 'fecha', 'horario', 'participantes', 'grupos', 'colaborador', 'curso_paralelo', 'practica_n']);
    expect(fields.filter((field) => field.kind === 'free').map((field) => field.id)).toEqual(['colaborador', 'curso_paralelo', 'practica_n']);
  });

  it('las columnas de Recursos que el formato no muestra quedan al final, ocultas y con su nombre de siempre', () => {
    const layout: FormLayout = { ...FORM_STANDARD_LAYOUT, resources: [{ kind: 'materials', label: 'Insumos' }] };
    const { resources } = draftFrom({ ...published, layout });
    expect(resources.map(({ kind, label, shown }) => ({ kind, label, shown }))).toEqual([
      { kind: 'materials', label: 'Insumos', shown: true },
      { kind: 'reagents', label: 'Reactivos', shown: false },
      { kind: 'equipment', label: 'Equipos', shown: false },
    ]);
  });
});

describe('publishPayload', () => {
  it('sin cambios devuelve la hoja tal como llegó, con la revisión vista', () => {
    const payload = publishPayload(draft());
    expect(payload).toMatchObject({ title: 'Solicitud de laboratorio', documentCode: 'FOR-LAB-01', expectedRevision: 2 });
    expect(payload.layout).toEqual(FORM_STANDARD_LAYOUT);
    expect(publishFormRequest.safeParse(payload).success).toBe(true);
  });

  it('un código vacío o en blanco se envía como null', () => {
    expect(publishPayload(draft({ documentCode: '' })).documentCode).toBeNull();
    expect(publishPayload(draft({ documentCode: '   ' })).documentCode).toBeNull();
  });

  it('las columnas ocultas no se publican', () => {
    const resources = draft().resources.map((resource) => (resource.kind === 'materials' ? { ...resource, shown: false } : resource));
    expect(publishPayload(draft({ resources })).layout.resources.map((resource) => resource.kind)).toEqual(['reagents', 'equipment']);
  });

  it('las opciones de una lista salen una por línea, sin líneas vacías', () => {
    const field = { ...newField('list'), label: 'Norma', options: 'ISO 9001\n\nASTM E8\n' };
    const payload = publishPayload(draft({ rows: addField(draft().rows, field) }));
    expect(payload.layout.rows.at(-1)).toEqual({ kind: 'row', fields: [{ key: 'norma', label: 'Norma', required: false, type: 'list', options: ['ISO 9001', 'ASTM E8'] }] });
    expect(publishFormRequest.safeParse(payload).success).toBe(true);
  });
});

describe('claves de los datos libres nuevos', () => {
  const withLabels = (...labels: string[]): Draft => draft({ rows: labels.reduce((rows, label) => addField(rows, { ...newField(), label }), draft().rows) });

  it('un dato nuevo deriva su clave de la etiqueta y los publicados conservan la suya', () => {
    expect(freeKeysOf(withLabels('Norma aplicable'))).toEqual(['colaborador', 'curso_paralelo', 'practica_n', 'norma_aplicable']);
  });

  it('no choca con las claves reservadas del sistema ni con las ya publicadas', () => {
    const value = withLabels('Docente', 'Grupos', 'Colaborador');
    expect(freeKeysOf(value).slice(3)).toEqual(['docente_2', 'grupos_2', 'colaborador_2']);
    expect(publishFormRequest.safeParse(publishPayload(value)).success).toBe(true);
  });

  it('dos datos nuevos con la misma etiqueta quedan con claves distintas', () => {
    expect(freeKeysOf(withLabels('Norma', 'Norma')).slice(3)).toEqual(['norma', 'norma_2']);
  });

  it('renombrar un dato publicado no cambia su clave', () => {
    const rows = draft().rows.map((row) =>
      row.kind === 'row' ? { ...row, fields: row.fields.map((field) => (field.id === 'colaborador' ? { ...field, label: 'Ayudante' } : field)) } : row,
    );
    expect(freeKeysOf(draft({ rows }))).toContain('colaborador');
  });
});

describe('formIssues', () => {
  it('dice en palabras de la pantalla lo que falta del membrete', () => {
    expect(issuesOf(draft({ title: ' ' })).title).toBe('Escribe el título del formato.');
  });

  it('avisa de lo que excede el límite', () => {
    const issues = issuesOf(draft({ title: 'a'.repeat(121), documentCode: 'b'.repeat(41) }));
    expect(issues.title).toBe('El título admite hasta 120 caracteres.');
    expect(issues.documentCode).toBe('El código admite hasta 40 caracteres.');
  });

  it('señala la etiqueta de un dato libre vacío por su id', () => {
    const field = newField();
    const issues = issuesOf(draft({ rows: addField(draft().rows, field) }));
    expect(issues.fields[field.id]?.label).toBe('Escribe la etiqueta del dato.');
  });

  it('señala una lista sin opciones en el dato, no en la hoja', () => {
    const field = { ...newField('list'), label: 'Norma' };
    const issues = issuesOf(draft({ rows: addField(draft().rows, field) }));
    expect(issues.fields[field.id]?.options).toBe('Agrega al menos una opción.');
    expect(issues.general).toBeUndefined();
  });

  it('señala el título de una sección vacío por su id', () => {
    const rows = draft().rows.map((row) => (row.kind === 'section' ? { ...row, title: '' } : row));
    expect(issuesOf(draft({ rows })).sections[rows[0]?.id ?? '']).toBe('Escribe el título de la sección.');
  });

  it('señala el nombre de una columna de Recursos y el de una firma', () => {
    const resources = draft().resources.map((resource) => (resource.kind === 'equipment' ? { ...resource, label: '' } : resource));
    const signatures = draft().signatures.map((signature, at) => (at === 0 ? { ...signature, label: '' } : signature));
    const issues = issuesOf(draft({ resources, signatures }));
    expect(issues.resources.equipment).toBe('Escribe el nombre de la columna.');
    expect(issues.signatures['signature-0']).toBe('Escribe el nombre de la firma.');
  });

  it('dos firmas del solicitante no pasan: se dice en general', () => {
    const signatures = draft().signatures.map((signature) => ({ ...signature, requester: true }));
    expect(issuesOf(draft({ signatures })).general).toBe('Solo una firma es del solicitante');
  });

  it('una sola firma del solicitante sí pasa, también al marcar otra', () => {
    const marked = setRequester(setRequester(draft().signatures, 'signature-0', true), 'signature-1', true);
    expect(marked.map((signature) => signature.requester)).toEqual([false, true]);
    expect(publishFormRequest.safeParse(publishPayload(draft({ signatures: marked }))).success).toBe(true);
  });
});

describe('datos esenciales', () => {
  it('la plantilla estándar los lleva todos y el contrato rechaza una hoja que pierda uno', () => {
    const keys = fieldsOf(draftFrom(published).rows).map((field) => field.id);
    for (const key of FORM_ESSENTIAL_KEYS) expect(keys).toContain(key);
    const rows = draft().rows.filter((row) => row.kind === 'section' || row.fields.every((field) => field.id !== 'fecha' && field.id !== 'horario'));
    expect(publishFormRequest.safeParse(publishPayload(draft({ rows }))).success).toBe(false);
  });
});
