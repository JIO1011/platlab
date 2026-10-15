import { AppError } from '../../../platform/errors.js';
import {
  applyEntry,
  computeTare,
  ensureContainerPosition,
  findLocation,
  insertContainerPosition,
  insertContainers,
  insertOperation,
  lockContainerPositionAt,
  lockContainerStock,
  lockCountPosition,
  lockPosition,
  lockTransferPosition,
  reserveContainerSeqs,
  setContainerTare,
  takenContainerCode,
  weighPosition,
  type IInsertContainersParams,
} from '../infrastructure/inventory.queries.js';
import { openLot, type LotDetails } from './catalog.js';
import { pgViolation, type InventoryContext } from './context.js';

const notFound = () => new AppError('NOT_FOUND', 'Recurso no encontrado');

type OperationType = 'receipt' | 'issue' | 'adjustment' | 'transfer';

/** Posición bloqueada para un movimiento. */
export interface LockedPosition {
  id: string;
  baseUnit: string;
  movable: boolean;
}

export interface MovementResult {
  operationId: string;
  type: OperationType;
  positionId: string;
  appliedQuantity: string;
  balance: string;
  unit: string;
  effectiveAt: string;
}

/** En R-00 se opera en la unidad base, sin conversiones (primer incremento). */
function requireBaseUnit(unit: string, baseUnit: string): void {
  if (unit !== baseUnit) {
    throw new AppError('VALIDATION_FAILED', `Unidad incompatible: el producto se registra en ${baseUnit}`);
  }
}

/**
 * Tara de un frasco (ADR 0015): su peso en g con `quantity` dentro, calculado en la base. Devuelve
 * también la densidad que se guarda con ella (null en masa).
 */
async function tareFor(
  ctx: InventoryContext,
  input: { grossWeight: string; quantity: string; unit: string; density: string | null },
): Promise<{ tare: string; density: string | null }> {
  const [row] = await computeTare.run(input, ctx.client);
  if (!row?.tare) {
    throw new AppError(
      'VALIDATION_FAILED',
      row?.dimension === 'volume' ? 'Indica la densidad para calcular la tara' : 'Esta unidad no admite control por peso',
    );
  }
  if (!row.positive) throw new AppError('VALIDATION_FAILED', 'El peso no alcanza para el contenido: la tara sería cero o menos');
  return { tare: row.tare, density: row.density };
}

/**
 * Inserta los frascos; si un código ya existe en el espacio (containers_code), vuelve al punto previo
 * para averiguar cuál, porque bajo RLS el error no muestra la clave, y responde CODE_TAKEN. La
 * transacción entera se revierte después: nada queda a medias.
 */
async function insertCodedContainers(ctx: InventoryContext, params: IInsertContainersParams) {
  await ctx.client.query('SAVEPOINT container_codes');
  try {
    return await insertContainers.run(params, ctx.client);
  } catch (error) {
    const violation = pgViolation(error);
    if (violation?.code !== '23505' || violation.constraint !== 'containers_code') throw error;
    await ctx.client.query('ROLLBACK TO SAVEPOINT container_codes');
    const [taken] = await takenContainerCode.run({ workspaceId: ctx.workspaceId, codes: params.codes }, ctx.client);
    const code = params.codes.find((candidate) => candidate.toLowerCase() === taken?.code) ?? taken?.code;
    throw new AppError('CODE_TAKEN', code ? `El código ${code} ya existe en el espacio` : 'Uno de los códigos ya existe en el espacio');
  }
}

interface ReceivedContainer {
  containerId: string;
  code: string;
  positionId: string;
  quantity: string;
  balance: string;
  tare: string | null;
}

export interface ReceiptResult {
  operationId: string;
  type: 'receipt';
  product: { id: string; code: string; name: string };
  lot: { id: string; code: string };
  unit: string;
  effectiveAt: string;
  containers: ReceivedContainer[];
}

interface ReceiptInput {
  itemId: string;
  lot: LotDetails;
  locationId: string;
  /** Un frasco por código, cada uno con `quantity`. */
  codes: string[];
  quantity: string;
  unit: string;
  /** Peso en g de un frasco lleno y la densidad para pasar el volumen a gramos (ADR 0015). */
  weight: { grossWeight: string; density: string | null } | null;
}

/**
 * Ingreso en un paso (ADR 0015): un lote nuevo del ítem y un frasco por código, en una operación con
 * un asiento por frasco. Valida la ubicación en el espacio, abre el lote, que bloquea el ítem, calcula la
 * tara si hay peso y crea cada frasco con su posición llena. Un código repetido en el espacio no deja nada a medias: CODE_TAKEN.
 */
