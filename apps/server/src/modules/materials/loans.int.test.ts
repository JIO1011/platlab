import { beforeAll, describe, expect, it } from 'vitest';
import { loan as loanContract, loanList, materialDetail } from '@platlab/contracts';
import {
  admin,
  call,
  count,
  createMaterial,
  createMaterialsLab,
  errorCode,
  giveBack,
  lend,
  receivedPosition,
  reusableWithStock,
  stockOf,
  type MaterialsLab,
} from './materials.fixtures.js';

/** MA-01b (ADR 0025): vale de préstamo, devolución parcial, daños y pérdidas de Materiales por la API. */

let lab: MaterialsLab;
let other: MaterialsLab;

beforeAll(async () => {
  lab = await createMaterialsLab();
  other = await createMaterialsLab();
});

const open = async (quantity = '4', stock = '10') => {
  const { product, positionId } = await reusableWithStock(lab, stock);
  const response = await lend(lab, [{ positionId, quantity }]);
  expect(response.status).toBe(201);
  return { product, positionId, loan: loanContract.parse(response.body) };
};

const availability = async (productId: string) =>
  materialDetail.parse((await call(lab.operator.subject, `${lab.base}/products/${productId}`)).body);

describe('prestar', () => {
  it('numera los vales por espacio y deja el saldo intacto con lo prestado fuera de lo disponible', async () => {
    const fresh = await createMaterialsLab();
    const { positionId, product } = await reusableWithStock(fresh, '10');
    const first = loanContract.parse((await lend(fresh, [{ positionId, quantity: '4' }])).body);
    const second = loanContract.parse((await lend(fresh, [{ positionId, quantity: '1' }])).body);
    expect([first.code, second.code]).toEqual(['P-0001', 'P-0002']);
    expect(first.status).toBe('open');
    expect(first.borrower.id).toBe(fresh.teacher.principalId);
    expect(first.lines[0]).toMatchObject({ quantity: '4', outstanding: '4', returned: '0' });
    const detail = materialDetail.parse((await call(fresh.operator.subject, `${fresh.base}/products/${product.id}`)).body);
    expect(detail.balance).toBe('10');
    expect(detail.available).toBe('5');
    expect((await stockOf(fresh, product.id))[0]).toMatchObject({ balance: '10', available: '5' });
  });

  it('no presta más de lo disponible y no deja nada a medias', async () => {
    const { positionId } = await reusableWithStock(lab, '3');
    const before = await count('select count(*) as n from materials.loans where workspace_id = $1', [lab.workspace.id]);
    const response = await lend(lab, [{ positionId, quantity: '4' }]);
    expect(response.status).toBe(409);
    expect(errorCode(response.body)).toBe('INSUFFICIENT_STOCK');
    expect(await count('select count(*) as n from materials.loans where workspace_id = $1', [lab.workspace.id])).toBe(before);
  });

  it('una salida o un ajuste nunca dejan el saldo bajo lo prestado', async () => {
    const { positionId } = await open('4', '10');
    const issue = await call(lab.operator.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { positionId, quantity: '7', unit: 'u', reason: 'Práctica', destination: 'Laboratorio 1' },
    });
    expect(issue.status).toBe(409);
    const adjustment = await call(lab.adminMember.subject, `${lab.base}/adjustments`, {
      method: 'POST',
      body: { positionId, quantity: '-7', unit: 'u', reason: 'Conteo' },
    });
    expect(adjustment.status).toBe(409);
  });

  it('solo presta reutilizables por cantidad', async () => {
    const consumable = await createMaterial(lab);
    const positionId = await receivedPosition(lab, consumable.id, '10');
    const response = await lend(lab, [{ positionId, quantity: '1' }]);
    expect(response.status).toBe(400);
  });

  it('el prestatario es un miembro activo del espacio y la fecha no es pasada', async () => {
    const { positionId } = await reusableWithStock(lab);
    const foreign = await lend(lab, [{ positionId, quantity: '1' }], { borrowerId: other.teacher.principalId });
    expect(foreign.status).toBe(400);
    const past = await lend(lab, [{ positionId, quantity: '1' }], { dueOn: '2020-01-01' });
    expect(past.status).toBe(400);
    const ok = await lend(lab, [{ positionId, quantity: '1' }], { dueOn: '2999-01-01', notes: 'Práctica de química' });
    expect(ok.status).toBe(201);
  });

  it('prestar y devolver son del Operador y el Administrador; el Docente no', async () => {
    const { positionId } = await reusableWithStock(lab);
    expect((await lend(lab, [{ positionId, quantity: '1' }], {}, lab.teacher.subject)).status).toBe(403);
    expect((await call(lab.teacher.subject, `${lab.base}/loans`)).status).toBe(403);
    expect((await lend(lab, [{ positionId, quantity: '1' }], {}, lab.adminMember.subject)).status).toBe(201);
  });

  it('un espacio no ve ni mueve los préstamos de otro', async () => {
    const { loan } = await open();
    expect((await call(other.adminMember.subject, `${other.base}/loans/${loan.id}`)).status).toBe(404);
    expect((await giveBack(other, loan.id, loan.version, [{ line: 1, good: '1' }], other.operator.subject)).status).toBe(404);
    const list = loanList.parse((await call(other.adminMember.subject, `${other.base}/loans`)).body);
    expect(list.items.some((item) => item.id === loan.id)).toBe(false);
  });
});

