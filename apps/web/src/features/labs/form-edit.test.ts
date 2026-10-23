import { FORM_MAX_FREE_FIELDS, FORM_MAX_PER_ROW, FORM_STANDARD_LAYOUT, publishFormRequest, type LabsForm } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { draftFrom, fieldsOf, newField, publishPayload, type DraftRow } from './form-draft';
import {
  addField,
  addSignature,
  canAddFree,
  moveItem,
  moveResource,
  placeInNewRow,
  placeInRow,
  removeField,
  removeSignature,
  removedOptional,
  renameResource,
  restoreSystemField,
  setRequester,
  setResourceShown,
  shiftField,
} from './form-edit';

const published: LabsForm = {
  id: '0d8f6d4e-6a8c-4f4e-9d0b-3f1d2b5a7c11',
  name: 'Práctica académica',
  version: 1,
  archivedAt: null,
  revision: 1,
  title: 'Solicitud de laboratorio',
  publishedAt: '2026-10-01T10:00:00Z',
  documentCode: null,
  layout: FORM_STANDARD_LAYOUT,
};

const base = draftFrom(published);
// Elementos de la plantilla: row-0 título de sección; row-1 título; row-2 docente | tipo; row-3 asignatura | carrera;
// row-4 fecha | horario; row-5 participantes | grupos; row-6 colaborador | curso_paralelo | practica_n.
const idsOf = (rows: readonly DraftRow[]): string[][] => rows.map((row) => (row.kind === 'row' ? row.fields.map((field) => field.id) : []));
const valid = (rows: readonly DraftRow[]) => publishFormRequest.safeParse(publishPayload({ ...base, rows: [...rows] })).success;