export async function receiveContainers(
  ctx: InventoryContext,
  input: ReceiptInput,
): Promise<ReceiptResult> {
  const [location] = await findLocation.run(
    { workspaceId: ctx.workspaceId, locationId: input.locationId },
    ctx.client,
  );
  if (!location) throw notFound();

  const lot = await openLot(ctx, input.itemId, input.lot);
  requireBaseUnit(input.unit, lot.item.baseUnit);
  const weighed = input.weight
    ? await tareFor(ctx, { grossWeight: input.weight.grossWeight, quantity: input.quantity, unit: lot.item.baseUnit, density: input.weight.density })
    : null;

  const count = input.codes.length;
  const [reserved] = await reserveContainerSeqs.run({ workspaceId: ctx.workspaceId, lotId: lot.id, count }, ctx.client);
  if (!reserved) throw notFound();
  const containers = await insertCodedContainers(ctx, {
    workspaceId: ctx.workspaceId,
    itemId: lot.item.id,
    lotId: lot.id,
    codes: input.codes,
    firstSeq: reserved.last - count + 1,
    quantity: input.quantity,
    tare: weighed?.tare ?? null,
    density: weighed?.density ?? null,
  });

  const [operation] = await insertOperation.run(
    {
      workspaceId: ctx.workspaceId,
      type: 'receipt',
      principalId: ctx.principalId,
      reason: null,
      destination: null,
      // El ingreso no lleva referencia (ADR 0016); la usan los ajustes por peso y los traslados.
      reference: null,
      correlationId: ctx.correlationId,
      requestedBy: null,
    },
    ctx.client,
  );
  if (!operation) throw new Error('La operación no devolvió fila');

  const received: ReceivedContainer[] = [];
  for (const container of containers) {
    const [position] = await insertContainerPosition.run(
      {
        workspaceId: ctx.workspaceId,
        itemId: lot.item.id,
        lotId: lot.id,
        containerId: container.id,
        locationId: location.id,
      },
      ctx.client,
    );
    if (!position) throw new Error('La posición del frasco no devolvió fila');
    const [entry] = await applyEntry.run(
      {
        workspaceId: ctx.workspaceId,
        operationId: operation.id,
        positionId: position.id,
        sign: '1',
        quantity: input.quantity,
        unit: input.unit,
      },
      ctx.client,
    );
    if (!entry) throw new Error('El asiento del ingreso no devolvió fila');
    received.push({
      containerId: container.id,
      code: container.code,
      positionId: position.id,
      quantity: entry.quantity,
      balance: entry.balance_after,
      tare: container.tare,
    });
  }

  return {
    operationId: operation.id,
    type: 'receipt',
    product: { id: lot.item.id, code: lot.item.code, name: lot.item.name },
    lot: { id: lot.id, code: lot.code },
    unit: lot.item.baseUnit,
    effectiveAt: operation.effective_at.toISOString(),
    containers: received,
  };
}

export interface TareResult {
  containerId: string;
  tare: string;
  density: string | null;
  previous: { tare: string | null; density: string | null };
}

/**
 * Fija la tara de un frasco con su peso actual (ADR 0015): tara = peso − saldo pasado a gramos. Bloquea
 * en modo compartido sus posiciones y guarda la densidad usada: la enviada, la del frasco o `fallbackDensity` (la del ítem).
 */
export async function setTare(
  ctx: InventoryContext,
  input: {
    containerId: string;
    grossWeight: string;
    density: string | null;
    /** Densidad del ítem, si el frasco no tiene una; solo se pide cuando hace falta. */
    fallbackDensity: (itemId: string) => Promise<string | null>;
  },
): Promise<TareResult> {
  const [stock] = await lockContainerStock.run(
    { workspaceId: ctx.workspaceId, containerId: input.containerId, kind: ctx.kind },
    ctx.client,
  );
  if (!stock) throw notFound();
  const weighed = await tareFor(ctx, {
    grossWeight: input.grossWeight,
    quantity: stock.balance,
    unit: stock.base_unit,
    density: input.density ?? stock.density ?? (await input.fallbackDensity(stock.item_id)),
  });
  const [updated] = await setContainerTare.run(
    { workspaceId: ctx.workspaceId, containerId: stock.id, tare: weighed.tare, density: weighed.density },
    ctx.client,
  );
  if (!updated) throw notFound();
  return {
    containerId: stock.id,
    tare: updated.tare,
    density: updated.density,
    previous: { tare: stock.tare, density: stock.density },
  };
}

/**
 * Ajuste por peso (ADR 0015) sobre la posición ya bloqueada: el saldo que marca la balanza con la tara
 * del frasco, redondeado a centésimas, queda como un ajuste con motivo «Pesada». Como todo ajuste,
 * nunca deja el saldo bajo lo apartado.
 */