describe('devolver', () => {
  it('una devolución parcial libera lo devuelto y deja el vale abierto', async () => {
    const { product, loan } = await open('4', '10');
    const response = await giveBack(lab, loan.id, loan.version, [{ line: 1, good: '1' }]);
    expect(response.status).toBe(200);
    const updated = loanContract.parse(response.body);
    expect(updated.status).toBe('open');
    expect(updated.version).toBe(loan.version + 1);
    expect(updated.lines[0]).toMatchObject({ returned: '1', outstanding: '3' });
    expect(updated.outstandingLines).toBe(1);
    expect((await availability(product.id)).available).toBe('7');
  });

  it('lo dañado y lo perdido dan de baja con un ajuste y el vale se cierra al no faltar nada', async () => {
    const { product, positionId, loan } = await open('4', '10');
    const response = await giveBack(lab, loan.id, loan.version, [{ line: 1, good: '2', damaged: '1', lost: '1', note: 'Se rompió en la práctica' }]);
    expect(response.status).toBe(200);
    const closed = loanContract.parse(response.body);
    expect(closed.status).toBe('closed');
    expect(closed.closedAt).not.toBeNull();
    expect(closed.hasDebt).toBe(true);
    expect(closed.lines[0]).toMatchObject({ returned: '2', damaged: '1', lost: '1', outstanding: '0' });
    const detail = await availability(product.id);
    expect(detail.balance).toBe('8');
    expect(detail.available).toBe('8');
    const writeOffs = await admin.query<{ reason: string; quantity: string }>(
      `select o.reason, e.quantity::text as quantity
         from inventory.entries e join inventory.operations o on o.workspace_id = e.workspace_id and o.id = e.operation_id
        where e.position_id = $1 and o.type = 'adjustment' order by o.reason`,
      [positionId],
    );
    expect(writeOffs.rows.map((row) => row.reason)).toEqual([`Dañado en el préstamo ${closed.code}`, `Perdido en el préstamo ${closed.code}`]);
    expect(await count('select count(*) as n from materials.return_lines where loan_line_id in (select id from materials.loan_lines where loan_id = $1)', [loan.id])).toBe(3);
  });

  it('rechaza devolver de más, una versión vieja, una línea inexistente y un vale cerrado', async () => {
    const { loan } = await open('2', '10');
    expect((await giveBack(lab, loan.id, loan.version, [{ line: 1, good: '3' }])).status).toBe(400);
    expect((await giveBack(lab, loan.id, loan.version, [{ line: 9, good: '1' }])).status).toBe(400);
    expect((await giveBack(lab, loan.id, loan.version, [{ line: 1 }])).status).toBe(400);
    const stale = await giveBack(lab, loan.id, loan.version + 5, [{ line: 1, good: '1' }]);
    expect(stale.status).toBe(409);
    expect(errorCode(stale.body)).toBe('VERSION_CONFLICT');
    const done = loanContract.parse((await giveBack(lab, loan.id, loan.version, [{ line: 1, good: '2' }])).body);
    expect(done.status).toBe('closed');
    expect((await giveBack(lab, loan.id, done.version, [{ line: 1, good: '1' }])).status).toBe(400);
  });
});

