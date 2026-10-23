import { FORM_OPTIONAL_KEYS, FORM_STANDARD_LAYOUT, REQUEST_MAX_DATES, saveRequestRequest, type FormLayout, type LabsRequest } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { fieldsOf } from './form-draft';
import { canAddDate, draftFrom, fieldKey, groupsOf, missingKeys, paperOf, saveBody, totalOf, valueText, viewOf, withDate, withoutDate, type RequestDraft } from './request-draft';

const reagentId = '5b2c7a10-1f3e-4a6b-8c9d-0e1f2a3b4c5d';
const assetTypeId = '7c3d8b21-2a4f-4b7c-9dae-1f2a3b4c5d6e';
const areaId = '9d4e9c32-3b5a-4c8d-a1bf-2a3b4c5d6e7f';

const request: LabsRequest = {
  id: '0d8f6d4e-6a8c-4f4e-9d0b-3f1d2b5a7c11',
  number: 42,
  code: 'SOL-0042',
  status: 'draft',
  formName: 'Práctica académica',
  title: 'Titulación ácido-base',
  requesterName: 'Ana Paz',
  firstDate: '2026-11-02',
  dateCount: 2,
  late: false,
  exceptions: 0,
  submittedAt: null,
  version: 3,
  formId: '3f1d2b5a-7c11-4d8f-8d4e-6a8c4f4e9d0b',
  formRevision: 2,
  formTitle: 'Solicitud de laboratorio',
  documentCode: 'FOR-LAB-01',
  layout: FORM_STANDARD_LAYOUT,
  teacherName: ' Ana Paz ',
  activityType: 'practice',
  subject: 'Química analítica',
  career: 'Ingeniería química',
  dates: ['2026-11-05', '2026-11-02', '2026-11-05'],
  startsAt: '08:00',
  endsAt: '10:00',
  participants: 24,
  groups: 3,
  areaId,
  answers: { colaborador: 'Luis Mora', practica_n: 3, otro: 'ya no se presenta' },
  notes: 'Traer bata',
  lines: [
    { kind: 'reagent', itemId: reagentId, name: 'Ácido clorhídrico', quantity: '2.500', unit: 'mL', check: 'ok', available: '500' },
    { kind: 'reagent', itemId: null, name: 'Buffer', quantity: '10', unit: 'g', check: 'unverified', available: null },
    { kind: 'equipment', assetTypeId, name: 'Balanza', perGroup: 2, quantity: 6, check: 'short', available: 4 },
    { kind: 'material', name: 'Papel filtro', perGroup: '0.5', quantity: '1.5', check: 'unverified' },
  ],
  events: [],
  mine: true,
};

const draftOf = (layout: FormLayout = FORM_STANDARD_LAYOUT, patch: Partial<LabsRequest> = {}) => draftFrom(viewOf({ ...request, layout, ...patch }));

type Row = FormLayout['rows'][number];

/** La hoja sin los datos de esas claves; una fila que se queda sin datos desaparece. */
const withoutKeys = (layout: FormLayout, keys: readonly string[]): FormLayout => ({
  ...layout,
  rows: layout.rows.flatMap((row): Row[] => {
    if (row.kind === 'section') return [row];
    const fields = row.fields.filter((field) => !keys.includes(field.key));
    return fields.length > 0 ? [{ ...row, fields }] : [];
  }),
});

/** La hoja sin los datos del sistema que se pueden quitar y sin Observaciones. */
const bareLayout: FormLayout = { ...withoutKeys(FORM_STANDARD_LAYOUT, FORM_OPTIONAL_KEYS), notes: false };

