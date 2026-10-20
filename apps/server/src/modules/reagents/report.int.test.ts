import { describe, expect, it } from 'vitest';
import {
  issueResponse,
  operationFacets,
  operationList,
  operationTotals,
  type Operation,
  positionList,
  reagentsSummary,
} from '@platlab/contracts';
import { download } from '../../testing/api.js';
import { addMember, setModuleStatus, uniqueSuffix } from '../../testing/core-fixtures.js';
import { readZipEntry } from '../../testing/zip.js';
import {
  admin,
  call,
  count,
  errorCode,
  type Lab,
  createLab,
  createProduct,
  receive,
  receivedPosition,
} from './reagents.fixtures.js';

describe('R-01C · Movimientos como informe (ADR 0014)', () => {
  /** Recorre el libro entero, de dos en dos asientos, con los mismos filtros. */
  async function walk(subject: string, base: string, search = ''): Promise<Operation[]> {
    const items: Operation[] = [];
    let cursor: string | null = null;
    do {
      const url: string = `${base}/operations?limit=2${search ? `&${search}` : ''}${cursor ? `&cursor=${cursor}` : ''}`;
      const response = await call(subject, url);
      expect(response.status).toBe(200);
      const page = operationList.parse(response.body);
      items.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    return items;
  }

  const facetsOf = async (subject: string, lab: Lab, search = '') => {
    const response = await call(subject, `${lab.base}/operations/facets${search ? `?${search}` : ''}`);
    expect(response.status).toBe(200);
    return operationFacets.parse(response.body);
  };

  const totalsOf = async (subject: string, lab: Lab, search: string) => {
    const response = await call(subject, `${lab.base}/operations/totals?${search}`);
    expect(response.status).toBe(200);
    return operationTotals.parse(response.body);
  };

  const counts = <T extends { count: number }>(options: T[], key: (option: T) => string | null) =>
    Object.fromEntries(options.map((option) => [key(option), option.count]));

  /**
   * Un libro con dos reactivos de unidades distintas. A (g): ingreso de 100 del Operador, salida
   * directa de 0,1 del Administrador, salida de 0,2 pedida por el Operador y aprobada por el
   * Administrador, y ajuste de −0,5. B (mL): ingreso de 50 del Administrador y su traslado al otro
   * almacén (dos asientos). Siete asientos en total.
   */
  async function reportLab() {
    const lab = await createLab();
    const a = await createProduct(lab);
    const b = await createProduct(lab, 'mL', 'Etanol');
    const aPosition = receivedPosition(await receive(lab, a.id, '100'));
    const bReceipt = await receive(lab, b.id, '50', lab.storage, lab.adminMember.subject, { unit: 'mL' });
    expect(bReceipt.status).toBe(201);
    const bPosition = receivedPosition(bReceipt);
    const direct = await call(lab.adminMember.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { positionId: aPosition, quantity: '0.1', unit: 'g', reason: 'Práctica', destination: 'Laboratorio 1' },
    });
    expect(issueResponse.parse(direct.body).status).toBe('done');
    const requested = issueResponse.parse(
      (
        await call(lab.operator.subject, `${lab.base}/issues`, {
          method: 'POST',
          body: { positionId: aPosition, quantity: '0.2', unit: 'g', reason: 'Docencia', destination: 'Laboratorio 2' },
        })
      ).body,
    );
    if (requested.status !== 'pending') throw new Error('se esperaba una solicitud');
    expect(
      (await call(lab.adminMember.subject, `${lab.base}/issue-requests/${requested.requestId}/approve`, { method: 'POST' })).status,
    ).toBe(201);
    const adjusted = await call(lab.adminMember.subject, `${lab.base}/adjustments`, {
      method: 'POST',
      body: { positionId: aPosition, quantity: '-0.5', unit: 'g', reason: 'Conteo' },
    });
    expect(adjusted.status).toBe(201);
    const moved = await call(lab.adminMember.subject, `${lab.base}/transfers`, {
      method: 'POST',
      body: { positionId: bPosition, locationId: lab.otherStorage },
    });
    expect(moved.status).toBe(201);
    return { lab, a, b };
  }

  /** Fija la fecha de las operaciones de un reactivo, como dueño: el runtime no puede retrofechar. */
  const backdate = (productId: string, type: string, at: string) =>
    admin.query(
      `update inventory.operations as o set effective_at = $3::timestamptz
        where o.type = $2 and exists (
          select 1 from inventory.entries e join inventory.positions p on p.workspace_id = e.workspace_id and p.id = e.position_id
           where e.workspace_id = o.workspace_id and e.operation_id = o.id and p.item_id = $1)`,
      [productId, type, at],
    );

  it('varios tipos en parámetros repetidos; un tipo suelto y los días siguen igual', async () => {
    const { lab } = await reportLab();
    const subject = lab.operator.subject;
    const several = await walk(subject, lab.base, 'type=issue&type=adjustment');
    expect(several.map((item) => item.type).sort()).toEqual(['adjustment', 'issue', 'issue']);
    expect((await walk(subject, lab.base, 'type=issue')).map((item) => item.quantity).sort()).toEqual(['-0.1', '-0.2']);
    expect(await walk(subject, lab.base, 'days=30')).toHaveLength(7);
    // Un valor repetido cuenta una vez; un tipo desconocido es un error de datos.
    expect(await walk(subject, lab.base, 'type=issue&type=issue')).toHaveLength(2);
    const unknown = await call(subject, `${lab.base}/operations?type=issue&type=baja`);
    expect(unknown.status).toBe(400);
    expect(errorCode(unknown.body)).toBe('VALIDATION_FAILED');
  });

  it('desde–hasta son días civiles del espacio: las 23:30 del último día entran y las 00:00 del siguiente no', async () => {
    const { lab, a, b } = await reportLab();
    // America/Guayaquil es UTC−5 todo el año.
    await backdate(a.id, 'receipt', '2026-03-10T23:30:00-05:00');
    await backdate(b.id, 'receipt', '2026-03-11T00:00:00-05:00');
    const subject = lab.adminMember.subject;
    const tenth = await walk(subject, lab.base, 'from=2026-03-10&to=2026-03-10');
    expect(tenth.map((item) => [item.product.id, item.type])).toEqual([[a.id, 'receipt']]);
    const eleventh = await walk(subject, lab.base, 'from=2026-03-11&to=2026-03-11');
    expect(eleventh.map((item) => [item.product.id, item.type])).toEqual([[b.id, 'receipt']]);
    expect(await walk(subject, lab.base, 'from=2026-03-01&to=2026-03-31')).toHaveLength(2);
    // Un extremo solo: desde el día 11 entra todo lo de hoy, y hasta el 10 solo el ingreso de A.
    expect(await walk(subject, lab.base, 'from=2026-03-11')).toHaveLength(6);
    expect(await walk(subject, lab.base, 'to=2026-03-10')).toHaveLength(1);
    expect((await facetsOf(subject, lab, 'from=2026-03-10&to=2026-03-10')).total).toBe(1);
    expect((await totalsOf(subject, lab, 'groupBy=product&from=2026-03-11&to=2026-03-11')).groups.map((group) => group.key)).toEqual([b.id]);

    for (const search of ['from=2026-03-11&to=2026-03-10', 'days=30&from=2026-03-10', 'days=7&to=2026-03-10', 'from=2026-02-30']) {
      for (const path of ['operations', 'operations/facets', 'operations/totals?groupBy=product']) {
        const response = await call(subject, `${lab.base}/${path}${path.includes('?') ? '&' : '?'}${search}`);
        expect({ search, path, status: response.status }).toEqual({ search, path, status: 400 });
        expect(errorCode(response.body)).toBe('VALIDATION_FAILED');
      }
    }
  });

  it('el responsable es quien pidió la salida; si no hubo solicitud, quien la registró', async () => {
    const { lab } = await reportLab();
    const operator = await walk(lab.adminMember.subject, lab.base, `responsibleId=${lab.operator.principalId}`);
    expect(operator.map((item) => [item.type, item.quantity]).sort()).toEqual([
      ['issue', '-0.2'],
      ['receipt', '100'],
    ]);
    const administrator = await walk(lab.adminMember.subject, lab.base, `responsibleId=${lab.adminMember.principalId}&type=issue`);
    expect(administrator.map((item) => item.quantity)).toEqual(['-0.1']);

    const facets = await facetsOf(lab.adminMember.subject, lab);
    expect(counts(facets.responsibles, (option) => option.principalId)).toEqual({
      [lab.operator.principalId]: 2,
      [lab.adminMember.principalId]: 5,
    });
    expect(facets.responsibles.map((option) => option.displayName)).toEqual(['Administradora', 'Operador']);
    const totals = await totalsOf(lab.adminMember.subject, lab, 'groupBy=responsible&type=issue');
    expect(totals.groups.map((group) => [group.key, group.label, group.rows[0]?.issues])).toEqual([
      [lab.adminMember.principalId, 'Administradora', '-0.1'],
      [lab.operator.principalId, 'Operador', '-0.2'],
    ]);
  });

  it('quien pertenece a dos espacios solo ve lo de A desde A, aunque pida un reactivo de B', async () => {
    const { lab, a, b } = await reportLab();
    const other = await reportLab();
    const shared = `shared-${uniqueSuffix()}`;
    await addMember(admin, lab.workspace.id, { subject: shared, roles: [{ role: 'admin' }] });
    await addMember(admin, other.lab.workspace.id, { subject: shared, roles: [{ role: 'admin' }] });
    const sharedFacets = await facetsOf(shared, lab, `productId=${other.a.id}`);
    expect(sharedFacets.total).toBe(0);
    expect(sharedFacets.products.options.map((option) => option.id).sort()).toEqual([a.id, b.id].sort());
    expect(sharedFacets.responsibles.map((option) => option.principalId)).not.toContain(other.lab.adminMember.principalId);
    expect(sharedFacets.locations.map((option) => option.id)).not.toContain(other.lab.storage);
    const sharedTotals = await totalsOf(shared, lab, 'groupBy=product');
    expect(sharedTotals.groups.map((group) => group.key).sort()).toEqual([a.id, b.id].sort());
    expect(await walk(shared, lab.base, `productId=${other.a.id}`)).toEqual([]);
  });

  it('cada grupo cuenta con los demás filtros; lo elegido sin resultados sigue en cero; el total cuadra con la lista', async () => {
    const { lab, a } = await reportLab();
    const subject = lab.operator.subject;
    const issues = await facetsOf(subject, lab, 'type=issue');
    expect(issues.total).toBe(2);
    // Marcar «Salidas» sigue contando los demás tipos...
    expect(counts(issues.types, (option) => option.value)).toEqual({ receipt: 2, issue: 2, adjustment: 1, transfer: 2 });
    // ...y los demás grupos ya cuentan solo salidas.
    expect(issues.products).toEqual({ options: [expect.objectContaining({ id: a.id, count: 2 })], more: false });
    expect(counts(issues.destinations, (option) => option.value)).toEqual({ 'Laboratorio 1': 1, 'Laboratorio 2': 1 });
    expect(counts(issues.reasons, (option) => option.value)).toEqual({ Práctica: 1, Docencia: 1 });
    expect(counts(issues.locations, (option) => option.id)).toEqual({ [lab.storage]: 2 });

    // Sin filtros: los grupos ordenados por conteo y luego por nombre.
    const all = await facetsOf(subject, lab);
    expect(all.total).toBe(7);
    expect(all.types.map((option) => [option.value, option.count])).toEqual([
      ['issue', 2],
      ['receipt', 2],
      ['transfer', 2],
      ['adjustment', 1],
    ]);
    expect(all.reasons.map((option) => option.value)).toEqual(['Conteo', 'Docencia', 'Práctica']);

    const empty = await facetsOf(subject, lab, `type=issue&destination=${encodeURIComponent('Sin uso')}`);
    expect(empty.total).toBe(0);
    expect(empty.destinations).toEqual([
      { value: 'Laboratorio 1', count: 1 },
      { value: 'Laboratorio 2', count: 1 },
      { value: 'Sin uso', count: 0 },
    ]);
    const unused = await facetsOf(subject, lab, `type=receipt&reason=Conteo`);
    expect(unused.reasons).toEqual([{ value: 'Conteo', count: 0 }]);
    expect(unused.types.find((option) => option.value === 'receipt')).toEqual({ value: 'receipt', count: 0 });

    // Búsqueda dentro del grupo de reactivos: por código o nombre, sin distinguir mayúsculas.
    const search = await facetsOf(subject, lab, `productQuery=${encodeURIComponent(a.code.toLowerCase())}`);
    expect(search.products.options.map((option) => option.id)).toEqual([a.id]);

    for (const filters of [
      '',
      'type=issue',
      'type=issue&type=adjustment',
      `responsibleId=${lab.operator.principalId}&type=receipt&type=issue`,
      `destination=${encodeURIComponent('Laboratorio 1')}&destination=${encodeURIComponent('Laboratorio 2')}`,
      `reason=Conteo&locationId=${lab.storage}`,
      `productId=${a.id}&days=7`,
    ]) {
      const facets = await facetsOf(subject, lab, filters);
      expect({ filters, total: facets.total }).toEqual({ filters, total: (await walk(subject, lab.base, filters)).length });
    }
  });

  it('los totales son exactos, por reactivo y unidad, y un traslado se cuenta sin sumar cantidad', async () => {
    const { lab, a, b } = await reportLab();
    const subject = lab.adminMember.subject;
    const issues = await totalsOf(subject, lab, 'groupBy=product&type=issue');
    expect(issues).toEqual({
      groupBy: 'product',
      truncated: false,
      groups: [
        {
          key: a.id,
          label: a.name,
          count: 2,
          rows: [
            {
              product: { id: a.id, code: a.code, name: a.name },
              unit: 'g',
              count: 2,
              receipts: null,
              issues: '-0.3',
              adjustments: null,
              net: '-0.3',
              transfers: 0,
            },
          ],
        },
      ],
    });

    const byProduct = await totalsOf(subject, lab, 'groupBy=product');
    expect(byProduct.groups.map((group) => [group.key, group.count, group.rows])).toEqual([
      [a.id, 4, [expect.objectContaining({ unit: 'g', receipts: '100', issues: '-0.3', adjustments: '-0.5', net: '99.2', transfers: 0 })]],
      [b.id, 3, [expect.objectContaining({ unit: 'mL', receipts: '50', issues: null, adjustments: null, net: '50', transfers: 1 })]],
    ]);
    // El neto cuadra con el saldo de los frascos.
    const positions = positionList.parse((await call(subject, `${lab.base}/positions`)).body).items;
    expect(positions.find((position) => position.product.id === a.id)?.balance).toBe('99.2');

    // Sin destino forma su propio grupo; ninguna fila mezcla reactivos ni unidades.
    const byDestination = await totalsOf(subject, lab, 'groupBy=destination');
    expect(byDestination.groups.map((group) => [group.key, group.label, group.count])).toEqual([
      [null, 'Sin destino', 5],
      ['Laboratorio 1', 'Laboratorio 1', 1],
      ['Laboratorio 2', 'Laboratorio 2', 1],
    ]);
    const unknown = byDestination.groups[0]!;
    expect(unknown.rows.map((row) => [row.product.id, row.unit, row.count, row.net, row.transfers])).toEqual([
      [b.id, 'mL', 3, '50', 1],
      [a.id, 'g', 2, '99.5', 0],
    ]);
    for (const group of [...byProduct.groups, ...byDestination.groups]) {
      expect(new Set(group.rows.map((row) => row.product.id)).size).toBe(group.rows.length);
      expect(group.rows.reduce((sum, row) => sum + row.count, 0)).toBe(group.count);
    }

    // El mes se corta en la zona del espacio: las 23:30 del 28 de febrero son febrero.
    await backdate(a.id, 'receipt', '2026-02-28T23:30:00-05:00');
    await backdate(b.id, 'receipt', '2026-03-01T00:00:00-05:00');
    const byMonth = await totalsOf(subject, lab, 'groupBy=month&type=receipt');
    expect(byMonth.groups.map((group) => [group.key, group.label, group.rows.map((row) => row.product.id)])).toEqual([
      ['2026-03', '2026-03', [b.id]],
      ['2026-02', '2026-02', [a.id]],
    ]);
  });

  it('los totales son del Administrador y del Propietario; el Operador ve los conteos, pero no los totales', async () => {
    const { lab } = await reportLab();
    const denied = await call(lab.operator.subject, `${lab.base}/operations/totals?groupBy=product`);
    expect(denied.status).toBe(403);
    expect(errorCode(denied.body)).toBe('ACCESS_DENIED');
    expect((await call(lab.operator.subject, `${lab.base}/operations/facets`)).status).toBe(200);
    for (const subject of [lab.adminMember.subject, lab.workspace.owner.subject]) {
      expect((await call(subject, `${lab.base}/operations/facets`)).status).toBe(200);
      expect((await call(subject, `${lab.base}/operations/totals?groupBy=month`)).status).toBe(200);
    }
    const outsider = await addMember(admin, lab.workspace.id);
    expect((await call(outsider.subject, `${lab.base}/operations/facets`)).status).toBe(403);
    expect((await call(lab.adminMember.subject, `${lab.base}/operations/totals`)).status).toBe(400);
    expect((await call(lab.adminMember.subject, `${lab.base}/operations/facets?limit=5`)).status).toBe(400);

    // La admisión de consulta sigue como hoy: en solo lectura se consulta; deshabilitado, no.
    await setModuleStatus(admin, lab.workspace.id, 'reagents', 'read_only');
    expect((await call(lab.adminMember.subject, `${lab.base}/operations/facets`)).status).toBe(200);
    expect((await call(lab.adminMember.subject, `${lab.base}/operations/totals?groupBy=product`)).status).toBe(200);
    await setModuleStatus(admin, lab.workspace.id, 'reagents', 'disabled');
    for (const path of ['operations/facets', 'operations/totals?groupBy=product']) {
      const response = await call(lab.adminMember.subject, `${lab.base}/${path}`);
      expect(response.status).toBe(403);
      expect(errorCode(response.body)).toBe('MODULE_UNAVAILABLE');
    }
  });

  it('el Resumen y la lista sin filtros nuevos devuelven lo mismo que antes', async () => {
    const { lab } = await reportLab();
    const list = operationList.parse((await call(lab.operator.subject, `${lab.base}/operations?limit=50`)).body);
    expect(list.items).toHaveLength(7);
    expect(list.items).toEqual(await walk(lab.operator.subject, lab.base));
    const summary = reagentsSummary.parse((await call(lab.operator.subject, `${lab.base}/summary`)).body);
    expect(summary.activity.map((item) => item.id)).toEqual(list.items.slice(0, 6).map((item) => item.entryId));
    expect(summary.trend?.points.reduce((sum, point) => sum + point.value, 0)).toBe(2);
  });

  describe('Excel de Movimientos (ADR 0021)', () => {
    const sheetOf = (bytes: Buffer) => readZipEntry(bytes, 'xl/worksheets/sheet1.xml');

    it('el Administrador descarga lo filtrado, con el encabezado, «Controlado» y en la auditoría', async () => {
      const { lab, a } = await reportLab();
      await admin.query('update reagents.products set controlled = true where workspace_id = $1 and item_id = $2', [lab.workspace.id, a.id]);
      const file = await download(lab.adminMember.subject, `${lab.base}/operations/export?type=issue`);
      expect(file.status).toBe(200);
      expect(file.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(file.headers['content-disposition']).toMatch(/^attachment; filename="movimientos-reactivos-\d{4}-\d{2}-\d{2}\.xlsx"$/);

      const sheet = sheetOf(file.bytes);
      expect(sheet).toContain('Filtros: Tipo: Salida');
      expect(sheet).toContain('Generado el');
      expect(sheet).toContain('Cloruro de sodio');
      expect(sheet).not.toContain('Etanol');
      // Cantidades con signo, como número exacto; la aprobada lleva a quien la pidió.
      expect(sheet).toContain('<v>-0.1</v>');
      expect(sheet).toContain('<v>-0.2</v>');
      expect(sheet).toContain('Docencia');
      expect(sheet).toContain('Operador');
      expect(sheet).toContain('>Sí<');
      // Seis filas de encabezado y dos salidas.
      expect(sheet).toContain('<row r="8">');
      expect(sheet).not.toContain('<row r="9">');

      expect(
        await count(
          `select count(*) as n from core.audit_events
            where workspace_id = $1 and action = 'reagents.movements.export' and (changes ->> 'rows')::int = 2`,
          [lab.workspace.id],
        ),
      ).toBe(1);
    });

    it('sin filtros sale todo el libro, también los traslados, y los nombres elegidos van en el encabezado', async () => {
      const { lab, b } = await reportLab();
      const all = sheetOf((await download(lab.adminMember.subject, `${lab.base}/operations/export`)).bytes);
      expect(all).toContain('Filtros: ninguno');
      expect(all).toContain('<row r="13">');
      expect(all).not.toContain('<row r="14">');
      const one = sheetOf((await download(lab.adminMember.subject, `${lab.base}/operations/export?productId=${b.id}&days=30`)).bytes);
      expect(one).toContain('Periodo: últimos 30 días · Reactivo: Etanol');
      expect(one).toContain('Traslado');
    });

    it('el Operador consulta e imprime, pero el Excel es un reporte del Administrador', async () => {
      const { lab } = await reportLab();
      const file = await download(lab.operator.subject, `${lab.base}/operations/export`);
      expect(file.status).toBe(403);
      expect(errorCode(JSON.parse(file.bytes.toString('utf8')))).toBe('ACCESS_DENIED');
    });

    it('un filtro inválido se rechaza antes de empezar; en solo lectura se exporta y deshabilitado no', async () => {
      const { lab } = await reportLab();
      expect((await download(lab.adminMember.subject, `${lab.base}/operations/export?type=baja`)).status).toBe(400);
      expect((await download(lab.adminMember.subject, `${lab.base}/operations/export?days=7&from=2026-01-01`)).status).toBe(400);
      await setModuleStatus(admin, lab.workspace.id, 'reagents', 'read_only');
      expect((await download(lab.adminMember.subject, `${lab.base}/operations/export`)).status).toBe(200);
      await setModuleStatus(admin, lab.workspace.id, 'reagents', 'disabled');
      expect((await download(lab.adminMember.subject, `${lab.base}/operations/export`)).status).toBe(403);
    });
  });
});
