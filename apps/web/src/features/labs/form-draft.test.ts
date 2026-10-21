import { FORM_STANDARD_FIELDS, publishFormRequest, type LabsForm } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { draftFrom, formIssues, moveField, newField, publishPayload, repeatsCore, type Draft } from './form-draft';

const published: LabsForm = {
  version: 2,
  title: 'Solicitud de laboratorio',
  documentCode: 'FOR-LAB-01',
  subjectLabel: 'Proyecto',
  unitLabel: 'Cliente',
  fields: [{ key: 'norma', label: 'Norma', type: 'text', required: false }],
  publishedAt: '2026-10-01T10:00:00Z',
};

const draft = (patch: Partial<Draft> = {}): Draft => ({ ...draftFrom(published), ...patch });

const issuesOf = (value: Draft) => {
  const parsed = publishFormRequest.safeParse(publishPayload(value));
  if (parsed.success) throw new Error('Debía fallar');
  return formIssues(parsed.error, value);
};

describe('publishPayload', () => {
  it('lleva el membrete, los nombres del núcleo y la versión vista', () => {
    const payload = publishPayload(draft());
    expect(payload).toMatchObject({ title: 'Solicitud de laboratorio', documentCode: 'FOR-LAB-01', subjectLabel: 'Proyecto', unitLabel: 'Cliente', expectedVersion: 2 });
    expect(publishFormRequest.safeParse(payload).success).toBe(true);
  });

  it('un código vacío o en blanco se envía como null', () => {
    expect(publishPayload(draft({ documentCode: '' })).documentCode).toBeNull();
    expect(publishPayload(draft({ documentCode: '   ' })).documentCode).toBeNull();
  });

  it('el borrador de un formato sin código lo deja vacío', () => {
    expect(draftFrom({ ...published, documentCode: null }).documentCode).toBe('');
  });
});

describe('plantilla estándar (versión 0)', () => {
  const blank: LabsForm = { version: 0, title: null, documentCode: null, subjectLabel: 'Asignatura', unitLabel: 'Carrera', fields: FORM_STANDARD_FIELDS, publishedAt: null };

  it('el borrador parte de los datos extra que devuelve el servidor, con su clave como id', () => {
    const fields = draftFrom(blank).fields;
    expect(fields.map((field) => field.key)).toEqual(['colaborador', 'curso_paralelo', 'practica_n']);
    expect(fields.map((field) => field.id)).toEqual(['colaborador', 'curso_paralelo', 'practica_n']);
    expect(fields.map((field) => field.label)).toEqual(['Colaborador de cátedra', 'Curso-paralelo', 'Práctica Nº']);
  });

  it('con un título se publica tal cual, conservando las claves y el orden', () => {
    const payload = publishPayload({ ...draftFrom(blank), title: 'Registro de práctica' });
    expect(payload.expectedVersion).toBe(0);
    expect(payload.fields.map((field) => field.key)).toEqual(['colaborador', 'curso_paralelo', 'practica_n']);
    expect(publishFormRequest.safeParse(payload).success).toBe(true);
  });

  it('quitar u ordenar los datos extra no cambia las claves de los demás', () => {
    const base = draftFrom(blank);
    const moved = { ...base, title: 'Registro', fields: moveField(base.fields, 2, 0) };
    expect(publishPayload(moved).fields.map((field) => field.key)).toEqual(['practica_n', 'colaborador', 'curso_paralelo']);
    const removed = { ...base, title: 'Registro', fields: base.fields.filter((field) => field.key !== 'curso_paralelo') };
    expect(publishFormRequest.safeParse(publishPayload(removed)).success).toBe(true);
  });
});

describe('formIssues', () => {
  it('dice en palabras de la pantalla lo que falta del membrete y de los nombres', () => {
    const issues = issuesOf(draft({ title: ' ', subjectLabel: '', unitLabel: '' }));
    expect(issues.title).toBe('Escribe el título del formato.');
    expect(issues.subjectLabel).toBe('Escribe cómo se llama la asignatura.');
    expect(issues.unitLabel).toBe('Escribe cómo se llama la carrera.');
  });

  it('avisa de lo que excede el límite', () => {
    const issues = issuesOf(draft({ title: 'a'.repeat(121), documentCode: 'b'.repeat(41), subjectLabel: 'c'.repeat(41) }));
    expect(issues.title).toBe('El título admite hasta 120 caracteres.');
    expect(issues.documentCode).toBe('El código admite hasta 40 caracteres.');
    expect(issues.subjectLabel).toBe('El nombre admite hasta 40 caracteres.');
  });

  it('señala la etiqueta de un campo libre vacío por su posición', () => {
    const base = draft();
    const issues = issuesOf({ ...base, fields: [...base.fields, { id: 'nuevo', label: '', type: 'text', required: false, options: '' }] });
    expect(issues.fields[1]?.label).toBe('Escribe la etiqueta del campo.');
  });
});

describe('repeatsCore', () => {
  it('reconoce las claves que el sistema ya pide en la Sección I', () => {
    for (const key of ['titulo', 'asignatura', 'carrera', 'tipo', 'docente', 'fecha', 'horario', 'participantes', 'alumnos', 'grupos']) expect(repeatsCore(key)).toBe(true);
  });

  it('no avisa de lo propio del laboratorio', () => {
    expect(repeatsCore('norma')).toBe(false);
    for (const key of ['colaborador', 'curso_paralelo', 'practica_n']) expect(repeatsCore(key)).toBe(false);
    expect(repeatsCore(undefined)).toBe(false);
  });
});

describe('moveField', () => {
  const list = ['a', 'b', 'c', 'd'];

  it('lleva un elemento a otra posición, hacia abajo o hacia arriba', () => {
    expect(moveField(list, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveField(list, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('acota el destino a la lista', () => {
    expect(moveField(list, 1, -4)).toEqual(['b', 'a', 'c', 'd']);
    expect(moveField(list, 1, 9)).toEqual(['a', 'c', 'd', 'b']);
  });

  it('sin cambio devuelve una copia igual y no toca la original', () => {
    expect(moveField(list, 2, 2)).toEqual(list);
    expect(moveField(list, 7, 0)).toEqual(list);
    expect(moveField(list, 7, 0)).not.toBe(list);
    expect(list).toEqual(['a', 'b', 'c', 'd']);
  });

  it('una lista vacía queda vacía', () => {
    expect(moveField([], 0, 1)).toEqual([]);
  });
});

describe('newField', () => {
  it('nace del tipo elegido, sin etiqueta y opcional', () => {
    expect(newField('number')).toMatchObject({ label: '', type: 'number', required: false, options: '' });
    expect(newField().type).toBe('text');
  });

  it('cada campo nuevo lleva su propio id', () => {
    expect(newField().id).not.toBe(newField().id);
  });
});