describe('ida y vuelta: borrador y SaveRequest', () => {
  it('lo que el servidor guardó vuelve igual, con la versión que se vio', () => {
    const body = saveBody(draftOf(), FORM_STANDARD_LAYOUT, 3);
    expect(body).toEqual({
      expectedVersion: 3,
      title: 'Titulación ácido-base',
      teacherName: 'Ana Paz',
      activityType: 'practice',
      subject: 'Química analítica',
      career: 'Ingeniería química',
      dates: ['2026-11-02', '2026-11-05'],
      startsAt: '08:00',
      endsAt: '10:00',
      participants: 24,
      groups: 3,
      areaId,
      answers: { colaborador: 'Luis Mora', curso_paralelo: null, practica_n: 3 },
      notes: 'Traer bata',
      lines: [
        { kind: 'reagent', itemId: reagentId, description: null, quantity: '2.500', unit: 'mL' },
        { kind: 'reagent', itemId: null, description: 'Buffer', quantity: '10', unit: 'g' },
        { kind: 'equipment', assetTypeId, description: null, perGroup: 2, quantity: 6 },
        { kind: 'material', description: 'Papel filtro', perGroup: '0.5', quantity: '1.5' },
      ],
    });
    expect(saveRequestRequest.safeParse(body).success).toBe(true);
  });

  it('las cantidades del borrador son texto con coma decimal', () => {
    const [reagent, , equipment, material] = draftOf().lines;
    expect(reagent).toMatchObject({ kind: 'reagent', catalog: true, quantity: '2,500' });
    expect(equipment).toMatchObject({ kind: 'equipment', byGroup: true, perGroup: '2', quantity: '6' });
    expect(material).toMatchObject({ kind: 'material', byGroup: true, perGroup: '0,5', quantity: '1,5' });
  });

  it('un borrador vacío se guarda con nulos y sin líneas', () => {
    const empty = draftOf(FORM_STANDARD_LAYOUT, {
      title: null,
      teacherName: null,
      activityType: null,
      subject: null,
      career: null,
      dates: [],
      startsAt: null,
      endsAt: null,
      participants: null,
      groups: 1,
      areaId: null,
      answers: {},
      notes: null,
      lines: [],
    });
    const body = saveBody(empty, FORM_STANDARD_LAYOUT, 1);
    expect(body).toMatchObject({ title: null, activityType: null, dates: [], participants: null, areaId: null, notes: null, lines: [] });
    expect(body.answers).toEqual({ colaborador: null, curso_paralelo: null, practica_n: null });
    expect(saveRequestRequest.safeParse(body).success).toBe(true);
  });
});

describe('lo que la revisión no presenta', () => {
  it('asignatura, carrera, tipo, grupos y Observaciones quedan fuera, y sin grupos es uno', () => {
    const body = saveBody(draftOf(bareLayout), bareLayout, 3);
    expect(body).toMatchObject({ activityType: null, subject: null, career: null, notes: null, groups: 1 });
    expect(saveRequestRequest.safeParse(body).success).toBe(true);
  });

  it('los datos del sistema esenciales y los libres presentados siguen', () => {
    const body = saveBody(draftOf(bareLayout), bareLayout, 3);
    expect(body).toMatchObject({ title: 'Titulación ácido-base', teacherName: 'Ana Paz', participants: 24, startsAt: '08:00' });
    expect(Object.keys(body.answers)).toEqual(['colaborador', 'curso_paralelo', 'practica_n']);
  });

  it('una respuesta de un dato libre que la hoja ya no tiene no se guarda', () => {
    const layout = withoutKeys(FORM_STANDARD_LAYOUT, ['colaborador']);
    expect(draftOf(layout).answers).not.toHaveProperty('colaborador');
    expect(saveBody(draftOf(layout), layout, 3).answers).toEqual({ curso_paralelo: null, practica_n: 3 });
  });

  it('sin grupos en la hoja, lo pedido por grupo es el total', () => {
    const body = saveBody(draftOf(bareLayout), bareLayout, 3);
    expect(body.lines.slice(2)).toEqual([
      { kind: 'equipment', assetTypeId, description: null, perGroup: 2, quantity: 2 },
      { kind: 'material', description: 'Papel filtro', perGroup: '0.5', quantity: '0.5' },
    ]);
  });
});

describe('total por grupo', () => {
  it('es lo pedido por grupo por los grupos, exacto y sin ceros de más', () => {
    expect(totalOf('2', 3)).toBe('6');
    expect(totalOf('0,25', 3)).toBe('0.75');
    expect(totalOf('1.5', 4)).toBe('6');
  });

  it('lo que no es una cantidad queda vacío', () => {
    expect(totalOf('', 3)).toBe('');
    expect(totalOf('abc', 3)).toBe('');
  });

  it('cambiar los grupos recalcula el total de las líneas por grupo', () => {
    const body = saveBody({ ...draftOf(), groups: '4' }, FORM_STANDARD_LAYOUT, 3);
    expect(body.groups).toBe(4);
    expect(body.lines.slice(2)).toEqual([
      { kind: 'equipment', assetTypeId, description: null, perGroup: 2, quantity: 8 },
      { kind: 'material', description: 'Papel filtro', perGroup: '0.5', quantity: '2' },
    ]);
  });

  it('los grupos salen del borrador solo si la revisión los presenta', () => {
    const value: RequestDraft = { ...draftOf(), groups: '5' };
    expect(groupsOf(value, FORM_STANDARD_LAYOUT)).toBe(5);
    expect(groupsOf(value, bareLayout)).toBe(1);
  });
});