export async function adjustByWeight(
  ctx: InventoryContext,
  position: LockedPosition,
  grossWeight: string,
): Promise<MovementResult> {
  const [weighed] = await weighPosition.run({ workspaceId: ctx.workspaceId, positionId: position.id, grossWeight }, ctx.client);
  if (!weighed?.tare) throw new AppError('VALIDATION_FAILED', 'El frasco no tiene tara: fíjala antes de ajustar por peso');
  if (weighed.below_tare) throw new AppError('VALIDATION_FAILED', 'El peso es menor que la tara');
  if (weighed.delta === null) throw new AppError('VALIDATION_FAILED', 'Esta unidad no admite control por peso');
  if (weighed.delta === '0') throw new AppError('VALIDATION_FAILED', 'El saldo ya coincide con el peso');
  return applyMovement(ctx, position, {
    type: 'adjustment',
    quantity: weighed.delta,
    unit: position.baseUnit,
    reason: 'Pesada',
    reference: `Peso en balanza: ${grossWeight} g`,
  });
}

/** Bloquea una posición existente del tipo del módulo antes de leer o descontar su saldo. */
export async function lockExistingPosition(ctx: InventoryContext, positionId: string): Promise<LockedPosition> {
  const [row] = await lockPosition.run({ workspaceId: ctx.workspaceId, positionId, kind: ctx.kind }, ctx.client);
  if (!row) throw notFound();
  return {
    id: row.id,
    baseUnit: row.base_unit,
    movable: row.disposition === 'usable',
  };
}

interface MovementInput {
  type: OperationType;
  /** Cadena decimal: positiva en ingresos y salidas; con signo en los ajustes. */
  quantity: string;
  unit: string;
  reason?: string | null;
  destination?: string | null;
  reference?: string | null;
}

/**
 * Registra la operación, su asiento y el nuevo saldo sobre la posición ya bloqueada (03 §7).
 * Una salida o un ajuste negativo que deja el saldo bajo cero no escribe nada: stock insuficiente.
 */
export async function applyMovement(
  ctx: InventoryContext,
  position: LockedPosition,
  input: MovementInput,
): Promise<MovementResult> {
  requireBaseUnit(input.unit, position.baseUnit);
  if (input.type === 'issue' && !position.movable) {
    throw new AppError('VALIDATION_FAILED', 'El frasco no está disponible para salidas');
  }
  const [operation] = await insertOperation.run(
    {
      workspaceId: ctx.workspaceId,
      type: input.type,
      principalId: ctx.principalId,
      reason: input.reason ?? null,
      destination: input.destination ?? null,
      reference: input.reference ?? null,
      correlationId: ctx.correlationId,
      requestedBy: null,
    },
    ctx.client,
  );
  if (!operation) throw new Error('La operación no devolvió fila');

  const [entry] = await applyEntry.run(
    {
      workspaceId: ctx.workspaceId,
      operationId: operation.id,
      positionId: position.id,
      sign: input.type === 'issue' ? '-1' : '1',
      quantity: input.quantity,
      unit: input.unit,
    },
    ctx.client,
  );
  if (!entry) throw new AppError('INSUFFICIENT_STOCK', 'Stock insuficiente en la posición');

  return {
    operationId: operation.id,
    type: input.type,
    positionId: position.id,
    appliedQuantity: entry.quantity,
    balance: entry.balance_after,
    unit: position.baseUnit,
    effectiveAt: operation.effective_at.toISOString(),
  };
}

export interface TransferResult {
  operationId: string;
  fromPositionId: string;
  toPositionId: string;
  quantity: string;
  unit: string;
  effectiveAt: string;
}

/**
 * Traslado en un paso (ADR 0012, entrega 4): el frasco entero pasa a otra ubicación. Bloquea la
 * posición de origen, valida el destino en el espacio y escribe una operación con
 * dos asientos: primero vacía el origen y después llena el destino (un frasco tiene saldo en un solo
 * lugar). Un frasco vacío o con salidas pendientes no se traslada.
 */
