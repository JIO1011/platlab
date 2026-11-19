import { beforeAll, describe, expect, it } from 'vitest';
import { errorResponse, loan as loanContract, materialMovementList, materialMovementResponse, materialsReport, type MaterialMovement } from '@platlab/contracts';
import { download } from '../../testing/api.js';
import { readZipEntry } from '../../testing/zip.js';
import { call, createMaterial, createMaterialsLab, giveBack, lend, reusableWithStock, type MaterialsLab } from './materials.fixtures.js';

/** MA-01d (ADR 0025): el libro de Materiales, su Excel y el resumen por clase por la API. */

let lab: MaterialsLab;
let loanCode: string;

beforeAll(async () => {
  lab = await createMaterialsLab();
  const gloves = await createMaterial(lab, { name: 'Guantes de nitrilo M (caja ×100)', baseUnit: 'caja' });
  const receipt = await call(lab.operator.subject, `${lab.base}/receipts`, {
    method: 'POST',
    body: { productId: gloves.id, locationId: lab.shelf, quantity: '10', unit: 'caja', reference: 'Factura 001-002-2492' },
  });
  const positionId = materialMovementResponse.parse(receipt.body).positionId;
  const issue = await call(lab.operator.subject, `${lab.base}/issues`, {
    method: 'POST',
    body: { positionId, quantity: '3', unit: 'caja', purpose: 'clinic', detail: 'Exodoncia', requesterId: lab.teacher.principalId },
  });
  expect(issue.status).toBe(201);
  const beakers = await reusableWithStock(lab, '10', 'Vasos de precipitados 250 mL');
  const lent = loanContract.parse((await lend(lab, [{ positionId: beakers.positionId, quantity: '4' }])).body);
  loanCode = lent.code;
  const back = await giveBack(lab, lent.id, lent.version, [{ line: 1, good: '2', damaged: '1' }]);
  expect(back.status).toBe(200);
});

const movements = async (query = '') => {
  const response = await call(lab.operator.subject, `${lab.base}/movements${query}`);
  expect(response.status).toBe(200);
  return materialMovementList.parse(response.body);
};
const byKind = (items: MaterialMovement[], kind: MaterialMovement['kind']) => items.filter((item) => item.kind === kind);

describe('libro de Materiales', () => {
  it('reúne ingresos, salidas, préstamos, devoluciones y bajas, con signo y del más nuevo al más viejo', async () => {
    const { items } = await movements();
    expect(items.map((item) => item.kind).sort()).toEqual(['issue', 'loan', 'receipt', 'receipt', 'return', 'writeoff']);
    expect(items.map((item) => item.at)).toEqual([...items.map((item) => item.at)].sort().reverse());
    expect(byKind(items, 'issue')[0]).toMatchObject({ quantity: '-3', unit: 'caja', purpose: 'clinic', person: 'Docente', detail: 'Exodoncia', actor: 'Operador' });
    expect(byKind(items, 'loan')[0]).toMatchObject({ quantity: '-4', unit: 'u', reference: loanCode, person: 'Docente' });
    expect(byKind(items, 'return')[0]).toMatchObject({ quantity: '2', reference: loanCode, person: 'Docente' });
    expect(byKind(items, 'writeoff')[0]).toMatchObject({ quantity: '-1', outcome: 'damaged', reference: loanCode, person: 'Docente' });
    expect(items.find((item) => item.reference === 'Factura 001-002-2492')).toMatchObject({ kind: 'receipt', quantity: '10' });
  });

  it('filtra por movimiento, tipo de salida, periodo y búsqueda, y pagina sin repetir', async () => {
    expect((await movements('?kind=issue')).items).toHaveLength(1);
    expect((await movements('?purpose=clinic')).items).toHaveLength(1);
    expect((await movements('?purpose=practice')).items).toHaveLength(0);
    expect((await movements(`?q=${loanCode}`)).items.map((item) => item.kind).sort()).toEqual(['loan', 'return', 'writeoff']);
    expect((await movements('?q=factura')).items).toHaveLength(1);
    expect((await movements('?q=nitrilo')).items).toHaveLength(2);
    expect((await movements('?q=docen')).items).toHaveLength(4);
    expect((await movements('?from=2099-01-01')).items).toHaveLength(0);
    expect((await movements('?to=2000-01-01')).items).toHaveLength(0);
    expect((await call(lab.operator.subject, `${lab.base}/movements?from=2026-02-01&to=2026-01-01`)).status).toBe(400);

    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page = await movements(`?limit=4${cursor ? `&cursor=${cursor}` : ''}`);
      seen.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen).toHaveLength(6);
    expect(new Set(seen).size).toBe(6);
  });

  it('no muestra los movimientos de otro espacio', async () => {
    const other = await createMaterialsLab();
    const own = await call(other.operator.subject, `${other.base}/movements`);
    expect(materialMovementList.parse(own.body).items).toHaveLength(0);
    const response = await call(other.operator.subject, `${lab.base}/movements`);
    expect(response.status).toBe(403);
  });
});

describe('resumen por clase', () => {
  it('cuenta insumos y suma las piezas de los reutilizables: en el estante, prestadas y dadas de baja', async () => {
    const response = await call(lab.operator.subject, `${lab.base}/report`);
    expect(response.status).toBe(200);
    expect(materialsReport.parse(response.body)).toEqual({
      consumable: { materials: 1, belowMinimum: 0, expiring: 0, empty: 0 },
      reusable: { materials: 1, onShelf: '8', lent: '1', writtenOff: '1' },
    });
  });
});

describe('Excel del libro', () => {
  it('lo baja el Administrador con los filtros en el encabezado y la cantidad con signo', async () => {
    const file = await download(lab.adminMember.subject, `${lab.base}/movements/export?kind=issue`);
    expect(file.status).toBe(200);
    expect(file.headers['content-disposition']).toMatch(/^attachment; filename="libro-materiales-\d{4}-\d{2}-\d{2}\.xlsx"$/);
    const sheet = readZipEntry(file.bytes, 'xl/worksheets/sheet1.xml');
    expect(sheet).toContain('Filtros: Movimiento: Salida');
    expect(sheet).toContain('Exodoncia');
    expect(sheet).toContain('<v>-3</v>');
    expect(sheet).not.toContain('Vasos de precipitados');
  });

  it('el Operador no lo exporta', async () => {
    const file = await download(lab.operator.subject, `${lab.base}/movements/export`);
    expect(file.status).toBe(403);
    expect(errorResponse.parse(JSON.parse(file.bytes.toString('utf8'))).error.code).toBe('ACCESS_DENIED');
  });
});