describe('listado y estado', () => {
  it('filtra abiertos, atrasados y cerrados, y pagina de más nuevo a más viejo', async () => {
    const fresh = await createMaterialsLab();
    const { positionId } = await reusableWithStock(fresh, '10');
    const loans = [];
    for (let i = 0; i < 3; i += 1) loans.push(loanContract.parse((await lend(fresh, [{ positionId, quantity: '1' }])).body));
    // El plazo vencido no se puede pedir por la API (la fecha no es pasada): se simula como lo haría el paso del tiempo.
    await admin.query(`update materials.loans set due_on = current_date - 2 where id = $1`, [loans[0]!.id]);
    await giveBack(fresh, loans[2]!.id, loans[2]!.version, [{ line: 1, good: '1' }]);
    const get = async (query: string) => loanList.parse((await call(fresh.operator.subject, `${fresh.base}/loans${query}`)).body);
    expect((await get('?filter=overdue')).items.map((item) => item.id)).toEqual([loans[0]!.id]);
    expect((await get('?filter=closed')).items.map((item) => item.id)).toEqual([loans[2]!.id]);
    expect((await get('?filter=open')).items).toHaveLength(2);
    expect((await get('?borrowerId=' + fresh.teacher.principalId)).items).toHaveLength(3);
    const first = await get('?limit=2');
    expect(first.items.map((item) => item.number)).toEqual([3, 2]);
    const next = await get(`?limit=2&cursor=${first.nextCursor}`);
    expect(next.items.map((item) => item.number)).toEqual([1]);
    expect(next.nextCursor).toBeNull();
    expect(first.items[1]!.overdue).toBe(false);
    expect((await get('?filter=overdue')).items[0]!.overdue).toBe(true);
  });

  it('los miembros activos son los prestatarios posibles', async () => {
    const response = await call(lab.operator.subject, `${lab.base}/borrowers`);
    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).toContain(lab.teacher.principalId);
  });
});

describe('concurrencia y auditoría', () => {
  it('dos préstamos simultáneos por lo mismo: solo uno alcanza', async () => {
    const { positionId, product } = await reusableWithStock(lab, '10');
    const results = await Promise.all([lend(lab, [{ positionId, quantity: '6' }]), lend(lab, [{ positionId, quantity: '6' }])]);
    expect(results.map((response) => response.status).sort()).toEqual([201, 409]);
    expect((await availability(product.id)).available).toBe('4');
  });

  it('dos devoluciones simultáneas del mismo vale: una aplica y la otra ve el vale cambiado', async () => {
    const { loan, product } = await open('4', '10');
    const results = await Promise.all([
      giveBack(lab, loan.id, loan.version, [{ line: 1, good: '4' }]),
      giveBack(lab, loan.id, loan.version, [{ line: 1, good: '4' }]),
    ]);
    expect(results.map((response) => response.status).sort()).toEqual([200, 409]);
    expect((await availability(product.id)).available).toBe('10');
  });

  it('préstamos de varios vales a la vez no se entrelazan ni repiten número', async () => {
    const fresh = await createMaterialsLab();
    const a = await reusableWithStock(fresh, '20');
    const b = await reusableWithStock(fresh, '20');
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        lend(fresh, index % 2 === 0 ? [{ positionId: a.positionId, quantity: '1' }, { positionId: b.positionId, quantity: '1' }] : [{ positionId: b.positionId, quantity: '1' }, { positionId: a.positionId, quantity: '1' }]),
      ),
    );
    expect(results.map((response) => response.status)).toEqual(Array(6).fill(201));
    const numbers = results.map((response) => loanContract.parse(response.body).number).sort((x, y) => x - y);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('deja una fila de auditoría por préstamo y por devolución', async () => {
    const audits = await admin.query<{ action: string }>('select action from core.audit_events where workspace_id = $1', [lab.workspace.id]);
    const actions = new Set(audits.rows.map((row) => row.action));
    expect(actions.has('materials.loan.create')).toBe(true);
    expect(actions.has('materials.loan.return')).toBe(true);
  });
});