export async function transferContainer(
  ctx: InventoryContext,
  input: { positionId: string; locationId: string; reference: string | null },
): Promise<TransferResult> {
  const [origin] = await lockTransferPosition.run(
    { workspaceId: ctx.workspaceId, positionId: input.positionId, kind: ctx.kind },
    ctx.client,
  );
  if (!origin) throw notFound();
  const [destination] = await findLocation.run({ workspaceId: ctx.workspaceId, locationId: input.locationId }, ctx.client);
  if (!destination) throw notFound();
  if (!origin.container_id) throw new AppError('VALIDATION_FAILED', 'Solo se trasladan frascos');
  if (destination.id === origin.location_id) throw new AppError('VALIDATION_FAILED', 'El frasco ya está en esa ubicación');
  if (origin.balance === '0') throw new AppError('VALIDATION_FAILED', 'El frasco está vacío: no hay nada que trasladar');
  if (origin.reserved !== '0') {
    throw new AppError('VALIDATION_FAILED', 'El frasco tiene salidas pendientes. Resuélvelas antes de trasladarlo.');
  }

  const key = {
    workspaceId: ctx.workspaceId,
    itemId: origin.item_id,
    lotId: origin.lot_id,
    containerId: origin.container_id,
    locationId: destination.id,
    disposition: origin.disposition,
  };
  await ensureContainerPosition.run(key, ctx.client);
  const [target] = await lockContainerPositionAt.run(key, ctx.client);
  if (!target) throw new Error('La posición de destino no devolvió fila');

  const [operation] = await insertOperation.run(
    {
      workspaceId: ctx.workspaceId,
      type: 'transfer',
      principalId: ctx.principalId,
      reason: null,
      destination: null,
      reference: input.reference,
      correlationId: ctx.correlationId,
      requestedBy: null,
    },
    ctx.client,
  );
  if (!operation) throw new Error('La operación no devolvió fila');
  const entry = (positionId: string, sign: '1' | '-1') =>
    applyEntry.run(
      { workspaceId: ctx.workspaceId, operationId: operation.id, positionId, sign, quantity: origin.balance, unit: origin.base_unit },
      ctx.client,
    );
  const [out] = await entry(origin.id, '-1');
  if (!out) throw new AppError('INSUFFICIENT_STOCK', 'Stock insuficiente en la posición');
  const [into] = await entry(target.id, '1');
  if (!into) throw new Error('El asiento de destino no devolvió fila');

  return {
    operationId: operation.id,
    fromPositionId: origin.id,
    toPositionId: target.id,
    quantity: origin.balance,
    unit: origin.base_unit,
    effectiveAt: operation.effective_at.toISOString(),
  };
}

export interface CountResult {
  operationId: string | null;
  /** Líneas contadas y, de ellas, frascos que no cuadraban y se ajustaron. */
  counted: number;
  adjusted: number;
  effectiveAt: string | null;
}

/**
 * Conteo de una ubicación (ADR 0012, entrega 4): cada línea dice qué saldo se vio y qué se contó.
 * Bloquea los frascos en orden estable y, si alguno cambió mientras se contaba o lo contado queda bajo
 * lo apartado, no escribe nada. Los que no cuadran se corrigen con un solo ajuste de motivo «Conteo»,
 * un asiento por frasco; si todo cuadra, no hay movimiento.
 */
export async function countLocation(
  ctx: InventoryContext,
  input: { locationId: string; lines: Array<{ positionId: string; expected: string; counted: string }> },
): Promise<CountResult> {
  const [location] = await findLocation.run({ workspaceId: ctx.workspaceId, locationId: input.locationId }, ctx.client);
  if (!location) throw notFound();

  const lines = [...input.lines].sort((a, b) => a.positionId.localeCompare(b.positionId));
  const checked = [];
  for (const line of lines) {
    const [row] = await lockCountPosition.run(
      { workspaceId: ctx.workspaceId, positionId: line.positionId, kind: ctx.kind, expected: line.expected, counted: line.counted },
      ctx.client,
    );
    if (!row || row.location_id !== location.id) throw notFound();
    if (!row.unchanged) {
      throw new AppError('VALIDATION_FAILED', `El saldo de ${row.code} cambió mientras contabas. Vuelve a cargar el conteo.`);
    }
    if (row.below_reserved) {
      throw new AppError('VALIDATION_FAILED', `Lo contado en ${row.code} queda por debajo de lo apartado. Resuelve primero sus solicitudes.`);
    }
    checked.push(row);
  }

  const differing = checked.filter((row) => row.delta !== '0');
  if (differing.length === 0) return { operationId: null, counted: checked.length, adjusted: 0, effectiveAt: null };
  const [operation] = await insertOperation.run(
    {
      workspaceId: ctx.workspaceId,
      type: 'adjustment',
      principalId: ctx.principalId,
      reason: 'Conteo',
      destination: null,
      reference: null,
      correlationId: ctx.correlationId,
      requestedBy: null,
    },
    ctx.client,
  );
  if (!operation) throw new Error('La operación no devolvió fila');
  for (const row of differing) {
    const [entry] = await applyEntry.run(
      { workspaceId: ctx.workspaceId, operationId: operation.id, positionId: row.id, sign: '1', quantity: row.delta, unit: row.base_unit },
      ctx.client,
    );
    if (!entry) throw new Error('El asiento del conteo no devolvió fila');
  }
  return { operationId: operation.id, counted: checked.length, adjusted: differing.length, effectiveAt: operation.effective_at.toISOString() };
}