describe('moveItem', () => {
  const list = ['a', 'b', 'c', 'd'];

  it('lleva un elemento a otra posición, hacia abajo o hacia arriba', () => {
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(list, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('acota el destino a la lista', () => {
    expect(moveItem(list, 1, -4)).toEqual(['b', 'a', 'c', 'd']);
    expect(moveItem(list, 1, 9)).toEqual(['a', 'c', 'd', 'b']);
  });

  it('sin cambio devuelve una copia igual y no toca la original', () => {
    expect(moveItem(list, 2, 2)).toEqual(list);
    expect(moveItem(list, 7, 0)).toEqual(list);
    expect(moveItem(list, 7, 0)).not.toBe(list);
    expect(list).toEqual(['a', 'b', 'c', 'd']);
  });

  it('una lista vacía queda vacía', () => {
    expect(moveItem([], 0, 1)).toEqual([]);
  });
});

describe('newField', () => {
  it('nace del tipo elegido, sin etiqueta y opcional', () => {
    expect(newField('number')).toMatchObject({ kind: 'free', label: '', type: 'number', required: false, options: '' });
    expect(newField().type).toBe('text');
  });

  it('cada dato nuevo lleva su propio id', () => {
    expect(newField().id).not.toBe(newField().id);
  });
});

describe('placeInRow', () => {
  it('pasa un dato a otra fila a la que le cabe, y la fila que se queda vacía desaparece', () => {
    const next = placeInRow(base.rows, 'titulo', 'row-2', 1);
    expect(next && idsOf(next)[1]).toEqual(['docente', 'titulo', 'tipo']);
    expect(next).toHaveLength(base.rows.length - 1);
  });

  it('no pasa un dato a una fila que ya tiene tres', () => {
    expect(placeInRow(base.rows, 'titulo', 'row-6', 0)).toBeUndefined();
  });

  it('en su misma fila solo se reordena, aunque tenga tres', () => {
    const next = placeInRow(base.rows, 'practica_n', 'row-6', 0);
    expect(next && idsOf(next).at(-1)).toEqual(['practica_n', 'colaborador', 'curso_paralelo']);
  });

  it('sacar un dato de una fila de tres deja lugar a otro', () => {
    const next = placeInRow(base.rows, 'colaborador', 'row-1', 1);
    expect(next && idsOf(next)[1]).toEqual(['titulo', 'colaborador']);
    expect(next && idsOf(next).at(-1)).toEqual(['curso_paralelo', 'practica_n']);
  });

  it('ninguna fila pasa de tres datos tras mover', () => {
    const next = placeInRow(base.rows, 'tipo', 'row-1', 0);
    expect(next && Math.max(...idsOf(next).map((ids) => ids.length))).toBeLessThanOrEqual(FORM_MAX_PER_ROW);
  });
});

describe('placeInNewRow', () => {
  it('saca un dato a una fila propia en la posición pedida', () => {
    const next = placeInNewRow(base.rows, 'docente', 1);
    expect(next && idsOf(next).slice(1, 4)).toEqual([['docente'], ['titulo'], ['tipo']]);
  });

  it('un dato que ya está solo no cambia si lo sueltan junto a su fila', () => {
    expect(placeInNewRow(base.rows, 'titulo', 1)).toEqual(base.rows);
    expect(placeInNewRow(base.rows, 'titulo', 2)).toEqual(base.rows);
  });
});

describe('shiftField', () => {
  it('hacia arriba o abajo se une a la fila vecina si le cabe', () => {
    const down = shiftField(base.rows, 'titulo', 'down');
    expect(down && idsOf(down)[1]).toEqual(['titulo', 'docente', 'tipo']);
    const up = shiftField(base.rows, 'colaborador', 'up');
    expect(up && idsOf(up)[5]).toEqual(['colaborador', 'participantes', 'grupos']);
  });

  it('si la vecina está llena, un dato que comparte fila se separa en una propia', () => {
    const next = shiftField(base.rows, 'practica_n', 'down');
    expect(next && idsOf(next).slice(-2)).toEqual([['colaborador', 'curso_paralelo'], ['practica_n']]);
  });

  it('un dato solo salta el título vecino', () => {
    const next = shiftField(base.rows, 'titulo', 'up');
    expect(next?.map((row) => row.kind)).toEqual(['row', 'section', ...base.rows.slice(2).map((row) => row.kind)]);
  });

  it('a la izquierda o derecha cambia de lugar en su fila y no pasa de sus bordes', () => {
    const right = shiftField(base.rows, 'docente', 'right');
    expect(right && idsOf(right)[2]).toEqual(['tipo', 'docente']);
    expect(shiftField(base.rows, 'docente', 'left')).toBeUndefined();
  });
});

describe('quitar y volver a agregar', () => {
  it('un dato esencial no se quita', () => {
    for (const key of ['docente', 'titulo', 'fecha', 'horario', 'participantes']) expect(removeField(base.rows, key)).toBeUndefined();
  });

  it('un dato que no existe tampoco', () => {
    expect(removeField(base.rows, 'nadie')).toBeUndefined();
  });

  it('un dato opcional se quita, se puede volver a agregar y la hoja sigue siendo válida', () => {
    const removed = removeField(base.rows, 'carrera');
    expect(removed).toBeDefined();
    if (!removed) return;
    expect(fieldsOf(removed).map((field) => field.id)).not.toContain('carrera');
    expect(removedOptional(removed)).toEqual(['carrera']);
    expect(valid(removed)).toBe(true);

    const restored = restoreSystemField(removed, 'carrera');
    expect(removedOptional(restored)).toEqual([]);
    expect(restored.at(-1)).toMatchObject({ kind: 'row', fields: [{ kind: 'system', key: 'carrera', label: 'Carrera' }] });
    expect(valid(restored)).toBe(true);
  });

  it('una fila que se queda sin datos desaparece', () => {
    const next = removeField(removeField(base.rows, 'asignatura') ?? [], 'carrera');
    expect(next).toHaveLength(base.rows.length - 1);
    expect(next && removedOptional(next)).toEqual(['asignatura', 'carrera']);
  });

  it('un dato libre se quita sin más', () => {
    expect(removeField(base.rows, 'colaborador')).toBeDefined();
  });

  it('los datos libres se frenan en el máximo del contrato', () => {
    const rows = Array.from({ length: FORM_MAX_FREE_FIELDS - 3 }, () => newField()).reduce((current, field) => addField(current, field), base.rows);
    expect(canAddFree(rows)).toBe(false);
    expect(canAddFree(base.rows)).toBe(true);
  });
});

describe('Recursos', () => {
  it('se renombra una columna sin tocar las demás', () => {
    const next = renameResource(base.resources, 'materials', 'Insumos');
    expect(next.map((resource) => resource.label)).toEqual(['Reactivos', 'Equipos', 'Insumos']);
  });

  it('se oculta una columna mientras quede otra, y la última no se oculta', () => {
    const one = setResourceShown(base.resources, 'reagents', false);
    const two = one && setResourceShown(one, 'equipment', false);
    expect(two?.filter((resource) => resource.shown).map((resource) => resource.kind)).toEqual(['materials']);
    expect(two && setResourceShown(two, 'materials', false)).toBeUndefined();
  });
});

describe('moveResource', () => {
  const kinds = (resources: readonly { kind: string }[] | undefined) => resources?.map((resource) => resource.kind);

  it('pasa una columna a la derecha y a la izquierda', () => {
    expect(kinds(moveResource(base.resources, 'reagents', 1))).toEqual(['equipment', 'reagents', 'materials']);
    expect(kinds(moveResource(base.resources, 'materials', -1))).toEqual(['reagents', 'materials', 'equipment']);
  });

  it('en los bordes no hay a dónde', () => {
    expect(moveResource(base.resources, 'reagents', -1)).toBeUndefined();
    expect(moveResource(base.resources, 'materials', 1)).toBeUndefined();
  });

  it('salta las columnas ocultas y no las mueve de lugar', () => {
    const hidden = setResourceShown(base.resources, 'equipment', false) ?? [];
    expect(kinds(moveResource(hidden, 'reagents', 1))).toEqual(['materials', 'equipment', 'reagents']);
    expect(moveResource(hidden, 'equipment', 1)).toBeUndefined();
  });

  it('el orden nuevo es el que se publica', () => {
    const resources = moveResource(base.resources, 'materials', -1) ?? [];
    const order = publishPayload({ ...base, resources }).layout.resources.map((resource) => resource.kind);
    expect(order).toEqual(['reagents', 'materials', 'equipment']);
  });
});

describe('firmas', () => {
  it('caben hasta tres y al menos una queda', () => {
    const three = addSignature(base.signatures);
    expect(three).toHaveLength(3);
    expect(three && addSignature(three)).toBeUndefined();
    expect(removeSignature([{ id: 'a', label: 'Docente', requester: false }], 'a')).toBeUndefined();
    expect(removeSignature(base.signatures, 'signature-0')).toHaveLength(1);
  });

  it('marcar la firma del solicitante desmarca la otra', () => {
    const next = setRequester(base.signatures, 'signature-0', true);
    expect(next.map((signature) => signature.requester)).toEqual([true, false]);
  });

  it('desmarcarla no toca la otra', () => {
    expect(setRequester(base.signatures, 'signature-1', false).map((signature) => signature.requester)).toEqual([false, false]);
  });
});