describe('fechas', () => {
  it('el borrador las trae ordenadas y sin repetirse', () => {
    expect(draftOf().dates).toEqual(['2026-11-02', '2026-11-05']);
  });

  it('agregar una deja la lista ordenada y una repetida no cambia nada', () => {
    expect(withDate(['2026-11-05'], '2026-11-02')).toEqual(['2026-11-02', '2026-11-05']);
    expect(withDate(['2026-11-02', '2026-11-05'], '2026-11-05')).toEqual(['2026-11-02', '2026-11-05']);
  });

  it('quitar una deja las demás', () => {
    expect(withoutDate(['2026-11-02', '2026-11-05'], '2026-11-02')).toEqual(['2026-11-05']);
  });

  it('hay un máximo de fechas', () => {
    const dates = Array.from({ length: REQUEST_MAX_DATES }, (_, day) => `2026-12-${String(day + 1).padStart(2, '0')}`);
    expect(canAddDate(dates.slice(1))).toBe(true);
    expect(canAddDate(dates)).toBe(false);
  });
});

describe('la hoja de la solicitud', () => {
  it('lleva la revisión, el título y el código con que se llenó', () => {
    const paper = paperOf(viewOf(request));
    expect(paper).toMatchObject({ baseRevision: 2, title: 'Solicitud de laboratorio', documentCode: 'FOR-LAB-01' });
    expect(fieldsOf(paper.rows).map(fieldKey)).toContain('docente');
  });

  it('cada dato dice lo que se llenó, para leerlo en la hoja', () => {
    const paper = paperOf(viewOf(request));
    const text = Object.fromEntries(fieldsOf(paper.rows).map((field) => [fieldKey(field), valueText(field, draftOf(), FORM_STANDARD_LAYOUT)]));
    expect(text).toMatchObject({
      titulo: 'Titulación ácido-base',
      docente: 'Ana Paz',
      tipo: 'Práctica',
      asignatura: 'Química analítica',
      horario: '08:00 – 10:00',
      participantes: '24',
      grupos: '3',
      colaborador: 'Luis Mora',
      curso_paralelo: '',
      practica_n: '3',
    });
    expect(text['fecha']).toContain(',');
  });

  it('un dato sin llenar queda en blanco', () => {
    const empty = draftOf(FORM_STANDARD_LAYOUT, {
      title: null,
      teacherName: null,
      activityType: null,
      subject: null,
      career: null,
      dates: [],
      startsAt: null,
      endsAt: null,
      participants: null,
      answers: {},
    });
    const text = fieldsOf(paperOf(viewOf(request)).rows).map((field) => [fieldKey(field), valueText(field, empty, FORM_STANDARD_LAYOUT)]);
    // Los grupos siempre valen algo: lo demás queda en blanco.
    expect(text.filter(([, value]) => value !== '')).toEqual([['grupos', '3']]);
  });
});

describe('obligatorias vacías', () => {
  it('con todo lo esencial lleno no falta nada', () => {
    expect(missingKeys(draftOf(), FORM_STANDARD_LAYOUT).size).toBe(0);
  });

  it('un borrador vacío marca los cinco esenciales y no las opcionales', () => {
    const empty = draftOf(FORM_STANDARD_LAYOUT, { title: null, teacherName: null, dates: [], startsAt: null, endsAt: null, participants: null, subject: null, answers: {} });
    expect([...missingKeys(empty, FORM_STANDARD_LAYOUT)].sort()).toEqual(['docente', 'fecha', 'horario', 'participantes', 'titulo']);
  });

  it('el horario a medias cuenta como vacío', () => {
    expect(missingKeys({ ...draftOf(), endsAt: '' }, FORM_STANDARD_LAYOUT).has('horario')).toBe(true);
  });

  it('un dato libre obligatorio vacío se marca', () => {
    const layout: FormLayout = {
      ...FORM_STANDARD_LAYOUT,
      rows: FORM_STANDARD_LAYOUT.rows.map((row) =>
        row.kind === 'row' ? { ...row, fields: row.fields.map((field) => (field.key === 'colaborador' && 'type' in field ? { ...field, required: true } : field)) } : row,
      ),
    };
    const value = { ...draftOf(layout), answers: { colaborador: '  ' } };
    expect([...missingKeys(value, layout)]).toEqual(['colaborador']);
  });
});
