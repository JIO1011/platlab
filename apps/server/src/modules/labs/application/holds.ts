import { compareDecimals, sumDecimals } from '@platlab/contracts';
import { assetCodes, operationalAssetsOfTypes } from '../../equipment/index.js';
import { heldReagentQuantities, holdReagentForActivity, releaseReagentHolds } from '../../reagents/index.js';
import type { WorkspaceAccess } from '../../core/index.js';
import {
  activityAllocations,
  activityAssets,
  bookActivityAsset,
  insertActivityAllocation,
  releaseActivityAssets,
} from '../infrastructure/holds.queries.js';
import { activityUsage } from '../infrastructure/practice.queries.js';
import { requestLines, type IRequestLinesResult } from '../infrastructure/requests.queries.js';

/**
 * La reserva real (ADR 0023, «Reglas de L-01d»): al programar, cada bloque aparta lo suyo de cada línea, porque las
 * cantidades son por fecha. Los reactivos del catálogo, por la interfaz de Reactivos (solo si el comando lo admitió:
 * `access.optionalAdmitted`); los equipos concretos del tipo pedido, en la agenda de Laboratorios, sin que un equipo
 * esté en dos bloques a la vez. Lo que no alcanza no se aparta y queda «Falta». Liberar devuelve todo.
 */

export interface BlockSlot {
  activityId: string;
  requestId: string;
  requestCode: string;
  date: string;
  startsAt: string;
  endsAt: string;
  areaName: string;
}

/** Lo que cada línea de un bloque tiene apartado: cantidad de reactivo o equipos, con su id y su código. */
export interface LineHold {
  line: number;
  held: string;
  assets: Array<{ id: string; code: string }>;
  /** Lo apartado alcanza lo pedido. */
  complete: boolean;
}

const reservable = (line: IRequestLinesResult) => (line.kind === 'reagent' && line.item_id !== null) || (line.kind === 'equipment' && line.asset_type_id !== null);

/** Aparta los equipos libres del tipo en la franja, uno a uno, hasta los pedidos; los ocupados no devuelven fila. */
async function bookEquipment(access: WorkspaceAccess, slot: BlockSlot, line: IRequestLinesResult) {
  const wanted = Number(line.quantity);
  let booked = 0;
  for (const asset of await operationalAssetsOfTypes(access, [line.asset_type_id!])) {
    if (booked >= wanted) break;
    const [row] = await bookActivityAsset.run(
      { workspaceId: access.workspace.id, activityId: slot.activityId, line: line.line, assetId: asset.id, date: slot.date, startsAt: slot.startsAt, endsAt: slot.endsAt },
      access.client,
    );
    if (row) booked += 1;
  }
}

/** Aparta para un bloque recién programado lo de cada línea reservable de su solicitud. */
export async function holdBlock(access: WorkspaceAccess, slot: BlockSlot): Promise<void> {
  const lines = await requestLines.run({ workspaceId: access.workspace.id, requestIds: [slot.requestId] }, access.client);
  for (const line of lines.filter(reservable)) {
    if (line.kind === 'equipment') {
      await bookEquipment(access, slot, line);
    } else if (access.optionalAdmitted) {
      const holds = await holdReagentForActivity(access, {
        itemId: line.item_id!,
        quantity: line.quantity,
        validOn: slot.date,
        reason: `Práctica ${slot.requestCode}`,
        destination: slot.areaName,
      });
      for (const hold of holds) {
        await insertActivityAllocation.run({ workspaceId: access.workspace.id, activityId: slot.activityId, line: line.line, allocationId: hold.allocationId }, access.client);
      }
    }
  }
}

/** Vuelve a apartar los equipos de un bloque que cambió de franja; los reactivos siguen siendo del mismo día. */
export async function rebookEquipment(access: WorkspaceAccess, slot: BlockSlot): Promise<void> {
  await releaseActivityAssets.run({ workspaceId: access.workspace.id, activityIds: [slot.activityId] }, access.client);
  const lines = await requestLines.run({ workspaceId: access.workspace.id, requestIds: [slot.requestId] }, access.client);
  for (const line of lines.filter((item) => item.kind === 'equipment' && item.asset_type_id !== null)) await bookEquipment(access, slot, line);
}

/** Libera lo apartado por esos bloques, con su motivo. */
export async function releaseBlocks(access: WorkspaceAccess, activityIds: readonly string[], reason: string): Promise<void> {
  if (activityIds.length === 0) return;
  const workspaceId = access.workspace.id;
  const allocations = await activityAllocations.run({ workspaceId, activityIds: [...activityIds] }, access.client);
  await releaseReagentHolds(access, allocations.map((row) => row.allocation_id), reason);
  await releaseActivityAssets.run({ workspaceId, activityIds: [...activityIds] }, access.client);
}

/**
 * Lo apartado por cada bloque y línea reservable, frente a lo pedido; una línea sin nada apartado aparece con «0». Un
 * bloque cerrado (L-01e) muestra lo que tenía apartado al cerrar y ya no le falta nada.
 */
export async function blockHolds(
  access: WorkspaceAccess,
  blocks: ReadonlyArray<{ activityId: string; requestId: string; closed: boolean }>,
): Promise<Map<string, LineHold[]>> {
  const result = new Map<string, LineHold[]>();
  if (blocks.length === 0) return result;
  const workspaceId = access.workspace.id;
  const activityIds = blocks.map((block) => block.activityId);
  const closedIds = blocks.filter((block) => block.closed).map((block) => block.activityId);
  const [lines, allocations, assets, usage] = await Promise.all([
    requestLines.run({ workspaceId, requestIds: [...new Set(blocks.map((block) => block.requestId))] }, access.client),
    activityAllocations.run({ workspaceId, activityIds }, access.client),
    activityAssets.run({ workspaceId, activityIds }, access.client),
    closedIds.length === 0 ? [] : activityUsage.run({ workspaceId, activityIds: closedIds }, access.client),
  ]);
  const held = await heldReagentQuantities(access, allocations.map((row) => row.allocation_id));
  const codes = await assetCodes(access, assets.map((row) => row.asset_id));
  for (const block of blocks) {
    const holds = lines
      .filter((line) => line.request_id === block.requestId && reservable(line))
      .map((line): LineHold => {
        if (line.kind === 'equipment') {
          const booked = assets.filter((row) => row.activity_id === block.activityId && row.line === line.line).map((row) => ({ id: row.asset_id, code: codes.get(row.asset_id) ?? '' }));
          return { line: line.line, held: String(booked.length), assets: booked, complete: block.closed || booked.length >= Number(line.quantity) };
        }
        if (block.closed) {
          const closing = usage.find((row) => row.activity_id === block.activityId && row.line === line.line);
          return { line: line.line, held: closing?.held ?? '0', assets: [], complete: true };
        }
        const parts = allocations.filter((row) => row.activity_id === block.activityId && row.line === line.line).map((row) => held.get(row.allocation_id) ?? '0');
        const total = sumDecimals(parts);
        return { line: line.line, held: total, assets: [], complete: compareDecimals(total, line.quantity) >= 0 };
      });
    result.set(block.activityId, holds);
  }
  return result;
}
