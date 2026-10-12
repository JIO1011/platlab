/** Types generated for queries found in "src/capabilities/inventory/infrastructure/inventory.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'InsertItem' parameters type */
export interface IInsertItemParams {
  baseUnit: string;
  code: string;
  kind: string;
  minimum?: string | null | void;
  name: string;
  workspaceId: string;
}

/** 'InsertItem' return type */
export interface IInsertItemResult {
  base_unit: string;
  code: string;
  id: string;
  minimum: string | null;
  name: string;
}

/** 'InsertItem' query type */
export interface IInsertItemQuery {
  params: IInsertItemParams;
  result: IInsertItemResult;
}

const insertItemIR: any = {"usedParamSet":{"workspaceId":true,"kind":true,"code":true,"name":true,"baseUnit":true,"minimum":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":98,"b":110}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":113,"b":118}]},{"name":"code","required":true,"transform":{"type":"scalar"},"locs":[{"a":121,"b":126}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":129,"b":134}]},{"name":"baseUnit","required":true,"transform":{"type":"scalar"},"locs":[{"a":137,"b":146}]},{"name":"minimum","required":false,"transform":{"type":"scalar"},"locs":[{"a":149,"b":156}]}],"statement":"INSERT INTO inventory.items (workspace_id, kind, code, name, base_unit, minimum_quantity)\nVALUES (:workspaceId!, :kind!, :code!, :name!, :baseUnit!, :minimum::numeric)\nRETURNING id, code, name, base_unit, trim_scale(minimum_quantity) AS minimum"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO inventory.items (workspace_id, kind, code, name, base_unit, minimum_quantity)
 * VALUES (:workspaceId!, :kind!, :code!, :name!, :baseUnit!, :minimum::numeric)
 * RETURNING id, code, name, base_unit, trim_scale(minimum_quantity) AS minimum
 * ```
 */
export const insertItem = new PreparedQuery<IInsertItemParams,IInsertItemResult>(insertItemIR);


/** 'SetItemMinimum' parameters type */
export interface ISetItemMinimumParams {
  itemId: string;
  kind: string;
  minimum?: string | null | void;
  workspaceId: string;
}

/** 'SetItemMinimum' return type */
export interface ISetItemMinimumResult {
  id: string;
  minimum: string | null;
}

/** 'SetItemMinimum' query type */
export interface ISetItemMinimumQuery {
  params: ISetItemMinimumParams;
  result: ISetItemMinimumResult;
}

const setItemMinimumIR: any = {"usedParamSet":{"minimum":true,"workspaceId":true,"itemId":true,"kind":true},"params":[{"name":"minimum","required":false,"transform":{"type":"scalar"},"locs":[{"a":135,"b":142}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":197,"b":209}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":220,"b":227}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":240,"b":245}]}],"statement":"-- Mínimo para todo el espacio, en la unidad base (ADR 0012, 05-10-2026); null lo quita.\nUPDATE inventory.items\nSET minimum_quantity = :minimum::numeric, version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :itemId! AND kind = :kind! AND archived_at IS NULL\nRETURNING id, trim_scale(minimum_quantity) AS minimum"};

/**
 * Query generated from SQL:
 * ```
 * -- Mínimo para todo el espacio, en la unidad base (ADR 0012, 05-10-2026); null lo quita.
 * UPDATE inventory.items
 * SET minimum_quantity = :minimum::numeric, version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :itemId! AND kind = :kind! AND archived_at IS NULL
 * RETURNING id, trim_scale(minimum_quantity) AS minimum
 * ```
 */
export const setItemMinimum = new PreparedQuery<ISetItemMinimumParams,ISetItemMinimumResult>(setItemMinimumIR);


/** 'FindItem' parameters type */
export interface IFindItemParams {
  itemId: string;
  kind: string;
  workspaceId: string;
}

/** 'FindItem' return type */
export interface IFindItemResult {
  base_unit: string;
  code: string;
  id: string;
  name: string;
}

/** 'FindItem' query type */
export interface IFindItemQuery {
  params: IFindItemParams;
  result: IFindItemResult;
}

const findItemIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true,"kind":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":75,"b":87}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":98,"b":105}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":118,"b":123}]}],"statement":"SELECT id, code, name, base_unit\nFROM inventory.items\nWHERE workspace_id = :workspaceId! AND id = :itemId! AND kind = :kind! AND archived_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, code, name, base_unit
 * FROM inventory.items
 * WHERE workspace_id = :workspaceId! AND id = :itemId! AND kind = :kind! AND archived_at IS NULL
 * ```
 */
export const findItem = new PreparedQuery<IFindItemParams,IFindItemResult>(findItemIR);


/** 'InsertLot' parameters type */
export interface IInsertLotParams {
  code: string;
  expiresOn?: string | null | void;
  itemId: string;
  supplierLot?: string | null | void;
  supplierName?: string | null | void;
  workspaceId: string;
}

/** 'InsertLot' return type */
export interface IInsertLotResult {
  code: string;
  expires_on: string | null;
  id: string;
  item_id: string;
  supplier_lot: string | null;
  supplier_name: string | null;
}

/** 'InsertLot' query type */
export interface IInsertLotQuery {
  params: IInsertLotParams;
  result: IInsertLotResult;
}

const insertLotIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true,"code":true,"supplierName":true,"supplierLot":true,"expiresOn":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":118}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":121,"b":128}]},{"name":"code","required":true,"transform":{"type":"scalar"},"locs":[{"a":131,"b":136}]},{"name":"supplierName","required":false,"transform":{"type":"scalar"},"locs":[{"a":139,"b":151}]},{"name":"supplierLot","required":false,"transform":{"type":"scalar"},"locs":[{"a":154,"b":165}]},{"name":"expiresOn","required":false,"transform":{"type":"scalar"},"locs":[{"a":168,"b":177}]}],"statement":"INSERT INTO inventory.lots (workspace_id, item_id, code, supplier_name, supplier_lot, expires_on)\nVALUES (:workspaceId!, :itemId!, :code!, :supplierName, :supplierLot, :expiresOn)\nRETURNING id, item_id, code, supplier_name, supplier_lot, expires_on"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO inventory.lots (workspace_id, item_id, code, supplier_name, supplier_lot, expires_on)
 * VALUES (:workspaceId!, :itemId!, :code!, :supplierName, :supplierLot, :expiresOn)
 * RETURNING id, item_id, code, supplier_name, supplier_lot, expires_on
 * ```
 */
export const insertLot = new PreparedQuery<IInsertLotParams,IInsertLotResult>(insertLotIR);


/** 'FindLot' parameters type */
export interface IFindLotParams {
  kind: string;
  lotId: string;
  workspaceId: string;
}

/** 'FindLot' return type */
export interface IFindLotResult {
  base_unit: string;
  code: string;
  id: string;
  item_id: string;
}

/** 'FindLot' query type */
export interface IFindLotQuery {
  params: IFindLotParams;
  result: IFindLotResult;
}

const findLotIR: any = {"usedParamSet":{"workspaceId":true,"lotId":true,"kind":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":174,"b":186}]},{"name":"lotId","required":true,"transform":{"type":"scalar"},"locs":[{"a":199,"b":205}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":220,"b":225}]}],"statement":"SELECT l.id, l.item_id, l.code, i.base_unit\nFROM inventory.lots AS l\nJOIN inventory.items AS i ON i.workspace_id = l.workspace_id AND i.id = l.item_id\nWHERE l.workspace_id = :workspaceId! AND l.id = :lotId! AND i.kind = :kind! AND i.archived_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT l.id, l.item_id, l.code, i.base_unit
 * FROM inventory.lots AS l
 * JOIN inventory.items AS i ON i.workspace_id = l.workspace_id AND i.id = l.item_id
 * WHERE l.workspace_id = :workspaceId! AND l.id = :lotId! AND i.kind = :kind! AND i.archived_at IS NULL
 * ```
 */
export const findLot = new PreparedQuery<IFindLotParams,IFindLotResult>(findLotIR);


/** 'FindLocation' parameters type */
export interface IFindLocationParams {
  locationId: string;
  workspaceId: string;
}

/** 'FindLocation' return type */
export interface IFindLocationResult {
  id: string;
}

/** 'FindLocation' query type */
export interface IFindLocationQuery {
  params: IFindLocationParams;
  result: IFindLocationResult;
}

const findLocationIR: any = {"usedParamSet":{"workspaceId":true,"locationId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":51,"b":63}]},{"name":"locationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":74,"b":85}]}],"statement":"SELECT id\nFROM core.locations\nWHERE workspace_id = :workspaceId! AND id = :locationId! AND archived_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id
 * FROM core.locations
 * WHERE workspace_id = :workspaceId! AND id = :locationId! AND archived_at IS NULL
 * ```
 */
export const findLocation = new PreparedQuery<IFindLocationParams,IFindLocationResult>(findLocationIR);


/** 'ReserveContainerSeqs' parameters type */
export interface IReserveContainerSeqsParams {
  count: number;
  lotId: string;
  workspaceId: string;
}

/** 'ReserveContainerSeqs' return type */
export interface IReserveContainerSeqsResult {
  last: number;
}

/** 'ReserveContainerSeqs' query type */
export interface IReserveContainerSeqsQuery {
  params: IReserveContainerSeqsParams;
  result: IReserveContainerSeqsResult;
}

const reserveContainerSeqsIR: any = {"usedParamSet":{"count":true,"workspaceId":true,"lotId":true},"params":[{"name":"count","required":true,"transform":{"type":"scalar"},"locs":[{"a":351,"b":357}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":385,"b":397}]},{"name":"lotId","required":true,"transform":{"type":"scalar"},"locs":[{"a":408,"b":414}]}],"statement":"-- Reparte números de frasco del lote: el UPDATE bloquea el lote, así que dos ingresos simultáneos\n-- reciben tramos distintos. Devuelve el último número del tramo reservado. Orden de bloqueo dentro\n-- de «datos» (02 §6): lote antes que posición; todo comando que bloquee ambos debe seguirlo.\nUPDATE inventory.lots\nSET container_seq = container_seq + :count!::int\nWHERE workspace_id = :workspaceId! AND id = :lotId!\nRETURNING container_seq AS \"last!\""};

/**
 * Query generated from SQL:
 * ```
 * -- Reparte números de frasco del lote: el UPDATE bloquea el lote, así que dos ingresos simultáneos
 * -- reciben tramos distintos. Devuelve el último número del tramo reservado. Orden de bloqueo dentro
 * -- de «datos» (02 §6): lote antes que posición; todo comando que bloquee ambos debe seguirlo.
 * UPDATE inventory.lots
 * SET container_seq = container_seq + :count!::int
 * WHERE workspace_id = :workspaceId! AND id = :lotId!
 * RETURNING container_seq AS "last!"
 * ```
 */
export const reserveContainerSeqs = new PreparedQuery<IReserveContainerSeqsParams,IReserveContainerSeqsResult>(reserveContainerSeqsIR);


/** 'InsertContainers' parameters type */
export interface IInsertContainersParams {
  firstSeq: number;
  itemId: string;
  lastSeq: number;
  lotId: string;
  quantity: string;
  workspaceId: string;
}

/** 'InsertContainers' return type */
export interface IInsertContainersResult {
  id: string;
  seq: number;
}

/** 'InsertContainers' query type */
export interface IInsertContainersQuery {
  params: IInsertContainersParams;
  result: IInsertContainersResult;
}

const insertContainersIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true,"lotId":true,"quantity":true,"firstSeq":true,"lastSeq":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":95,"b":107}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":110,"b":117}]},{"name":"lotId","required":true,"transform":{"type":"scalar"},"locs":[{"a":120,"b":126}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":136,"b":145}]},{"name":"firstSeq","required":true,"transform":{"type":"scalar"},"locs":[{"a":177,"b":186}]},{"name":"lastSeq","required":true,"transform":{"type":"scalar"},"locs":[{"a":194,"b":202}]}],"statement":"INSERT INTO inventory.containers (workspace_id, item_id, lot_id, seq, initial_quantity)\nSELECT :workspaceId!, :itemId!, :lotId!, s.seq, :quantity!::numeric\nFROM generate_series(:firstSeq!::int, :lastSeq!::int) AS s (seq)\nORDER BY s.seq\nRETURNING id, seq"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO inventory.containers (workspace_id, item_id, lot_id, seq, initial_quantity)
 * SELECT :workspaceId!, :itemId!, :lotId!, s.seq, :quantity!::numeric
 * FROM generate_series(:firstSeq!::int, :lastSeq!::int) AS s (seq)
 * ORDER BY s.seq
 * RETURNING id, seq
 * ```
 */
export const insertContainers = new PreparedQuery<IInsertContainersParams,IInsertContainersResult>(insertContainersIR);


/** 'InsertContainerPosition' parameters type */
export interface IInsertContainerPositionParams {
  containerId: string;
  itemId: string;
  locationId: string;
  lotId: string;
  workspaceId: string;
}

/** 'InsertContainerPosition' return type */
export interface IInsertContainerPositionResult {
  id: string;
}

/** 'InsertContainerPosition' query type */
export interface IInsertContainerPositionQuery {
  params: IInsertContainerPositionParams;
  result: IInsertContainerPositionResult;
}

const insertContainerPositionIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true,"lotId":true,"containerId":true,"locationId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":210,"b":222}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":225,"b":232}]},{"name":"lotId","required":true,"transform":{"type":"scalar"},"locs":[{"a":235,"b":241}]},{"name":"containerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":244,"b":256}]},{"name":"locationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":259,"b":270}]}],"statement":"-- La posición de un frasco recién creado: nace con saldo cero y el asiento del ingreso la llena.\nINSERT INTO inventory.positions (workspace_id, item_id, lot_id, container_id, location_id, disposition)\nVALUES (:workspaceId!, :itemId!, :lotId!, :containerId!, :locationId!, 'usable')\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- La posición de un frasco recién creado: nace con saldo cero y el asiento del ingreso la llena.
 * INSERT INTO inventory.positions (workspace_id, item_id, lot_id, container_id, location_id, disposition)
 * VALUES (:workspaceId!, :itemId!, :lotId!, :containerId!, :locationId!, 'usable')
 * RETURNING id
 * ```
 */
export const insertContainerPosition = new PreparedQuery<IInsertContainerPositionParams,IInsertContainerPositionResult>(insertContainerPositionIR);


/** 'LockPosition' parameters type */
export interface ILockPositionParams {
  kind: string;
  positionId: string;
  workspaceId: string;
}

/** 'LockPosition' return type */
export interface ILockPositionResult {
  base_unit: string;
  disposition: string;
  expires_on: string | null;
  id: string;
  location_id: string;
}

/** 'LockPosition' query type */
export interface ILockPositionQuery {
  params: ILockPositionParams;
  result: ILockPositionResult;
}

const lockPositionIR: any = {"usedParamSet":{"workspaceId":true,"positionId":true,"kind":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":383,"b":395}]},{"name":"positionId","required":true,"transform":{"type":"scalar"},"locs":[{"a":408,"b":419}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":434,"b":439}]}],"statement":"-- Bloquea la posición antes de leer su saldo: salidas y ajustes descuentan bajo el mismo bloqueo.\nSELECT p.id, p.location_id, p.disposition, l.expires_on, i.base_unit\nFROM inventory.positions AS p\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nJOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\nWHERE p.workspace_id = :workspaceId! AND p.id = :positionId! AND i.kind = :kind!\nFOR UPDATE OF p"};

/**
 * Query generated from SQL:
 * ```
 * -- Bloquea la posición antes de leer su saldo: salidas y ajustes descuentan bajo el mismo bloqueo.
 * SELECT p.id, p.location_id, p.disposition, l.expires_on, i.base_unit
 * FROM inventory.positions AS p
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 * JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
 * WHERE p.workspace_id = :workspaceId! AND p.id = :positionId! AND i.kind = :kind!
 * FOR UPDATE OF p
 * ```
 */
export const lockPosition = new PreparedQuery<ILockPositionParams,ILockPositionResult>(lockPositionIR);


/** 'FindContainerItem' parameters type */
export interface IFindContainerItemParams {
  containerId: string;
  kind: string;
  workspaceId: string;
}

/** 'FindContainerItem' return type */
export interface IFindContainerItemResult {
  id: string;
  item_id: string;
}

/** 'FindContainerItem' query type */
export interface IFindContainerItemQuery {
  params: IFindContainerItemParams;
  result: IFindContainerItemResult;
}

const findContainerItemIR: any = {"usedParamSet":{"workspaceId":true,"containerId":true,"kind":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":251,"b":263}]},{"name":"containerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":276,"b":288}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":303,"b":308}]}],"statement":"-- De qué ítem es un frasco del espacio: lo que necesita el enlace corto de su etiqueta QR.\nSELECT c.id, c.item_id\nFROM inventory.containers AS c\nJOIN inventory.items AS i ON i.workspace_id = c.workspace_id AND i.id = c.item_id\nWHERE c.workspace_id = :workspaceId! AND c.id = :containerId! AND i.kind = :kind!"};

/**
 * Query generated from SQL:
 * ```
 * -- De qué ítem es un frasco del espacio: lo que necesita el enlace corto de su etiqueta QR.
 * SELECT c.id, c.item_id
 * FROM inventory.containers AS c
 * JOIN inventory.items AS i ON i.workspace_id = c.workspace_id AND i.id = c.item_id
 * WHERE c.workspace_id = :workspaceId! AND c.id = :containerId! AND i.kind = :kind!
 * ```
 */
export const findContainerItem = new PreparedQuery<IFindContainerItemParams,IFindContainerItemResult>(findContainerItemIR);


/** 'LockTransferPosition' parameters type */
export interface ILockTransferPositionParams {
  kind: string;
  positionId: string;
  workspaceId: string;
}

/** 'LockTransferPosition' return type */
export interface ILockTransferPositionResult {
  balance: string;
  base_unit: string;
  container_id: string | null;
  disposition: string;
  id: string;
  item_id: string;
  location_id: string;
  lot_id: string;
  reserved: string;
}

/** 'LockTransferPosition' query type */
export interface ILockTransferPositionQuery {
  params: ILockTransferPositionParams;
  result: ILockTransferPositionResult;
}

const lockTransferPositionIR: any = {"usedParamSet":{"workspaceId":true,"positionId":true,"kind":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":410,"b":422}]},{"name":"positionId","required":true,"transform":{"type":"scalar"},"locs":[{"a":435,"b":446}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":461,"b":466}]}],"statement":"-- El frasco que se traslada, bloqueado antes de leer su saldo (posición de origen primero, 02 §6).\nSELECT p.id, p.item_id, p.lot_id, p.container_id, p.location_id, p.disposition,\n       trim_scale(p.balance) AS \"balance!\", trim_scale(p.reserved) AS \"reserved!\", i.base_unit\nFROM inventory.positions AS p\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nWHERE p.workspace_id = :workspaceId! AND p.id = :positionId! AND i.kind = :kind!\nFOR UPDATE OF p"};

/**
 * Query generated from SQL:
 * ```
 * -- El frasco que se traslada, bloqueado antes de leer su saldo (posición de origen primero, 02 §6).
 * SELECT p.id, p.item_id, p.lot_id, p.container_id, p.location_id, p.disposition,
 *        trim_scale(p.balance) AS "balance!", trim_scale(p.reserved) AS "reserved!", i.base_unit
 * FROM inventory.positions AS p
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 * WHERE p.workspace_id = :workspaceId! AND p.id = :positionId! AND i.kind = :kind!
 * FOR UPDATE OF p
 * ```
 */
export const lockTransferPosition = new PreparedQuery<ILockTransferPositionParams,ILockTransferPositionResult>(lockTransferPositionIR);


/** 'EnsureContainerPosition' parameters type */
export interface IEnsureContainerPositionParams {
  containerId: string;
  disposition: string;
  itemId: string;
  locationId: string;
  lotId: string;
  workspaceId: string;
}

/** 'EnsureContainerPosition' return type */
export type IEnsureContainerPositionResult = void;

/** 'EnsureContainerPosition' query type */
export interface IEnsureContainerPositionQuery {
  params: IEnsureContainerPositionParams;
  result: IEnsureContainerPositionResult;
}

const ensureContainerPositionIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true,"lotId":true,"containerId":true,"locationId":true,"disposition":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":208,"b":220}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":223,"b":230}]},{"name":"lotId","required":true,"transform":{"type":"scalar"},"locs":[{"a":233,"b":239}]},{"name":"containerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":242,"b":254}]},{"name":"locationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":257,"b":268}]},{"name":"disposition","required":true,"transform":{"type":"scalar"},"locs":[{"a":271,"b":283}]}],"statement":"-- La posición del frasco en el destino: la de un traslado anterior o una nueva con saldo cero.\nINSERT INTO inventory.positions (workspace_id, item_id, lot_id, container_id, location_id, disposition)\nVALUES (:workspaceId!, :itemId!, :lotId!, :containerId!, :locationId!, :disposition!)\nON CONFLICT (workspace_id, item_id, lot_id, container_id, location_id, disposition) DO NOTHING"};

/**
 * Query generated from SQL:
 * ```
 * -- La posición del frasco en el destino: la de un traslado anterior o una nueva con saldo cero.
 * INSERT INTO inventory.positions (workspace_id, item_id, lot_id, container_id, location_id, disposition)
 * VALUES (:workspaceId!, :itemId!, :lotId!, :containerId!, :locationId!, :disposition!)
 * ON CONFLICT (workspace_id, item_id, lot_id, container_id, location_id, disposition) DO NOTHING
 * ```
 */
export const ensureContainerPosition = new PreparedQuery<IEnsureContainerPositionParams,IEnsureContainerPositionResult>(ensureContainerPositionIR);


/** 'LockContainerPositionAt' parameters type */
export interface ILockContainerPositionAtParams {
  containerId: string;
  disposition: string;
  itemId: string;
  locationId: string;
  lotId: string;
  workspaceId: string;
}

/** 'LockContainerPositionAt' return type */
export interface ILockContainerPositionAtResult {
  id: string;
}

/** 'LockContainerPositionAt' query type */
export interface ILockContainerPositionAtQuery {
  params: ILockContainerPositionAtParams;
  result: ILockContainerPositionAtResult;
}

const lockContainerPositionAtIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true,"lotId":true,"containerId":true,"locationId":true,"disposition":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":56,"b":68}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":84,"b":91}]},{"name":"lotId","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":112}]},{"name":"containerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":133,"b":145}]},{"name":"locationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":167,"b":178}]},{"name":"disposition","required":true,"transform":{"type":"scalar"},"locs":[{"a":198,"b":210}]}],"statement":"SELECT id\nFROM inventory.positions\nWHERE workspace_id = :workspaceId! AND item_id = :itemId! AND lot_id = :lotId! AND container_id = :containerId!\n  AND location_id = :locationId! AND disposition = :disposition!\nFOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id
 * FROM inventory.positions
 * WHERE workspace_id = :workspaceId! AND item_id = :itemId! AND lot_id = :lotId! AND container_id = :containerId!
 *   AND location_id = :locationId! AND disposition = :disposition!
 * FOR UPDATE
 * ```
 */
export const lockContainerPositionAt = new PreparedQuery<ILockContainerPositionAtParams,ILockContainerPositionAtResult>(lockContainerPositionAtIR);


/** 'LockCountPosition' parameters type */
export interface ILockCountPositionParams {
  counted: string;
  expected: string;
  kind: string;
  positionId: string;
  workspaceId: string;
}

/** 'LockCountPosition' return type */
export interface ILockCountPositionResult {
  base_unit: string;
  below_reserved: boolean;
  code: string;
  delta: string;
  id: string;
  location_id: string;
  unchanged: boolean;
}

/** 'LockCountPosition' query type */
export interface ILockCountPositionQuery {
  params: ILockCountPositionParams;
  result: ILockCountPositionResult;
}

const lockCountPositionIR: any = {"usedParamSet":{"expected":true,"counted":true,"workspaceId":true,"positionId":true,"kind":true},"params":[{"name":"expected","required":true,"transform":{"type":"scalar"},"locs":[{"a":287,"b":296}]},{"name":"counted","required":true,"transform":{"type":"scalar"},"locs":[{"a":343,"b":351},{"a":396,"b":404}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":888,"b":900}]},{"name":"positionId","required":true,"transform":{"type":"scalar"},"locs":[{"a":913,"b":924}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":939,"b":944}]}],"statement":"-- Una línea del conteo (ADR 0012, entrega 4) bajo el bloqueo del frasco: si su saldo sigue siendo\n-- el que se vio al contar, la diferencia con lo contado, y si lo contado queda bajo lo apartado.\n-- La aritmética ocurre aquí, en numeric.\nSELECT p.id, p.location_id,\n       (p.balance = :expected!::numeric) AS \"unchanged!\",\n       trim_scale(:counted!::numeric - p.balance) AS \"delta!\",\n       (:counted!::numeric < p.reserved) AS \"below_reserved!\",\n       CASE WHEN c.id IS NULL THEN l.code ELSE l.code || '-' || lpad(c.seq::text, 2, '0') END AS \"code!\",\n       i.base_unit\nFROM inventory.positions AS p\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nJOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\nLEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id\nWHERE p.workspace_id = :workspaceId! AND p.id = :positionId! AND i.kind = :kind!\nFOR UPDATE OF p"};

/**
 * Query generated from SQL:
 * ```
 * -- Una línea del conteo (ADR 0012, entrega 4) bajo el bloqueo del frasco: si su saldo sigue siendo
 * -- el que se vio al contar, la diferencia con lo contado, y si lo contado queda bajo lo apartado.
 * -- La aritmética ocurre aquí, en numeric.
 * SELECT p.id, p.location_id,
 *        (p.balance = :expected!::numeric) AS "unchanged!",
 *        trim_scale(:counted!::numeric - p.balance) AS "delta!",
 *        (:counted!::numeric < p.reserved) AS "below_reserved!",
 *        CASE WHEN c.id IS NULL THEN l.code ELSE l.code || '-' || lpad(c.seq::text, 2, '0') END AS "code!",
 *        i.base_unit
 * FROM inventory.positions AS p
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 * JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
 * LEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id
 * WHERE p.workspace_id = :workspaceId! AND p.id = :positionId! AND i.kind = :kind!
 * FOR UPDATE OF p
 * ```
 */
export const lockCountPosition = new PreparedQuery<ILockCountPositionParams,ILockCountPositionResult>(lockCountPositionIR);


/** 'InsertOperation' parameters type */
export interface IInsertOperationParams {
  correlationId: string;
  destination?: string | null | void;
  principalId: string;
  reason?: string | null | void;
  reference?: string | null | void;
  requestedBy?: string | null | void;
  type: string;
  workspaceId: string;
}

/** 'InsertOperation' return type */
export interface IInsertOperationResult {
  effective_at: Date;
  id: string;
}

/** 'InsertOperation' query type */
export interface IInsertOperationQuery {
  params: IInsertOperationParams;
  result: IInsertOperationResult;
}

const insertOperationIR: any = {"usedParamSet":{"workspaceId":true,"type":true,"principalId":true,"reason":true,"destination":true,"reference":true,"correlationId":true,"requestedBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":232,"b":244}]},{"name":"type","required":true,"transform":{"type":"scalar"},"locs":[{"a":247,"b":252}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":255,"b":267}]},{"name":"reason","required":false,"transform":{"type":"scalar"},"locs":[{"a":270,"b":276}]},{"name":"destination","required":false,"transform":{"type":"scalar"},"locs":[{"a":279,"b":290}]},{"name":"reference","required":false,"transform":{"type":"scalar"},"locs":[{"a":293,"b":302}]},{"name":"correlationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":305,"b":319}]},{"name":"requestedBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":322,"b":333}]}],"statement":"-- La fecha efectiva la fija la base (el runtime no puede escribirla).\nINSERT INTO inventory.operations\n  (workspace_id, type, actor_principal_id, reason, destination, reference, correlation_id, requested_by_principal_id)\nVALUES\n  (:workspaceId!, :type!, :principalId!, :reason, :destination, :reference, :correlationId!, :requestedBy)\nRETURNING id, effective_at"};

/**
 * Query generated from SQL:
 * ```
 * -- La fecha efectiva la fija la base (el runtime no puede escribirla).
 * INSERT INTO inventory.operations
 *   (workspace_id, type, actor_principal_id, reason, destination, reference, correlation_id, requested_by_principal_id)
 * VALUES
 *   (:workspaceId!, :type!, :principalId!, :reason, :destination, :reference, :correlationId!, :requestedBy)
 * RETURNING id, effective_at
 * ```
 */
export const insertOperation = new PreparedQuery<IInsertOperationParams,IInsertOperationResult>(insertOperationIR);


/** 'ApplyEntry' parameters type */
export interface IApplyEntryParams {
  operationId: string;
  positionId: string;
  quantity: string;
  sign: string;
  unit: string;
  workspaceId: string;
}

/** 'ApplyEntry' return type */
export interface IApplyEntryResult {
  balance_after: string;
  quantity: string;
}

/** 'ApplyEntry' query type */
export interface IApplyEntryQuery {
  params: IApplyEntryParams;
  result: IApplyEntryResult;
}

const applyEntryIR: any = {"usedParamSet":{"sign":true,"quantity":true,"workspaceId":true,"positionId":true,"operationId":true,"unit":true},"params":[{"name":"sign","required":true,"transform":{"type":"scalar"},"locs":[{"a":298,"b":303},{"a":431,"b":436},{"a":678,"b":683},{"a":715,"b":720}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":307,"b":316},{"a":440,"b":449},{"a":687,"b":696},{"a":724,"b":733}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":373,"b":385},{"a":638,"b":650}]},{"name":"positionId","required":true,"transform":{"type":"scalar"},"locs":[{"a":400,"b":411}]},{"name":"operationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":653,"b":665}]},{"name":"unit","required":true,"transform":{"type":"scalar"},"locs":[{"a":745,"b":750}]}],"statement":"-- Saldo y asiento en una sola sentencia sobre la posición ya bloqueada. Si lo disponible no\n-- alcanza (el saldo nunca baja de lo reservado, ADR 0012), no actualiza ni inserta nada y el\n-- comando responde stock insuficiente.\nWITH moved AS (\n  UPDATE inventory.positions\n  SET balance = balance + :sign! * :quantity!::numeric, version = version + 1\n  WHERE workspace_id = :workspaceId!\n    AND id = :positionId!\n    AND balance + :sign! * :quantity!::numeric >= reserved\n  RETURNING id, balance\n)\nINSERT INTO inventory.entries\n  (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)\nSELECT :workspaceId!, :operationId!, moved.id, :sign! * :quantity!::numeric,\n       :sign! * :quantity!::numeric, :unit!, moved.balance\nFROM moved\nRETURNING trim_scale(quantity) AS \"quantity!\", trim_scale(balance_after) AS \"balance_after!\""};

/**
 * Query generated from SQL:
 * ```
 * -- Saldo y asiento en una sola sentencia sobre la posición ya bloqueada. Si lo disponible no
 * -- alcanza (el saldo nunca baja de lo reservado, ADR 0012), no actualiza ni inserta nada y el
 * -- comando responde stock insuficiente.
 * WITH moved AS (
 *   UPDATE inventory.positions
 *   SET balance = balance + :sign! * :quantity!::numeric, version = version + 1
 *   WHERE workspace_id = :workspaceId!
 *     AND id = :positionId!
 *     AND balance + :sign! * :quantity!::numeric >= reserved
 *   RETURNING id, balance
 * )
 * INSERT INTO inventory.entries
 *   (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)
 * SELECT :workspaceId!, :operationId!, moved.id, :sign! * :quantity!::numeric,
 *        :sign! * :quantity!::numeric, :unit!, moved.balance
 * FROM moved
 * RETURNING trim_scale(quantity) AS "quantity!", trim_scale(balance_after) AS "balance_after!"
 * ```
 */
export const applyEntry = new PreparedQuery<IApplyEntryParams,IApplyEntryResult>(applyEntryIR);


/** 'ListPositions' parameters type */
export interface IListPositionsParams {
  afterId?: string | null | void;
  afterItem?: string | null | void;
  afterLocation?: string | null | void;
  afterLot?: string | null | void;
  afterSeq?: number | null | void;
  itemId?: string | null | void;
  kind: string;
  limit: NumberOrString;
  locationId?: string | null | void;
  locationIds: stringArray;
  workspaceId: string;
}

/** 'ListPositions' return type */
export interface IListPositionsResult {
  balance: string;
  base_unit: string;
  container_code: string | null;
  container_id: string | null;
  container_initial_quantity: string | null;
  container_received_at: Date | null;
  disposition: string;
  expires_on: string | null;
  id: string;
  item_code: string;
  item_id: string;
  item_name: string;
  location_code: string;
  location_id: string;
  location_name: string;
  lot_code: string;
  lot_id: string;
  reserved: string;
  sort_item: string;
  sort_location: string;
  sort_lot: string;
  sort_seq: number;
  supplier_lot: string | null;
  supplier_name: string | null;
}

/** 'ListPositions' query type */
export interface IListPositionsQuery {
  params: IListPositionsParams;
  result: IListPositionsResult;
}

const listPositionsIR: any = {"usedParamSet":{"workspaceId":true,"kind":true,"locationIds":true,"itemId":true,"locationId":true,"afterId":true,"afterItem":true,"afterLot":true,"afterSeq":true,"afterLocation":true,"limit":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1152,"b":1164}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":1181,"b":1186}]},{"name":"locationIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":1215,"b":1227}]},{"name":"itemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1245,"b":1251},{"a":1282,"b":1288}]},{"name":"locationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1304,"b":1314},{"a":1349,"b":1359}]},{"name":"afterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1691,"b":1698},{"a":1878,"b":1885}]},{"name":"afterItem","required":false,"transform":{"type":"scalar"},"locs":[{"a":1805,"b":1814}]},{"name":"afterLot","required":false,"transform":{"type":"scalar"},"locs":[{"a":1823,"b":1831}]},{"name":"afterSeq","required":false,"transform":{"type":"scalar"},"locs":[{"a":1840,"b":1848}]},{"name":"afterLocation","required":false,"transform":{"type":"scalar"},"locs":[{"a":1856,"b":1869}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":1985,"b":1991}]}],"statement":"SELECT\n  p.id,\n  i.id AS item_id,\n  i.code AS item_code,\n  i.name AS item_name,\n  l.id AS lot_id,\n  l.code AS lot_code,\n  l.expires_on,\n  l.supplier_name,\n  l.supplier_lot,\n  p.disposition,\n  c.id AS \"container_id?\",\n  CASE WHEN c.id IS NULL THEN NULL ELSE l.code || '-' || lpad(c.seq::text, 2, '0') END AS container_code,\n  trim_scale(c.initial_quantity) AS container_initial_quantity,\n  c.created_at AS \"container_received_at?\",\n  loc.id AS location_id,\n  loc.code AS location_code,\n  loc.name AS location_name,\n  trim_scale(p.balance) AS \"balance!\",\n  trim_scale(p.reserved) AS \"reserved!\",\n  i.base_unit,\n  lower(i.code) AS \"sort_item!\",\n  lower(l.code) AS \"sort_lot!\",\n  coalesce(c.seq, 0) AS \"sort_seq!\",\n  lower(loc.code) AS \"sort_location!\"\nFROM inventory.positions AS p\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nJOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\nLEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id\nJOIN core.locations AS loc ON loc.workspace_id = p.workspace_id AND loc.id = p.location_id\nWHERE p.workspace_id = :workspaceId!\n  AND i.kind = :kind!\n  AND p.location_id = ANY (:locationIds!::uuid[])\n  AND (:itemId::uuid IS NULL OR p.item_id = :itemId::uuid)\n  AND (:locationId::uuid IS NULL OR p.location_id = :locationId::uuid)\n  -- Un frasco trasladado deja su posición de origen vacía: solo se muestra donde está.\n  AND (p.container_id IS NULL OR p.balance > 0 OR NOT EXISTS (\n    SELECT 1 FROM inventory.positions AS other\n    WHERE other.workspace_id = p.workspace_id AND other.container_id = p.container_id AND other.balance > 0\n  ))\n  AND (\n    :afterId::uuid IS NULL\n    OR (lower(i.code), lower(l.code), coalesce(c.seq, 0), lower(loc.code), p.id)\n       > (:afterItem::text, :afterLot::text, :afterSeq::int, :afterLocation::text, :afterId::uuid)\n  )\nORDER BY lower(i.code), lower(l.code), coalesce(c.seq, 0), lower(loc.code), p.id\nLIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   p.id,
 *   i.id AS item_id,
 *   i.code AS item_code,
 *   i.name AS item_name,
 *   l.id AS lot_id,
 *   l.code AS lot_code,
 *   l.expires_on,
 *   l.supplier_name,
 *   l.supplier_lot,
 *   p.disposition,
 *   c.id AS "container_id?",
 *   CASE WHEN c.id IS NULL THEN NULL ELSE l.code || '-' || lpad(c.seq::text, 2, '0') END AS container_code,
 *   trim_scale(c.initial_quantity) AS container_initial_quantity,
 *   c.created_at AS "container_received_at?",
 *   loc.id AS location_id,
 *   loc.code AS location_code,
 *   loc.name AS location_name,
 *   trim_scale(p.balance) AS "balance!",
 *   trim_scale(p.reserved) AS "reserved!",
 *   i.base_unit,
 *   lower(i.code) AS "sort_item!",
 *   lower(l.code) AS "sort_lot!",
 *   coalesce(c.seq, 0) AS "sort_seq!",
 *   lower(loc.code) AS "sort_location!"
 * FROM inventory.positions AS p
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 * JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
 * LEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id
 * JOIN core.locations AS loc ON loc.workspace_id = p.workspace_id AND loc.id = p.location_id
 * WHERE p.workspace_id = :workspaceId!
 *   AND i.kind = :kind!
 *   AND p.location_id = ANY (:locationIds!::uuid[])
 *   AND (:itemId::uuid IS NULL OR p.item_id = :itemId::uuid)
 *   AND (:locationId::uuid IS NULL OR p.location_id = :locationId::uuid)
 *   -- Un frasco trasladado deja su posición de origen vacía: solo se muestra donde está.
 *   AND (p.container_id IS NULL OR p.balance > 0 OR NOT EXISTS (
 *     SELECT 1 FROM inventory.positions AS other
 *     WHERE other.workspace_id = p.workspace_id AND other.container_id = p.container_id AND other.balance > 0
 *   ))
 *   AND (
 *     :afterId::uuid IS NULL
 *     OR (lower(i.code), lower(l.code), coalesce(c.seq, 0), lower(loc.code), p.id)
 *        > (:afterItem::text, :afterLot::text, :afterSeq::int, :afterLocation::text, :afterId::uuid)
 *   )
 * ORDER BY lower(i.code), lower(l.code), coalesce(c.seq, 0), lower(loc.code), p.id
 * LIMIT :limit!
 * ```
 */
export const listPositions = new PreparedQuery<IListPositionsParams,IListPositionsResult>(listPositionsIR);


/** 'ListOperations' parameters type */
export interface IListOperationsParams {
  beforeAt?: DateOrString | null | void;
  beforeEntryId?: string | null | void;
  beforeId?: string | null | void;
  days?: number | null | void;
  destinations?: stringArray | null | void;
  filterLocationIds?: stringArray | null | void;
  fromDate?: string | null | void;
  itemIds?: stringArray | null | void;
  kind: string;
  limit: NumberOrString;
  locationIds: stringArray;
  positionId?: string | null | void;
  reasons?: stringArray | null | void;
  responsibleIds?: stringArray | null | void;
  timeZone: string;
  toDate?: string | null | void;
  types?: stringArray | null | void;
  workspaceId: string;
}

/** 'ListOperations' return type */
export interface IListOperationsResult {
  actor_name: string;
  actor_principal_id: string;
  balance_after: string;
  base_unit: string;
  container_code: string | null;
  cursor_at: string;
  destination: string | null;
  effective_at: Date;
  entry_id: string;
  id: string;
  item_code: string;
  item_id: string;
  item_name: string;
  location_code: string;
  lot_code: string;
  position_id: string;
  quantity: string;
  reason: string | null;
  reference: string | null;
  requested_by_principal_id: string | null;
  requester_name: string;
  type: string;
}

/** 'ListOperations' query type */
export interface IListOperationsQuery {
  params: IListOperationsParams;
  result: IListOperationsResult;
}

const listOperationsIR: any = {"usedParamSet":{"workspaceId":true,"kind":true,"locationIds":true,"types":true,"itemIds":true,"responsibleIds":true,"destinations":true,"reasons":true,"filterLocationIds":true,"positionId":true,"days":true,"timeZone":true,"fromDate":true,"toDate":true,"beforeId":true,"beforeAt":true,"beforeEntryId":true,"limit":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":2275,"b":2287}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":2304,"b":2309}]},{"name":"locationIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":2338,"b":2350}]},{"name":"types","required":false,"transform":{"type":"scalar"},"locs":[{"a":2368,"b":2373},{"a":2408,"b":2413}]},{"name":"itemIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":2432,"b":2439},{"a":2477,"b":2484}]},{"name":"responsibleIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":2508,"b":2522},{"a":2614,"b":2628}]},{"name":"destinations","required":false,"transform":{"type":"scalar"},"locs":[{"a":2650,"b":2662},{"a":2704,"b":2716}]},{"name":"reasons","required":false,"transform":{"type":"scalar"},"locs":[{"a":2735,"b":2742},{"a":2779,"b":2786}]},{"name":"filterLocationIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":2805,"b":2822},{"a":2864,"b":2881}]},{"name":"positionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2900,"b":2910},{"a":2936,"b":2946}]},{"name":"days","required":false,"transform":{"type":"scalar"},"locs":[{"a":3058,"b":3062},{"a":3145,"b":3149}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":3124,"b":3133},{"a":3186,"b":3195},{"a":3388,"b":3397},{"a":3495,"b":3504}]},{"name":"fromDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":3302,"b":3310},{"a":3348,"b":3356}]},{"name":"toDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":3408,"b":3414},{"a":3452,"b":3458}]},{"name":"beforeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":3520,"b":3528},{"a":3607,"b":3615}]},{"name":"beforeAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":3583,"b":3591}]},{"name":"beforeEntryId","required":false,"transform":{"type":"scalar"},"locs":[{"a":3624,"b":3637}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":3707,"b":3713}]}],"statement":"-- Un asiento por fila: un ingreso de varios frascos son varias filas de la misma operación. El\n-- cursor incluye el asiento para que una página nunca corte una operación a medias.\nSELECT\n  o.id,\n  e.id AS entry_id,\n  o.type,\n  o.effective_at,\n  -- Marca exacta (microsegundos, UTC) para el cursor; un Date de JavaScript la redondearía.\n  to_char(o.effective_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS \"cursor_at!\",\n  o.reason,\n  o.destination,\n  o.reference,\n  o.requested_by_principal_id,\n  o.actor_principal_id,\n  ident.display_name AS actor_name,\n  requester.display_name AS requester_name,\n  e.position_id,\n  trim_scale(e.quantity) AS \"quantity!\",\n  trim_scale(e.balance_after) AS \"balance_after!\",\n  p.item_id,\n  i.code AS item_code,\n  i.name AS item_name,\n  l.code AS lot_code,\n  CASE WHEN c.id IS NULL THEN NULL ELSE l.code || '-' || lpad(c.seq::text, 2, '0') END AS container_code,\n  loc.code AS location_code,\n  i.base_unit\nFROM inventory.operations AS o\nJOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id\nJOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nJOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\nLEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id\nJOIN core.locations AS loc ON loc.workspace_id = p.workspace_id AND loc.id = p.location_id\nLEFT JOIN core.principals AS pr ON pr.workspace_id = o.workspace_id AND pr.id = o.actor_principal_id\nLEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\nLEFT JOIN core.identities AS ident ON ident.id = m.identity_id\nLEFT JOIN core.principals AS rqp ON rqp.workspace_id = o.workspace_id AND rqp.id = o.requested_by_principal_id\nLEFT JOIN core.memberships AS rqm ON rqm.workspace_id = rqp.workspace_id AND rqm.id = rqp.membership_id\nLEFT JOIN core.identities AS requester ON requester.id = rqm.identity_id\n-- Filtros del libro (ADR 0014), los mismos en operationFacets y operationTotals: si cambian aquí,\n-- cambian allí. `locationIds` es el ámbito del miembro; `filterLocationIds` solo lo estrecha.\nWHERE o.workspace_id = :workspaceId!\n  AND i.kind = :kind!\n  AND p.location_id = ANY (:locationIds!::uuid[])\n  AND (:types::text[] IS NULL OR o.type = ANY (:types::text[]))\n  AND (:itemIds::uuid[] IS NULL OR p.item_id = ANY (:itemIds::uuid[]))\n  AND (\n    :responsibleIds::uuid[] IS NULL\n    OR coalesce(o.requested_by_principal_id, o.actor_principal_id) = ANY (:responsibleIds::uuid[])\n  )\n  AND (:destinations::text[] IS NULL OR o.destination = ANY (:destinations::text[]))\n  AND (:reasons::text[] IS NULL OR o.reason = ANY (:reasons::text[]))\n  AND (:filterLocationIds::uuid[] IS NULL OR p.location_id = ANY (:filterLocationIds::uuid[]))\n  AND (:positionId::uuid IS NULL OR p.id = :positionId::uuid)\n  -- Misma ventana que countOperationsByDay: desde la medianoche local de hace N - 1 días.\n  AND (\n    :days::int IS NULL\n    OR o.effective_at >= (((now() AT TIME ZONE :timeZone!)::date - (:days::int - 1))::timestamp AT TIME ZONE :timeZone!)\n  )\n  -- Desde la medianoche local de `fromDate` hasta antes de la del día siguiente a `toDate`.\n  AND (:fromDate::date IS NULL OR o.effective_at >= (:fromDate::date::timestamp AT TIME ZONE :timeZone!))\n  AND (:toDate::date IS NULL OR o.effective_at < ((:toDate::date + 1)::timestamp AT TIME ZONE :timeZone!))\n  AND (\n    :beforeId::uuid IS NULL\n    OR (o.effective_at, o.id, e.id) < (:beforeAt::timestamptz, :beforeId::uuid, :beforeEntryId::uuid)\n  )\nORDER BY o.effective_at DESC, o.id DESC, e.id DESC\nLIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * -- Un asiento por fila: un ingreso de varios frascos son varias filas de la misma operación. El
 * -- cursor incluye el asiento para que una página nunca corte una operación a medias.
 * SELECT
 *   o.id,
 *   e.id AS entry_id,
 *   o.type,
 *   o.effective_at,
 *   -- Marca exacta (microsegundos, UTC) para el cursor; un Date de JavaScript la redondearía.
 *   to_char(o.effective_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "cursor_at!",
 *   o.reason,
 *   o.destination,
 *   o.reference,
 *   o.requested_by_principal_id,
 *   o.actor_principal_id,
 *   ident.display_name AS actor_name,
 *   requester.display_name AS requester_name,
 *   e.position_id,
 *   trim_scale(e.quantity) AS "quantity!",
 *   trim_scale(e.balance_after) AS "balance_after!",
 *   p.item_id,
 *   i.code AS item_code,
 *   i.name AS item_name,
 *   l.code AS lot_code,
 *   CASE WHEN c.id IS NULL THEN NULL ELSE l.code || '-' || lpad(c.seq::text, 2, '0') END AS container_code,
 *   loc.code AS location_code,
 *   i.base_unit
 * FROM inventory.operations AS o
 * JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
 * JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 * JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
 * LEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id
 * JOIN core.locations AS loc ON loc.workspace_id = p.workspace_id AND loc.id = p.location_id
 * LEFT JOIN core.principals AS pr ON pr.workspace_id = o.workspace_id AND pr.id = o.actor_principal_id
 * LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 * LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
 * LEFT JOIN core.principals AS rqp ON rqp.workspace_id = o.workspace_id AND rqp.id = o.requested_by_principal_id
 * LEFT JOIN core.memberships AS rqm ON rqm.workspace_id = rqp.workspace_id AND rqm.id = rqp.membership_id
 * LEFT JOIN core.identities AS requester ON requester.id = rqm.identity_id
 * -- Filtros del libro (ADR 0014), los mismos en operationFacets y operationTotals: si cambian aquí,
 * -- cambian allí. `locationIds` es el ámbito del miembro; `filterLocationIds` solo lo estrecha.
 * WHERE o.workspace_id = :workspaceId!
 *   AND i.kind = :kind!
 *   AND p.location_id = ANY (:locationIds!::uuid[])
 *   AND (:types::text[] IS NULL OR o.type = ANY (:types::text[]))
 *   AND (:itemIds::uuid[] IS NULL OR p.item_id = ANY (:itemIds::uuid[]))
 *   AND (
 *     :responsibleIds::uuid[] IS NULL
 *     OR coalesce(o.requested_by_principal_id, o.actor_principal_id) = ANY (:responsibleIds::uuid[])
 *   )
 *   AND (:destinations::text[] IS NULL OR o.destination = ANY (:destinations::text[]))
 *   AND (:reasons::text[] IS NULL OR o.reason = ANY (:reasons::text[]))
 *   AND (:filterLocationIds::uuid[] IS NULL OR p.location_id = ANY (:filterLocationIds::uuid[]))
 *   AND (:positionId::uuid IS NULL OR p.id = :positionId::uuid)
 *   -- Misma ventana que countOperationsByDay: desde la medianoche local de hace N - 1 días.
 *   AND (
 *     :days::int IS NULL
 *     OR o.effective_at >= (((now() AT TIME ZONE :timeZone!)::date - (:days::int - 1))::timestamp AT TIME ZONE :timeZone!)
 *   )
 *   -- Desde la medianoche local de `fromDate` hasta antes de la del día siguiente a `toDate`.
 *   AND (:fromDate::date IS NULL OR o.effective_at >= (:fromDate::date::timestamp AT TIME ZONE :timeZone!))
 *   AND (:toDate::date IS NULL OR o.effective_at < ((:toDate::date + 1)::timestamp AT TIME ZONE :timeZone!))
 *   AND (
 *     :beforeId::uuid IS NULL
 *     OR (o.effective_at, o.id, e.id) < (:beforeAt::timestamptz, :beforeId::uuid, :beforeEntryId::uuid)
 *   )
 * ORDER BY o.effective_at DESC, o.id DESC, e.id DESC
 * LIMIT :limit!
 * ```
 */
export const listOperations = new PreparedQuery<IListOperationsParams,IListOperationsResult>(listOperationsIR);


/** 'CountOperationsByDay' parameters type */
export interface ICountOperationsByDayParams {
  days: number;
  kind: string;
  locationIds: stringArray;
  timeZone: string;
  type: string;
  workspaceId: string;
}

/** 'CountOperationsByDay' return type */
export interface ICountOperationsByDayResult {
  count: number;
  day: string;
}

/** 'CountOperationsByDay' query type */
export interface ICountOperationsByDayQuery {
  params: ICountOperationsByDayParams;
  result: ICountOperationsByDayResult;
}

const countOperationsByDayIR: any = {"usedParamSet":{"timeZone":true,"days":true,"workspaceId":true,"type":true,"kind":true,"locationIds":true},"params":[{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":312,"b":321},{"a":393,"b":402},{"a":589,"b":598},{"a":798,"b":807}]},{"name":"days","required":true,"transform":{"type":"scalar"},"locs":[{"a":333,"b":338}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":697,"b":709}]},{"name":"type","required":true,"transform":{"type":"scalar"},"locs":[{"a":728,"b":733}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":1159,"b":1164}]},{"name":"locationIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":1199,"b":1211}]}],"statement":"-- Operaciones de un tipo por día, en la zona del espacio y en las ubicaciones autorizadas, para\n-- los gráficos (ADR 0011). Cuenta sucesos: nunca suma cantidades de unidades distintas. Los días\n-- sin operaciones salen con cero para que el gráfico no salte fechas.\nWITH bounds AS (\n  SELECT (now() AT TIME ZONE :timeZone!)::date - (:days!::int - 1) AS first_day,\n         (now() AT TIME ZONE :timeZone!)::date AS last_day\n),\ndays AS (\n  SELECT generate_series(b.first_day, b.last_day, interval '1 day')::date AS day\n  FROM bounds AS b\n),\nscoped AS (\n  SELECT (o.effective_at AT TIME ZONE :timeZone!)::date AS day\n  FROM inventory.operations AS o\n  CROSS JOIN bounds AS b\n  WHERE o.workspace_id = :workspaceId!\n    AND o.type = :type!\n    AND o.effective_at >= (b.first_day::timestamp AT TIME ZONE :timeZone!)\n    AND EXISTS (\n      SELECT 1\n      FROM inventory.entries AS e\n      JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id\n      JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\n      WHERE e.workspace_id = o.workspace_id\n        AND e.operation_id = o.id\n        AND i.kind = :kind!\n        AND p.location_id = ANY (:locationIds!::uuid[])\n    )\n)\nSELECT to_char(d.day, 'YYYY-MM-DD') AS \"day!\", count(s.day)::int AS \"count!\"\nFROM days AS d\nLEFT JOIN scoped AS s ON s.day = d.day\nGROUP BY d.day\nORDER BY d.day"};

/**
 * Query generated from SQL:
 * ```
 * -- Operaciones de un tipo por día, en la zona del espacio y en las ubicaciones autorizadas, para
 * -- los gráficos (ADR 0011). Cuenta sucesos: nunca suma cantidades de unidades distintas. Los días
 * -- sin operaciones salen con cero para que el gráfico no salte fechas.
 * WITH bounds AS (
 *   SELECT (now() AT TIME ZONE :timeZone!)::date - (:days!::int - 1) AS first_day,
 *          (now() AT TIME ZONE :timeZone!)::date AS last_day
 * ),
 * days AS (
 *   SELECT generate_series(b.first_day, b.last_day, interval '1 day')::date AS day
 *   FROM bounds AS b
 * ),
 * scoped AS (
 *   SELECT (o.effective_at AT TIME ZONE :timeZone!)::date AS day
 *   FROM inventory.operations AS o
 *   CROSS JOIN bounds AS b
 *   WHERE o.workspace_id = :workspaceId!
 *     AND o.type = :type!
 *     AND o.effective_at >= (b.first_day::timestamp AT TIME ZONE :timeZone!)
 *     AND EXISTS (
 *       SELECT 1
 *       FROM inventory.entries AS e
 *       JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
 *       JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 *       WHERE e.workspace_id = o.workspace_id
 *         AND e.operation_id = o.id
 *         AND i.kind = :kind!
 *         AND p.location_id = ANY (:locationIds!::uuid[])
 *     )
 * )
 * SELECT to_char(d.day, 'YYYY-MM-DD') AS "day!", count(s.day)::int AS "count!"
 * FROM days AS d
 * LEFT JOIN scoped AS s ON s.day = d.day
 * GROUP BY d.day
 * ORDER BY d.day
 * ```
 */
export const countOperationsByDay = new PreparedQuery<ICountOperationsByDayParams,ICountOperationsByDayResult>(countOperationsByDayIR);


/** 'OperationFacets' parameters type */
export interface IOperationFacetsParams {
  days?: number | null | void;
  destinations?: stringArray | null | void;
  filterLocationIds?: stringArray | null | void;
  fromDate?: string | null | void;
  itemIds?: stringArray | null | void;
  kind: string;
  locationIds: stringArray;
  positionId?: string | null | void;
  productLimit: number;
  productQuery?: string | null | void;
  reasons?: stringArray | null | void;
  responsibleIds?: stringArray | null | void;
  timeZone: string;
  toDate?: string | null | void;
  types?: stringArray | null | void;
  workspaceId: string;
}

/** 'OperationFacets' return type */
export interface IOperationFacetsResult {
  code: string | null;
  count: number;
  facet: string;
  id: string | null;
  name: string | null;
  selected: boolean;
  value: string | null;
}

/** 'OperationFacets' query type */
export interface IOperationFacetsQuery {
  params: IOperationFacetsParams;
  result: IOperationFacetsResult;
}

const operationFacetsIR: any = {"usedParamSet":{"types":true,"itemIds":true,"responsibleIds":true,"destinations":true,"reasons":true,"filterLocationIds":true,"workspaceId":true,"kind":true,"locationIds":true,"positionId":true,"days":true,"timeZone":true,"fromDate":true,"toDate":true,"productQuery":true,"productLimit":true},"params":[{"name":"types","required":false,"transform":{"type":"scalar"},"locs":[{"a":699,"b":704},{"a":739,"b":744},{"a":3645,"b":3650}]},{"name":"itemIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":788,"b":795},{"a":833,"b":840},{"a":3716,"b":3723}]},{"name":"responsibleIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":891,"b":905},{"a":999,"b":1013},{"a":3793,"b":3807}]},{"name":"destinations","required":false,"transform":{"type":"scalar"},"locs":[{"a":1075,"b":1087},{"a":1129,"b":1141},{"a":3877,"b":3889}]},{"name":"reasons","required":false,"transform":{"type":"scalar"},"locs":[{"a":1192,"b":1199},{"a":1236,"b":1243},{"a":3954,"b":3961}]},{"name":"filterLocationIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1289,"b":1306},{"a":1348,"b":1365},{"a":4028,"b":4045}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1724,"b":1736},{"a":4826,"b":4838},{"a":4969,"b":4981},{"a":5138,"b":5150}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":1755,"b":1760},{"a":4856,"b":4861}]},{"name":"locationIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":1791,"b":1803},{"a":5027,"b":5039}]},{"name":"positionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1823,"b":1833},{"a":1859,"b":1869}]},{"name":"days","required":false,"transform":{"type":"scalar"},"locs":[{"a":1894,"b":1898},{"a":1983,"b":1987}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":1962,"b":1971},{"a":2024,"b":2033},{"a":2137,"b":2146},{"a":2246,"b":2255}]},{"name":"fromDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":2051,"b":2059},{"a":2097,"b":2105}]},{"name":"toDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":2159,"b":2165},{"a":2203,"b":2209}]},{"name":"productQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":5932,"b":5944},{"a":5997,"b":6009},{"a":6060,"b":6072}]},{"name":"productLimit","required":true,"transform":{"type":"scalar"},"locs":[{"a":6253,"b":6266}]}],"statement":"-- Asientos por opción de cada filtro de Movimientos (ADR 0014), en una sola lectura del libro para que\n-- el total y los grupos salgan de la misma instantánea. Faceta disyuntiva: cada grupo aplica todos los\n-- filtros menos el suyo, así marcar «Salidas» sigue contando los ingresos. Llegan las opciones con\n-- asientos y las elegidas aunque queden en cero (para poder quitarlas), pero nunca un reactivo de otro\n-- tipo, un principal de otro espacio ni una ubicación fuera del ámbito.\nWITH scoped AS MATERIALIZED (\n  SELECT\n    o.type,\n    p.item_id,\n    coalesce(o.requested_by_principal_id, o.actor_principal_id) AS responsible_id,\n    o.destination,\n    o.reason,\n    p.location_id,\n    coalesce(:types::text[] IS NULL OR o.type = ANY (:types::text[]), false) AS by_type,\n    coalesce(:itemIds::uuid[] IS NULL OR p.item_id = ANY (:itemIds::uuid[]), false) AS by_item,\n    coalesce(\n      :responsibleIds::uuid[] IS NULL\n      OR coalesce(o.requested_by_principal_id, o.actor_principal_id) = ANY (:responsibleIds::uuid[]),\n      false\n    ) AS by_responsible,\n    coalesce(:destinations::text[] IS NULL OR o.destination = ANY (:destinations::text[]), false) AS by_destination,\n    coalesce(:reasons::text[] IS NULL OR o.reason = ANY (:reasons::text[]), false) AS by_reason,\n    coalesce(:filterLocationIds::uuid[] IS NULL OR p.location_id = ANY (:filterLocationIds::uuid[]), false) AS by_location\n  FROM inventory.operations AS o\n  JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id\n  JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id\n  JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\n  WHERE o.workspace_id = :workspaceId!\n    AND i.kind = :kind!\n    AND p.location_id = ANY (:locationIds!::uuid[])\n    AND (:positionId::uuid IS NULL OR p.id = :positionId::uuid)\n    AND (\n      :days::int IS NULL\n      OR o.effective_at >= (((now() AT TIME ZONE :timeZone!)::date - (:days::int - 1))::timestamp AT TIME ZONE :timeZone!)\n    )\n    AND (:fromDate::date IS NULL OR o.effective_at >= (:fromDate::date::timestamp AT TIME ZONE :timeZone!))\n    AND (:toDate::date IS NULL OR o.effective_at < ((:toDate::date + 1)::timestamp AT TIME ZONE :timeZone!))\n),\ncounted AS (\n  SELECT 'total' AS facet, NULL::uuid AS id, NULL::text AS value, count(*) AS n\n  FROM scoped\n  WHERE by_type AND by_item AND by_responsible AND by_destination AND by_reason AND by_location\n  UNION ALL\n  SELECT 'type', NULL, type, count(*)\n  FROM scoped\n  WHERE by_item AND by_responsible AND by_destination AND by_reason AND by_location\n  GROUP BY type\n  UNION ALL\n  SELECT 'product', item_id, NULL, count(*)\n  FROM scoped\n  WHERE by_type AND by_responsible AND by_destination AND by_reason AND by_location\n  GROUP BY item_id\n  UNION ALL\n  SELECT 'responsible', responsible_id, NULL, count(*)\n  FROM scoped\n  WHERE by_type AND by_item AND by_destination AND by_reason AND by_location\n  GROUP BY responsible_id\n  UNION ALL\n  SELECT 'destination', NULL, destination, count(*)\n  FROM scoped\n  WHERE destination IS NOT NULL AND by_type AND by_item AND by_responsible AND by_reason AND by_location\n  GROUP BY destination\n  UNION ALL\n  SELECT 'reason', NULL, reason, count(*)\n  FROM scoped\n  WHERE reason IS NOT NULL AND by_type AND by_item AND by_responsible AND by_destination AND by_location\n  GROUP BY reason\n  UNION ALL\n  SELECT 'location', location_id, NULL, count(*)\n  FROM scoped\n  WHERE by_type AND by_item AND by_responsible AND by_destination AND by_reason\n  GROUP BY location_id\n),\nselected AS (\n  SELECT 'type' AS facet, NULL::uuid AS id, v AS value FROM unnest(:types::text[]) AS v\n  UNION ALL SELECT 'product', v, NULL FROM unnest(:itemIds::uuid[]) AS v\n  UNION ALL SELECT 'responsible', v, NULL FROM unnest(:responsibleIds::uuid[]) AS v\n  UNION ALL SELECT 'destination', NULL, v FROM unnest(:destinations::text[]) AS v\n  UNION ALL SELECT 'reason', NULL, v FROM unnest(:reasons::text[]) AS v\n  UNION ALL SELECT 'location', v, NULL FROM unnest(:filterLocationIds::uuid[]) AS v\n),\noptions AS (\n  SELECT\n    coalesce(c.facet, s.facet) AS facet,\n    coalesce(c.id, s.id) AS id,\n    coalesce(c.value, s.value) AS value,\n    coalesce(c.n, 0) AS n,\n    s.facet IS NOT NULL AS selected\n  FROM counted AS c\n  FULL JOIN selected AS s\n    ON s.facet = c.facet AND s.id IS NOT DISTINCT FROM c.id AND s.value IS NOT DISTINCT FROM c.value\n),\nnamed AS (\n  SELECT\n    op.facet,\n    op.id,\n    op.value,\n    op.n,\n    op.selected,\n    coalesce(item.code, loc.code) AS code,\n    CASE op.facet\n      WHEN 'product' THEN item.name\n      WHEN 'location' THEN loc.name\n      WHEN 'responsible' THEN ident.display_name\n      ELSE op.value\n    END AS name\n  FROM options AS op\n  LEFT JOIN inventory.items AS item\n    ON op.facet = 'product' AND item.workspace_id = :workspaceId! AND item.kind = :kind! AND item.id = op.id\n  LEFT JOIN core.locations AS loc\n    ON op.facet = 'location' AND loc.workspace_id = :workspaceId! AND loc.id = op.id\n       AND loc.id = ANY (:locationIds!::uuid[])\n  LEFT JOIN core.principals AS pr\n    ON op.facet = 'responsible' AND pr.workspace_id = :workspaceId! AND pr.id = op.id\n  LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\n  LEFT JOIN core.identities AS ident ON ident.id = m.identity_id\n  WHERE (op.facet <> 'product' OR item.id IS NOT NULL)\n    AND (op.facet <> 'location' OR loc.id IS NOT NULL)\n    AND (op.facet <> 'responsible' OR pr.id IS NOT NULL)\n),\nranked AS (\n  -- Reactivos: los elegidos siempre; de los demás, los que coinciden con la búsqueda, uno más del\n  -- límite para saber si hay más.\n  SELECT\n    nd.*,\n    CASE WHEN nd.facet = 'product' AND NOT nd.selected THEN\n      row_number() OVER (PARTITION BY nd.facet, nd.selected ORDER BY nd.n DESC, lower(nd.name), nd.id)\n    END AS product_rank\n  FROM named AS nd\n  WHERE nd.facet <> 'product'\n     OR nd.selected\n     OR :productQuery::text IS NULL\n     OR strpos(lower(nd.code), lower(:productQuery::text)) > 0\n     OR strpos(lower(nd.name), lower(:productQuery::text)) > 0\n)\nSELECT\n  facet AS \"facet!\",\n  id,\n  value,\n  code,\n  name,\n  n::int AS \"count!\",\n  selected AS \"selected!\"\nFROM ranked\nWHERE product_rank IS NULL OR product_rank <= :productLimit!::int + 1\nORDER BY facet, n DESC, lower(name), id, value"};

/**
 * Query generated from SQL:
 * ```
 * -- Asientos por opción de cada filtro de Movimientos (ADR 0014), en una sola lectura del libro para que
 * -- el total y los grupos salgan de la misma instantánea. Faceta disyuntiva: cada grupo aplica todos los
 * -- filtros menos el suyo, así marcar «Salidas» sigue contando los ingresos. Llegan las opciones con
 * -- asientos y las elegidas aunque queden en cero (para poder quitarlas), pero nunca un reactivo de otro
 * -- tipo, un principal de otro espacio ni una ubicación fuera del ámbito.
 * WITH scoped AS MATERIALIZED (
 *   SELECT
 *     o.type,
 *     p.item_id,
 *     coalesce(o.requested_by_principal_id, o.actor_principal_id) AS responsible_id,
 *     o.destination,
 *     o.reason,
 *     p.location_id,
 *     coalesce(:types::text[] IS NULL OR o.type = ANY (:types::text[]), false) AS by_type,
 *     coalesce(:itemIds::uuid[] IS NULL OR p.item_id = ANY (:itemIds::uuid[]), false) AS by_item,
 *     coalesce(
 *       :responsibleIds::uuid[] IS NULL
 *       OR coalesce(o.requested_by_principal_id, o.actor_principal_id) = ANY (:responsibleIds::uuid[]),
 *       false
 *     ) AS by_responsible,
 *     coalesce(:destinations::text[] IS NULL OR o.destination = ANY (:destinations::text[]), false) AS by_destination,
 *     coalesce(:reasons::text[] IS NULL OR o.reason = ANY (:reasons::text[]), false) AS by_reason,
 *     coalesce(:filterLocationIds::uuid[] IS NULL OR p.location_id = ANY (:filterLocationIds::uuid[]), false) AS by_location
 *   FROM inventory.operations AS o
 *   JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
 *   JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
 *   JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 *   WHERE o.workspace_id = :workspaceId!
 *     AND i.kind = :kind!
 *     AND p.location_id = ANY (:locationIds!::uuid[])
 *     AND (:positionId::uuid IS NULL OR p.id = :positionId::uuid)
 *     AND (
 *       :days::int IS NULL
 *       OR o.effective_at >= (((now() AT TIME ZONE :timeZone!)::date - (:days::int - 1))::timestamp AT TIME ZONE :timeZone!)
 *     )
 *     AND (:fromDate::date IS NULL OR o.effective_at >= (:fromDate::date::timestamp AT TIME ZONE :timeZone!))
 *     AND (:toDate::date IS NULL OR o.effective_at < ((:toDate::date + 1)::timestamp AT TIME ZONE :timeZone!))
 * ),
 * counted AS (
 *   SELECT 'total' AS facet, NULL::uuid AS id, NULL::text AS value, count(*) AS n
 *   FROM scoped
 *   WHERE by_type AND by_item AND by_responsible AND by_destination AND by_reason AND by_location
 *   UNION ALL
 *   SELECT 'type', NULL, type, count(*)
 *   FROM scoped
 *   WHERE by_item AND by_responsible AND by_destination AND by_reason AND by_location
 *   GROUP BY type
 *   UNION ALL
 *   SELECT 'product', item_id, NULL, count(*)
 *   FROM scoped
 *   WHERE by_type AND by_responsible AND by_destination AND by_reason AND by_location
 *   GROUP BY item_id
 *   UNION ALL
 *   SELECT 'responsible', responsible_id, NULL, count(*)
 *   FROM scoped
 *   WHERE by_type AND by_item AND by_destination AND by_reason AND by_location
 *   GROUP BY responsible_id
 *   UNION ALL
 *   SELECT 'destination', NULL, destination, count(*)
 *   FROM scoped
 *   WHERE destination IS NOT NULL AND by_type AND by_item AND by_responsible AND by_reason AND by_location
 *   GROUP BY destination
 *   UNION ALL
 *   SELECT 'reason', NULL, reason, count(*)
 *   FROM scoped
 *   WHERE reason IS NOT NULL AND by_type AND by_item AND by_responsible AND by_destination AND by_location
 *   GROUP BY reason
 *   UNION ALL
 *   SELECT 'location', location_id, NULL, count(*)
 *   FROM scoped
 *   WHERE by_type AND by_item AND by_responsible AND by_destination AND by_reason
 *   GROUP BY location_id
 * ),
 * selected AS (
 *   SELECT 'type' AS facet, NULL::uuid AS id, v AS value FROM unnest(:types::text[]) AS v
 *   UNION ALL SELECT 'product', v, NULL FROM unnest(:itemIds::uuid[]) AS v
 *   UNION ALL SELECT 'responsible', v, NULL FROM unnest(:responsibleIds::uuid[]) AS v
 *   UNION ALL SELECT 'destination', NULL, v FROM unnest(:destinations::text[]) AS v
 *   UNION ALL SELECT 'reason', NULL, v FROM unnest(:reasons::text[]) AS v
 *   UNION ALL SELECT 'location', v, NULL FROM unnest(:filterLocationIds::uuid[]) AS v
 * ),
 * options AS (
 *   SELECT
 *     coalesce(c.facet, s.facet) AS facet,
 *     coalesce(c.id, s.id) AS id,
 *     coalesce(c.value, s.value) AS value,
 *     coalesce(c.n, 0) AS n,
 *     s.facet IS NOT NULL AS selected
 *   FROM counted AS c
 *   FULL JOIN selected AS s
 *     ON s.facet = c.facet AND s.id IS NOT DISTINCT FROM c.id AND s.value IS NOT DISTINCT FROM c.value
 * ),
 * named AS (
 *   SELECT
 *     op.facet,
 *     op.id,
 *     op.value,
 *     op.n,
 *     op.selected,
 *     coalesce(item.code, loc.code) AS code,
 *     CASE op.facet
 *       WHEN 'product' THEN item.name
 *       WHEN 'location' THEN loc.name
 *       WHEN 'responsible' THEN ident.display_name
 *       ELSE op.value
 *     END AS name
 *   FROM options AS op
 *   LEFT JOIN inventory.items AS item
 *     ON op.facet = 'product' AND item.workspace_id = :workspaceId! AND item.kind = :kind! AND item.id = op.id
 *   LEFT JOIN core.locations AS loc
 *     ON op.facet = 'location' AND loc.workspace_id = :workspaceId! AND loc.id = op.id
 *        AND loc.id = ANY (:locationIds!::uuid[])
 *   LEFT JOIN core.principals AS pr
 *     ON op.facet = 'responsible' AND pr.workspace_id = :workspaceId! AND pr.id = op.id
 *   LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 *   LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
 *   WHERE (op.facet <> 'product' OR item.id IS NOT NULL)
 *     AND (op.facet <> 'location' OR loc.id IS NOT NULL)
 *     AND (op.facet <> 'responsible' OR pr.id IS NOT NULL)
 * ),
 * ranked AS (
 *   -- Reactivos: los elegidos siempre; de los demás, los que coinciden con la búsqueda, uno más del
 *   -- límite para saber si hay más.
 *   SELECT
 *     nd.*,
 *     CASE WHEN nd.facet = 'product' AND NOT nd.selected THEN
 *       row_number() OVER (PARTITION BY nd.facet, nd.selected ORDER BY nd.n DESC, lower(nd.name), nd.id)
 *     END AS product_rank
 *   FROM named AS nd
 *   WHERE nd.facet <> 'product'
 *      OR nd.selected
 *      OR :productQuery::text IS NULL
 *      OR strpos(lower(nd.code), lower(:productQuery::text)) > 0
 *      OR strpos(lower(nd.name), lower(:productQuery::text)) > 0
 * )
 * SELECT
 *   facet AS "facet!",
 *   id,
 *   value,
 *   code,
 *   name,
 *   n::int AS "count!",
 *   selected AS "selected!"
 * FROM ranked
 * WHERE product_rank IS NULL OR product_rank <= :productLimit!::int + 1
 * ORDER BY facet, n DESC, lower(name), id, value
 * ```
 */
export const operationFacets = new PreparedQuery<IOperationFacetsParams,IOperationFacetsResult>(operationFacetsIR);


/** 'OperationTotals' parameters type */
export interface IOperationTotalsParams {
  days?: number | null | void;
  destinations?: stringArray | null | void;
  filterLocationIds?: stringArray | null | void;
  fromDate?: string | null | void;
  groupBy: string;
  itemIds?: stringArray | null | void;
  kind: string;
  locationIds: stringArray;
  maxGroups: number;
  positionId?: string | null | void;
  reasons?: stringArray | null | void;
  responsibleIds?: stringArray | null | void;
  timeZone: string;
  toDate?: string | null | void;
  types?: stringArray | null | void;
  workspaceId: string;
}

/** 'OperationTotals' return type */
export interface IOperationTotalsResult {
  adjustments: string | null;
  base_unit: string;
  count: number;
  group_count: number;
  group_id: string | null;
  group_rank: number;
  group_text: string | null;
  groups_total: number;
  issues: string | null;
  item_code: string;
  item_id: string;
  item_name: string;
  label: string | null;
  net: string;
  receipts: string | null;
  transfers: number;
}

/** 'OperationTotals' query type */
export interface IOperationTotalsQuery {
  params: IOperationTotalsParams;
  result: IOperationTotalsResult;
}

const operationTotalsIR: any = {"usedParamSet":{"groupBy":true,"timeZone":true,"workspaceId":true,"kind":true,"locationIds":true,"types":true,"itemIds":true,"responsibleIds":true,"destinations":true,"reasons":true,"filterLocationIds":true,"positionId":true,"days":true,"fromDate":true,"toDate":true,"maxGroups":true},"params":[{"name":"groupBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":414,"b":422},{"a":586,"b":594},{"a":2881,"b":2889},{"a":3154,"b":3162},{"a":3283,"b":3291},{"a":3628,"b":3636}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":706,"b":715},{"a":1907,"b":1916},{"a":1969,"b":1978},{"a":2082,"b":2091},{"a":2191,"b":2200}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1119,"b":1131},{"a":3204,"b":3216},{"a":3337,"b":3349},{"a":4417,"b":4429}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":1150,"b":1155}]},{"name":"locationIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":1186,"b":1198}]},{"name":"types","required":false,"transform":{"type":"scalar"},"locs":[{"a":1218,"b":1223},{"a":1258,"b":1263}]},{"name":"itemIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1284,"b":1291},{"a":1329,"b":1336}]},{"name":"responsibleIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1364,"b":1378},{"a":1472,"b":1486}]},{"name":"destinations","required":false,"transform":{"type":"scalar"},"locs":[{"a":1512,"b":1524},{"a":1566,"b":1578}]},{"name":"reasons","required":false,"transform":{"type":"scalar"},"locs":[{"a":1599,"b":1606},{"a":1643,"b":1650}]},{"name":"filterLocationIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1671,"b":1688},{"a":1730,"b":1747}]},{"name":"positionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1768,"b":1778},{"a":1804,"b":1814}]},{"name":"days","required":false,"transform":{"type":"scalar"},"locs":[{"a":1839,"b":1843},{"a":1928,"b":1932}]},{"name":"fromDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":1996,"b":2004},{"a":2042,"b":2050}]},{"name":"toDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":2104,"b":2110},{"a":2148,"b":2154}]},{"name":"maxGroups","required":true,"transform":{"type":"scalar"},"locs":[{"a":4474,"b":4484}]}],"statement":"-- Totales del libro filtrado (ADR 0014), por reactivo, responsable, destino o mes en la zona del\n-- espacio. Cada fila es un reactivo dentro de su grupo, en su unidad base: nunca suma unidades\n-- distintas. Las sumas llevan signo y son exactas (numeric); un traslado se cuenta, pero no suma\n-- cantidad. Llegan los primeros `maxGroups` grupos y `groups_total` dice cuántos hay.\nWITH scoped AS (\n  SELECT\n    CASE :groupBy!::text\n      WHEN 'product' THEN p.item_id\n      WHEN 'responsible' THEN coalesce(o.requested_by_principal_id, o.actor_principal_id)\n    END AS group_id,\n    CASE :groupBy!::text\n      WHEN 'destination' THEN o.destination\n      WHEN 'month' THEN to_char(o.effective_at AT TIME ZONE :timeZone!, 'YYYY-MM')\n    END AS group_text,\n    p.item_id,\n    o.type,\n    e.quantity\n  FROM inventory.operations AS o\n  JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id\n  JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id\n  JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\n  WHERE o.workspace_id = :workspaceId!\n    AND i.kind = :kind!\n    AND p.location_id = ANY (:locationIds!::uuid[])\n    AND (:types::text[] IS NULL OR o.type = ANY (:types::text[]))\n    AND (:itemIds::uuid[] IS NULL OR p.item_id = ANY (:itemIds::uuid[]))\n    AND (\n      :responsibleIds::uuid[] IS NULL\n      OR coalesce(o.requested_by_principal_id, o.actor_principal_id) = ANY (:responsibleIds::uuid[])\n    )\n    AND (:destinations::text[] IS NULL OR o.destination = ANY (:destinations::text[]))\n    AND (:reasons::text[] IS NULL OR o.reason = ANY (:reasons::text[]))\n    AND (:filterLocationIds::uuid[] IS NULL OR p.location_id = ANY (:filterLocationIds::uuid[]))\n    AND (:positionId::uuid IS NULL OR p.id = :positionId::uuid)\n    AND (\n      :days::int IS NULL\n      OR o.effective_at >= (((now() AT TIME ZONE :timeZone!)::date - (:days::int - 1))::timestamp AT TIME ZONE :timeZone!)\n    )\n    AND (:fromDate::date IS NULL OR o.effective_at >= (:fromDate::date::timestamp AT TIME ZONE :timeZone!))\n    AND (:toDate::date IS NULL OR o.effective_at < ((:toDate::date + 1)::timestamp AT TIME ZONE :timeZone!))\n),\nper_item AS (\n  SELECT\n    group_id,\n    group_text,\n    item_id,\n    count(*) AS n,\n    sum(quantity) FILTER (WHERE type = 'receipt') AS receipts,\n    sum(quantity) FILTER (WHERE type = 'issue') AS issues,\n    sum(quantity) FILTER (WHERE type = 'adjustment') AS adjustments,\n    coalesce(sum(quantity) FILTER (WHERE type <> 'transfer'), 0) AS net,\n    count(*) FILTER (WHERE type = 'transfer') AS transfers\n  FROM scoped\n  GROUP BY group_id, group_text, item_id\n),\nlabelled AS (\n  -- PARTITION BY agrupa los nulos juntos: las operaciones sin destino forman un solo grupo.\n  SELECT\n    pi.*,\n    sum(pi.n) OVER (PARTITION BY pi.group_id, pi.group_text) AS group_n,\n    CASE :groupBy!::text\n      WHEN 'product' THEN gi.name\n      WHEN 'responsible' THEN ident.display_name\n      WHEN 'destination' THEN coalesce(pi.group_text, 'Sin destino')\n      ELSE pi.group_text\n    END AS label\n  FROM per_item AS pi\n  LEFT JOIN inventory.items AS gi\n    ON :groupBy!::text = 'product' AND gi.workspace_id = :workspaceId! AND gi.id = pi.group_id\n  LEFT JOIN core.principals AS pr\n    ON :groupBy!::text = 'responsible' AND pr.workspace_id = :workspaceId! AND pr.id = pi.group_id\n  LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\n  LEFT JOIN core.identities AS ident ON ident.id = m.identity_id\n),\nranked AS (\n  SELECT\n    l.*,\n    dense_rank() OVER (\n      ORDER BY\n        CASE WHEN :groupBy!::text = 'month' THEN l.group_text END DESC,\n        l.group_n DESC,\n        lower(l.label),\n        l.group_id,\n        l.group_text\n    ) AS group_rank\n  FROM labelled AS l\n),\ncounted AS (\n  SELECT r.*, max(r.group_rank) OVER () AS groups_total FROM ranked AS r\n)\nSELECT\n  c.group_rank::int AS \"group_rank!\",\n  c.group_id,\n  c.group_text,\n  c.label,\n  c.group_n::int AS \"group_count!\",\n  c.groups_total::int AS \"groups_total!\",\n  i.id AS item_id,\n  i.code AS item_code,\n  i.name AS item_name,\n  i.base_unit,\n  c.n::int AS \"count!\",\n  trim_scale(c.receipts) AS receipts,\n  trim_scale(c.issues) AS issues,\n  trim_scale(c.adjustments) AS adjustments,\n  trim_scale(c.net) AS \"net!\",\n  c.transfers::int AS \"transfers!\"\nFROM counted AS c\nJOIN inventory.items AS i ON i.workspace_id = :workspaceId! AND i.id = c.item_id\nWHERE c.group_rank <= :maxGroups!::int\nORDER BY c.group_rank, c.n DESC, lower(i.code), i.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Totales del libro filtrado (ADR 0014), por reactivo, responsable, destino o mes en la zona del
 * -- espacio. Cada fila es un reactivo dentro de su grupo, en su unidad base: nunca suma unidades
 * -- distintas. Las sumas llevan signo y son exactas (numeric); un traslado se cuenta, pero no suma
 * -- cantidad. Llegan los primeros `maxGroups` grupos y `groups_total` dice cuántos hay.
 * WITH scoped AS (
 *   SELECT
 *     CASE :groupBy!::text
 *       WHEN 'product' THEN p.item_id
 *       WHEN 'responsible' THEN coalesce(o.requested_by_principal_id, o.actor_principal_id)
 *     END AS group_id,
 *     CASE :groupBy!::text
 *       WHEN 'destination' THEN o.destination
 *       WHEN 'month' THEN to_char(o.effective_at AT TIME ZONE :timeZone!, 'YYYY-MM')
 *     END AS group_text,
 *     p.item_id,
 *     o.type,
 *     e.quantity
 *   FROM inventory.operations AS o
 *   JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
 *   JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
 *   JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 *   WHERE o.workspace_id = :workspaceId!
 *     AND i.kind = :kind!
 *     AND p.location_id = ANY (:locationIds!::uuid[])
 *     AND (:types::text[] IS NULL OR o.type = ANY (:types::text[]))
 *     AND (:itemIds::uuid[] IS NULL OR p.item_id = ANY (:itemIds::uuid[]))
 *     AND (
 *       :responsibleIds::uuid[] IS NULL
 *       OR coalesce(o.requested_by_principal_id, o.actor_principal_id) = ANY (:responsibleIds::uuid[])
 *     )
 *     AND (:destinations::text[] IS NULL OR o.destination = ANY (:destinations::text[]))
 *     AND (:reasons::text[] IS NULL OR o.reason = ANY (:reasons::text[]))
 *     AND (:filterLocationIds::uuid[] IS NULL OR p.location_id = ANY (:filterLocationIds::uuid[]))
 *     AND (:positionId::uuid IS NULL OR p.id = :positionId::uuid)
 *     AND (
 *       :days::int IS NULL
 *       OR o.effective_at >= (((now() AT TIME ZONE :timeZone!)::date - (:days::int - 1))::timestamp AT TIME ZONE :timeZone!)
 *     )
 *     AND (:fromDate::date IS NULL OR o.effective_at >= (:fromDate::date::timestamp AT TIME ZONE :timeZone!))
 *     AND (:toDate::date IS NULL OR o.effective_at < ((:toDate::date + 1)::timestamp AT TIME ZONE :timeZone!))
 * ),
 * per_item AS (
 *   SELECT
 *     group_id,
 *     group_text,
 *     item_id,
 *     count(*) AS n,
 *     sum(quantity) FILTER (WHERE type = 'receipt') AS receipts,
 *     sum(quantity) FILTER (WHERE type = 'issue') AS issues,
 *     sum(quantity) FILTER (WHERE type = 'adjustment') AS adjustments,
 *     coalesce(sum(quantity) FILTER (WHERE type <> 'transfer'), 0) AS net,
 *     count(*) FILTER (WHERE type = 'transfer') AS transfers
 *   FROM scoped
 *   GROUP BY group_id, group_text, item_id
 * ),
 * labelled AS (
 *   -- PARTITION BY agrupa los nulos juntos: las operaciones sin destino forman un solo grupo.
 *   SELECT
 *     pi.*,
 *     sum(pi.n) OVER (PARTITION BY pi.group_id, pi.group_text) AS group_n,
 *     CASE :groupBy!::text
 *       WHEN 'product' THEN gi.name
 *       WHEN 'responsible' THEN ident.display_name
 *       WHEN 'destination' THEN coalesce(pi.group_text, 'Sin destino')
 *       ELSE pi.group_text
 *     END AS label
 *   FROM per_item AS pi
 *   LEFT JOIN inventory.items AS gi
 *     ON :groupBy!::text = 'product' AND gi.workspace_id = :workspaceId! AND gi.id = pi.group_id
 *   LEFT JOIN core.principals AS pr
 *     ON :groupBy!::text = 'responsible' AND pr.workspace_id = :workspaceId! AND pr.id = pi.group_id
 *   LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 *   LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
 * ),
 * ranked AS (
 *   SELECT
 *     l.*,
 *     dense_rank() OVER (
 *       ORDER BY
 *         CASE WHEN :groupBy!::text = 'month' THEN l.group_text END DESC,
 *         l.group_n DESC,
 *         lower(l.label),
 *         l.group_id,
 *         l.group_text
 *     ) AS group_rank
 *   FROM labelled AS l
 * ),
 * counted AS (
 *   SELECT r.*, max(r.group_rank) OVER () AS groups_total FROM ranked AS r
 * )
 * SELECT
 *   c.group_rank::int AS "group_rank!",
 *   c.group_id,
 *   c.group_text,
 *   c.label,
 *   c.group_n::int AS "group_count!",
 *   c.groups_total::int AS "groups_total!",
 *   i.id AS item_id,
 *   i.code AS item_code,
 *   i.name AS item_name,
 *   i.base_unit,
 *   c.n::int AS "count!",
 *   trim_scale(c.receipts) AS receipts,
 *   trim_scale(c.issues) AS issues,
 *   trim_scale(c.adjustments) AS adjustments,
 *   trim_scale(c.net) AS "net!",
 *   c.transfers::int AS "transfers!"
 * FROM counted AS c
 * JOIN inventory.items AS i ON i.workspace_id = :workspaceId! AND i.id = c.item_id
 * WHERE c.group_rank <= :maxGroups!::int
 * ORDER BY c.group_rank, c.n DESC, lower(i.code), i.id
 * ```
 */
export const operationTotals = new PreparedQuery<IOperationTotalsParams,IOperationTotalsResult>(operationTotalsIR);


/** 'ListReasons' parameters type */
export interface IListReasonsParams {
  itemKind: string;
  kind: string;
  workspaceId: string;
}

/** 'ListReasons' return type */
export interface IListReasonsResult {
  id: string;
  name: string;
}

/** 'ListReasons' query type */
export interface IListReasonsQuery {
  params: IListReasonsParams;
  result: IListReasonsResult;
}

const listReasonsIR: any = {"usedParamSet":{"workspaceId":true,"itemKind":true,"kind":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":60,"b":72}]},{"name":"itemKind","required":true,"transform":{"type":"scalar"},"locs":[{"a":90,"b":99}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":112,"b":117}]}],"statement":"SELECT id, name\nFROM inventory.reasons\nWHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND kind = :kind! AND archived_at IS NULL\nORDER BY lower(name), id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, name
 * FROM inventory.reasons
 * WHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND kind = :kind! AND archived_at IS NULL
 * ORDER BY lower(name), id
 * ```
 */
export const listReasons = new PreparedQuery<IListReasonsParams,IListReasonsResult>(listReasonsIR);


/** 'InsertReason' parameters type */
export interface IInsertReasonParams {
  itemKind: string;
  kind: string;
  name: string;
  workspaceId: string;
}

/** 'InsertReason' return type */
export interface IInsertReasonResult {
  id: string;
  name: string;
}

/** 'InsertReason' query type */
export interface IInsertReasonQuery {
  params: IInsertReasonParams;
  result: IInsertReasonResult;
}

const insertReasonIR: any = {"usedParamSet":{"workspaceId":true,"itemKind":true,"kind":true,"name":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":196,"b":208},{"a":478,"b":490}]},{"name":"itemKind","required":true,"transform":{"type":"scalar"},"locs":[{"a":211,"b":220},{"a":508,"b":517}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":223,"b":228},{"a":530,"b":535}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":231,"b":236},{"a":561,"b":566}]}],"statement":"-- Repetir un nombre activo no crea otro: devuelve el existente (la lista no admite duplicados).\nWITH inserted AS (\n  INSERT INTO inventory.reasons (workspace_id, item_kind, kind, name)\n  VALUES (:workspaceId!, :itemKind!, :kind!, :name!)\n  ON CONFLICT (workspace_id, item_kind, kind, lower(name)) WHERE archived_at IS NULL DO NOTHING\n  RETURNING id, name\n)\nSELECT id AS \"id!\", name AS \"name!\" FROM inserted\nUNION ALL\nSELECT id, name FROM inventory.reasons\nWHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND kind = :kind! AND lower(name) = lower(:name!)\n  AND archived_at IS NULL\n  AND NOT EXISTS (SELECT 1 FROM inserted)"};

/**
 * Query generated from SQL:
 * ```
 * -- Repetir un nombre activo no crea otro: devuelve el existente (la lista no admite duplicados).
 * WITH inserted AS (
 *   INSERT INTO inventory.reasons (workspace_id, item_kind, kind, name)
 *   VALUES (:workspaceId!, :itemKind!, :kind!, :name!)
 *   ON CONFLICT (workspace_id, item_kind, kind, lower(name)) WHERE archived_at IS NULL DO NOTHING
 *   RETURNING id, name
 * )
 * SELECT id AS "id!", name AS "name!" FROM inserted
 * UNION ALL
 * SELECT id, name FROM inventory.reasons
 * WHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND kind = :kind! AND lower(name) = lower(:name!)
 *   AND archived_at IS NULL
 *   AND NOT EXISTS (SELECT 1 FROM inserted)
 * ```
 */
export const insertReason = new PreparedQuery<IInsertReasonParams,IInsertReasonResult>(insertReasonIR);


/** 'ArchiveReason' parameters type */
export interface IArchiveReasonParams {
  id: string;
  itemKind: string;
  workspaceId: string;
}

/** 'ArchiveReason' return type */
export interface IArchiveReasonResult {
  id: string;
}

/** 'ArchiveReason' query type */
export interface IArchiveReasonQuery {
  params: IArchiveReasonParams;
  result: IArchiveReasonResult;
}

const archiveReasonIR: any = {"usedParamSet":{"workspaceId":true,"itemKind":true,"id":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":70,"b":82}]},{"name":"itemKind","required":true,"transform":{"type":"scalar"},"locs":[{"a":100,"b":109}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":120,"b":123}]}],"statement":"UPDATE inventory.reasons\nSET archived_at = now()\nWHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND id = :id! AND archived_at IS NULL\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE inventory.reasons
 * SET archived_at = now()
 * WHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND id = :id! AND archived_at IS NULL
 * RETURNING id
 * ```
 */
export const archiveReason = new PreparedQuery<IArchiveReasonParams,IArchiveReasonResult>(archiveReasonIR);


/** 'ListDestinations' parameters type */
export interface IListDestinationsParams {
  itemKind: string;
  workspaceId: string;
}

/** 'ListDestinations' return type */
export interface IListDestinationsResult {
  id: string;
  name: string;
}

/** 'ListDestinations' query type */
export interface IListDestinationsQuery {
  params: IListDestinationsParams;
  result: IListDestinationsResult;
}

const listDestinationsIR: any = {"usedParamSet":{"workspaceId":true,"itemKind":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":65,"b":77}]},{"name":"itemKind","required":true,"transform":{"type":"scalar"},"locs":[{"a":95,"b":104}]}],"statement":"SELECT id, name\nFROM inventory.destinations\nWHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND archived_at IS NULL\nORDER BY lower(name), id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, name
 * FROM inventory.destinations
 * WHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND archived_at IS NULL
 * ORDER BY lower(name), id
 * ```
 */
export const listDestinations = new PreparedQuery<IListDestinationsParams,IListDestinationsResult>(listDestinationsIR);


/** 'InsertDestination' parameters type */
export interface IInsertDestinationParams {
  itemKind: string;
  name: string;
  workspaceId: string;
}

/** 'InsertDestination' return type */
export interface IInsertDestinationResult {
  id: string;
  name: string;
}

/** 'InsertDestination' query type */
export interface IInsertDestinationQuery {
  params: IInsertDestinationParams;
  result: IInsertDestinationResult;
}

const insertDestinationIR: any = {"usedParamSet":{"workspaceId":true,"itemKind":true,"name":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":98,"b":110},{"a":371,"b":383}]},{"name":"itemKind","required":true,"transform":{"type":"scalar"},"locs":[{"a":113,"b":122},{"a":401,"b":410}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":125,"b":130},{"a":436,"b":441}]}],"statement":"WITH inserted AS (\n  INSERT INTO inventory.destinations (workspace_id, item_kind, name)\n  VALUES (:workspaceId!, :itemKind!, :name!)\n  ON CONFLICT (workspace_id, item_kind, lower(name)) WHERE archived_at IS NULL DO NOTHING\n  RETURNING id, name\n)\nSELECT id AS \"id!\", name AS \"name!\" FROM inserted\nUNION ALL\nSELECT id, name FROM inventory.destinations\nWHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND lower(name) = lower(:name!) AND archived_at IS NULL\n  AND NOT EXISTS (SELECT 1 FROM inserted)"};

/**
 * Query generated from SQL:
 * ```
 * WITH inserted AS (
 *   INSERT INTO inventory.destinations (workspace_id, item_kind, name)
 *   VALUES (:workspaceId!, :itemKind!, :name!)
 *   ON CONFLICT (workspace_id, item_kind, lower(name)) WHERE archived_at IS NULL DO NOTHING
 *   RETURNING id, name
 * )
 * SELECT id AS "id!", name AS "name!" FROM inserted
 * UNION ALL
 * SELECT id, name FROM inventory.destinations
 * WHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND lower(name) = lower(:name!) AND archived_at IS NULL
 *   AND NOT EXISTS (SELECT 1 FROM inserted)
 * ```
 */
export const insertDestination = new PreparedQuery<IInsertDestinationParams,IInsertDestinationResult>(insertDestinationIR);


/** 'ArchiveDestination' parameters type */
export interface IArchiveDestinationParams {
  id: string;
  itemKind: string;
  workspaceId: string;
}

/** 'ArchiveDestination' return type */
export interface IArchiveDestinationResult {
  id: string;
}

/** 'ArchiveDestination' query type */
export interface IArchiveDestinationQuery {
  params: IArchiveDestinationParams;
  result: IArchiveDestinationResult;
}

const archiveDestinationIR: any = {"usedParamSet":{"workspaceId":true,"itemKind":true,"id":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":75,"b":87}]},{"name":"itemKind","required":true,"transform":{"type":"scalar"},"locs":[{"a":105,"b":114}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":125,"b":128}]}],"statement":"UPDATE inventory.destinations\nSET archived_at = now()\nWHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND id = :id! AND archived_at IS NULL\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE inventory.destinations
 * SET archived_at = now()
 * WHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND id = :id! AND archived_at IS NULL
 * RETURNING id
 * ```
 */
export const archiveDestination = new PreparedQuery<IArchiveDestinationParams,IArchiveDestinationResult>(archiveDestinationIR);


/** 'ReserveQuantity' parameters type */
export interface IReserveQuantityParams {
  positionId: string;
  quantity: string;
  workspaceId: string;
}

/** 'ReserveQuantity' return type */
export interface IReserveQuantityResult {
  available: string;
}

/** 'ReserveQuantity' query type */
export interface IReserveQuantityQuery {
  params: IReserveQuantityParams;
  result: IReserveQuantityResult;
}

const reserveQuantityIR: any = {"usedParamSet":{"quantity":true,"workspaceId":true,"positionId":true},"params":[{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":147,"b":156},{"a":273,"b":282}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":211,"b":223}]},{"name":"positionId","required":true,"transform":{"type":"scalar"},"locs":[{"a":234,"b":245}]}],"statement":"-- Aparta cantidad del frasco ya bloqueado para una solicitud: solo si lo disponible alcanza.\nUPDATE inventory.positions\nSET reserved = reserved + :quantity!::numeric, version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :positionId! AND balance - reserved >= :quantity!::numeric\nRETURNING trim_scale(balance - reserved) AS \"available!\""};

/**
 * Query generated from SQL:
 * ```
 * -- Aparta cantidad del frasco ya bloqueado para una solicitud: solo si lo disponible alcanza.
 * UPDATE inventory.positions
 * SET reserved = reserved + :quantity!::numeric, version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :positionId! AND balance - reserved >= :quantity!::numeric
 * RETURNING trim_scale(balance - reserved) AS "available!"
 * ```
 */
export const reserveQuantity = new PreparedQuery<IReserveQuantityParams,IReserveQuantityResult>(reserveQuantityIR);


/** 'ReleaseReserved' parameters type */
export interface IReleaseReservedParams {
  positionId: string;
  quantity: string;
  workspaceId: string;
}

/** 'ReleaseReserved' return type */
export interface IReleaseReservedResult {
  id: string;
}

/** 'ReleaseReserved' query type */
export interface IReleaseReservedQuery {
  params: IReleaseReservedParams;
  result: IReleaseReservedResult;
}

const releaseReservedIR: any = {"usedParamSet":{"quantity":true,"workspaceId":true,"positionId":true},"params":[{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":53,"b":62},{"a":169,"b":178}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":117,"b":129}]},{"name":"positionId","required":true,"transform":{"type":"scalar"},"locs":[{"a":140,"b":151}]}],"statement":"UPDATE inventory.positions\nSET reserved = reserved - :quantity!::numeric, version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :positionId! AND reserved >= :quantity!::numeric\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE inventory.positions
 * SET reserved = reserved - :quantity!::numeric, version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :positionId! AND reserved >= :quantity!::numeric
 * RETURNING id
 * ```
 */
export const releaseReserved = new PreparedQuery<IReleaseReservedParams,IReleaseReservedResult>(releaseReservedIR);


/** 'FulfillEntry' parameters type */
export interface IFulfillEntryParams {
  operationId: string;
  positionId: string;
  quantity: string;
  unit: string;
  workspaceId: string;
}

/** 'FulfillEntry' return type */
export interface IFulfillEntryResult {
  balance_after: string;
  quantity: string;
}

/** 'FulfillEntry' query type */
export interface IFulfillEntryQuery {
  params: IFulfillEntryParams;
  result: IFulfillEntryResult;
}

const fulfillEntryIR: any = {"usedParamSet":{"quantity":true,"workspaceId":true,"positionId":true,"operationId":true,"unit":true},"params":[{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":153,"b":162},{"a":196,"b":205},{"a":322,"b":331},{"a":553,"b":562},{"a":579,"b":588}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":262,"b":274},{"a":508,"b":520}]},{"name":"positionId","required":true,"transform":{"type":"scalar"},"locs":[{"a":289,"b":300}]},{"name":"operationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":523,"b":535}]},{"name":"unit","required":true,"transform":{"type":"scalar"},"locs":[{"a":600,"b":605}]}],"statement":"-- Aprobar: lo reservado sale del saldo y de la reserva a la vez, con su asiento.\nWITH moved AS (\n  UPDATE inventory.positions\n  SET balance = balance - :quantity!::numeric, reserved = reserved - :quantity!::numeric, version = version + 1\n  WHERE workspace_id = :workspaceId!\n    AND id = :positionId!\n    AND reserved >= :quantity!::numeric\n  RETURNING id, balance\n)\nINSERT INTO inventory.entries\n  (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)\nSELECT :workspaceId!, :operationId!, moved.id, -1 * :quantity!::numeric, -1 * :quantity!::numeric, :unit!, moved.balance\nFROM moved\nRETURNING trim_scale(quantity) AS \"quantity!\", trim_scale(balance_after) AS \"balance_after!\""};

/**
 * Query generated from SQL:
 * ```
 * -- Aprobar: lo reservado sale del saldo y de la reserva a la vez, con su asiento.
 * WITH moved AS (
 *   UPDATE inventory.positions
 *   SET balance = balance - :quantity!::numeric, reserved = reserved - :quantity!::numeric, version = version + 1
 *   WHERE workspace_id = :workspaceId!
 *     AND id = :positionId!
 *     AND reserved >= :quantity!::numeric
 *   RETURNING id, balance
 * )
 * INSERT INTO inventory.entries
 *   (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)
 * SELECT :workspaceId!, :operationId!, moved.id, -1 * :quantity!::numeric, -1 * :quantity!::numeric, :unit!, moved.balance
 * FROM moved
 * RETURNING trim_scale(quantity) AS "quantity!", trim_scale(balance_after) AS "balance_after!"
 * ```
 */
export const fulfillEntry = new PreparedQuery<IFulfillEntryParams,IFulfillEntryResult>(fulfillEntryIR);


/** 'InsertAllocation' parameters type */
export interface IInsertAllocationParams {
  destination: string;
  positionId: string;
  principalId: string;
  quantity: string;
  reason: string;
  workspaceId: string;
}

/** 'InsertAllocation' return type */
export interface IInsertAllocationResult {
  created_at: Date;
  id: string;
}

/** 'InsertAllocation' query type */
export interface IInsertAllocationQuery {
  params: IInsertAllocationParams;
  result: IInsertAllocationResult;
}

const insertAllocationIR: any = {"usedParamSet":{"workspaceId":true,"positionId":true,"quantity":true,"reason":true,"destination":true,"principalId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":128,"b":140}]},{"name":"positionId","required":true,"transform":{"type":"scalar"},"locs":[{"a":143,"b":154}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":157,"b":166}]},{"name":"reason","required":true,"transform":{"type":"scalar"},"locs":[{"a":178,"b":185}]},{"name":"destination","required":true,"transform":{"type":"scalar"},"locs":[{"a":188,"b":200}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":203,"b":215}]}],"statement":"INSERT INTO inventory.allocations (workspace_id, position_id, quantity, reason, destination, requested_by_principal_id)\nVALUES (:workspaceId!, :positionId!, :quantity!::numeric, :reason!, :destination!, :principalId!)\nRETURNING id, created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO inventory.allocations (workspace_id, position_id, quantity, reason, destination, requested_by_principal_id)
 * VALUES (:workspaceId!, :positionId!, :quantity!::numeric, :reason!, :destination!, :principalId!)
 * RETURNING id, created_at
 * ```
 */
export const insertAllocation = new PreparedQuery<IInsertAllocationParams,IInsertAllocationResult>(insertAllocationIR);


/** 'FindAllocation' parameters type */
export interface IFindAllocationParams {
  allocationId: string;
  kind: string;
  workspaceId: string;
}

/** 'FindAllocation' return type */
export interface IFindAllocationResult {
  id: string;
  position_id: string;
}

/** 'FindAllocation' query type */
export interface IFindAllocationQuery {
  params: IFindAllocationParams;
  result: IFindAllocationResult;
}

const findAllocationIR: any = {"usedParamSet":{"workspaceId":true,"allocationId":true,"kind":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":336,"b":348}]},{"name":"allocationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":361,"b":374}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":389,"b":394}]}],"statement":"-- Sin bloqueo: solo para conocer el frasco, que se bloquea antes que la reserva.\nSELECT a.id, a.position_id\nFROM inventory.allocations AS a\nJOIN inventory.positions AS p ON p.workspace_id = a.workspace_id AND p.id = a.position_id\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nWHERE a.workspace_id = :workspaceId! AND a.id = :allocationId! AND i.kind = :kind!"};

/**
 * Query generated from SQL:
 * ```
 * -- Sin bloqueo: solo para conocer el frasco, que se bloquea antes que la reserva.
 * SELECT a.id, a.position_id
 * FROM inventory.allocations AS a
 * JOIN inventory.positions AS p ON p.workspace_id = a.workspace_id AND p.id = a.position_id
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 * WHERE a.workspace_id = :workspaceId! AND a.id = :allocationId! AND i.kind = :kind!
 * ```
 */
export const findAllocation = new PreparedQuery<IFindAllocationParams,IFindAllocationResult>(findAllocationIR);


/** 'LockAllocation' parameters type */
export interface ILockAllocationParams {
  allocationId: string;
  workspaceId: string;
}

/** 'LockAllocation' return type */
export interface ILockAllocationResult {
  destination: string;
  id: string;
  position_id: string;
  quantity: string;
  reason: string;
  requested_by_principal_id: string;
  status: string;
}

/** 'LockAllocation' query type */
export interface ILockAllocationQuery {
  params: ILockAllocationParams;
  result: ILockAllocationResult;
}

const lockAllocationIR: any = {"usedParamSet":{"workspaceId":true,"allocationId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":164,"b":176}]},{"name":"allocationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":187,"b":200}]}],"statement":"SELECT id, position_id, status, trim_scale(quantity) AS \"quantity!\", reason, destination, requested_by_principal_id\nFROM inventory.allocations\nWHERE workspace_id = :workspaceId! AND id = :allocationId!\nFOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, position_id, status, trim_scale(quantity) AS "quantity!", reason, destination, requested_by_principal_id
 * FROM inventory.allocations
 * WHERE workspace_id = :workspaceId! AND id = :allocationId!
 * FOR UPDATE
 * ```
 */
export const lockAllocation = new PreparedQuery<ILockAllocationParams,ILockAllocationResult>(lockAllocationIR);


/** 'DecideAllocation' parameters type */
export interface IDecideAllocationParams {
  allocationId: string;
  decisionReason?: string | null | void;
  operationId?: string | null | void;
  principalId: string;
  status: string;
  workspaceId: string;
}

/** 'DecideAllocation' return type */
export interface IDecideAllocationResult {
  decided_at: Date | null;
  id: string;
}

/** 'DecideAllocation' query type */
export interface IDecideAllocationQuery {
  params: IDecideAllocationParams;
  result: IDecideAllocationResult;
}

const decideAllocationIR: any = {"usedParamSet":{"status":true,"principalId":true,"decisionReason":true,"operationId":true,"workspaceId":true,"allocationId":true},"params":[{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":42,"b":49}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":78,"b":90}]},{"name":"decisionReason","required":false,"transform":{"type":"scalar"},"locs":[{"a":135,"b":149}]},{"name":"operationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":167,"b":178}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":224,"b":236}]},{"name":"allocationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":247,"b":260}]}],"statement":"UPDATE inventory.allocations\nSET status = :status!, decided_by_principal_id = :principalId!, decided_at = now(),\n    decision_reason = :decisionReason, operation_id = :operationId, version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :allocationId! AND status = 'held'\nRETURNING id, decided_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE inventory.allocations
 * SET status = :status!, decided_by_principal_id = :principalId!, decided_at = now(),
 *     decision_reason = :decisionReason, operation_id = :operationId, version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :allocationId! AND status = 'held'
 * RETURNING id, decided_at
 * ```
 */
export const decideAllocation = new PreparedQuery<IDecideAllocationParams,IDecideAllocationResult>(decideAllocationIR);


/** 'ListAllocations' parameters type */
export interface IListAllocationsParams {
  kind: string;
  limit: NumberOrString;
  locationIds: stringArray;
  requestedBy?: string | null | void;
  status?: string | null | void;
  workspaceId: string;
}

/** 'ListAllocations' return type */
export interface IListAllocationsResult {
  base_unit: string;
  container_code: string | null;
  created_at: Date;
  decided_at: Date | null;
  decided_by_principal_id: string | null;
  decider_name: string;
  decision_reason: string | null;
  destination: string;
  id: string;
  item_id: string;
  item_name: string;
  location_code: string;
  location_name: string;
  lot_code: string;
  position_id: string;
  quantity: string;
  reason: string;
  requested_by_principal_id: string;
  requester_name: string;
  status: string;
}

/** 'ListAllocations' query type */
export interface IListAllocationsQuery {
  params: IListAllocationsParams;
  result: IListAllocationsResult;
}

const listAllocationsIR: any = {"usedParamSet":{"workspaceId":true,"kind":true,"locationIds":true,"status":true,"requestedBy":true,"limit":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1682,"b":1694}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":1711,"b":1716}]},{"name":"locationIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":1745,"b":1757}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":1775,"b":1781},{"a":1811,"b":1817}]},{"name":"requestedBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":1833,"b":1844},{"a":1893,"b":1904}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":1983,"b":1989}]}],"statement":"-- Solicitudes en las ubicaciones autorizadas; `requestedBy` acota a las propias.\nSELECT\n  a.id,\n  a.status,\n  trim_scale(a.quantity) AS \"quantity!\",\n  a.reason,\n  a.destination,\n  a.decision_reason,\n  a.created_at,\n  a.decided_at,\n  a.position_id,\n  a.requested_by_principal_id,\n  a.decided_by_principal_id,\n  requester.display_name AS requester_name,\n  decider.display_name AS decider_name,\n  i.id AS item_id,\n  i.name AS item_name,\n  i.base_unit,\n  l.code AS lot_code,\n  CASE WHEN c.id IS NULL THEN NULL ELSE l.code || '-' || lpad(c.seq::text, 2, '0') END AS container_code,\n  loc.code AS location_code,\n  loc.name AS location_name\nFROM inventory.allocations AS a\nJOIN inventory.positions AS p ON p.workspace_id = a.workspace_id AND p.id = a.position_id\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nJOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\nLEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id\nJOIN core.locations AS loc ON loc.workspace_id = p.workspace_id AND loc.id = p.location_id\nLEFT JOIN core.principals AS rp ON rp.workspace_id = a.workspace_id AND rp.id = a.requested_by_principal_id\nLEFT JOIN core.memberships AS rm ON rm.workspace_id = rp.workspace_id AND rm.id = rp.membership_id\nLEFT JOIN core.identities AS requester ON requester.id = rm.identity_id\nLEFT JOIN core.principals AS dp ON dp.workspace_id = a.workspace_id AND dp.id = a.decided_by_principal_id\nLEFT JOIN core.memberships AS dm ON dm.workspace_id = dp.workspace_id AND dm.id = dp.membership_id\nLEFT JOIN core.identities AS decider ON decider.id = dm.identity_id\nWHERE a.workspace_id = :workspaceId!\n  AND i.kind = :kind!\n  AND p.location_id = ANY (:locationIds!::uuid[])\n  AND (:status::text IS NULL OR a.status = :status::text)\n  AND (:requestedBy::uuid IS NULL OR a.requested_by_principal_id = :requestedBy::uuid)\nORDER BY (a.status = 'held') DESC, a.created_at DESC, a.id DESC\nLIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * -- Solicitudes en las ubicaciones autorizadas; `requestedBy` acota a las propias.
 * SELECT
 *   a.id,
 *   a.status,
 *   trim_scale(a.quantity) AS "quantity!",
 *   a.reason,
 *   a.destination,
 *   a.decision_reason,
 *   a.created_at,
 *   a.decided_at,
 *   a.position_id,
 *   a.requested_by_principal_id,
 *   a.decided_by_principal_id,
 *   requester.display_name AS requester_name,
 *   decider.display_name AS decider_name,
 *   i.id AS item_id,
 *   i.name AS item_name,
 *   i.base_unit,
 *   l.code AS lot_code,
 *   CASE WHEN c.id IS NULL THEN NULL ELSE l.code || '-' || lpad(c.seq::text, 2, '0') END AS container_code,
 *   loc.code AS location_code,
 *   loc.name AS location_name
 * FROM inventory.allocations AS a
 * JOIN inventory.positions AS p ON p.workspace_id = a.workspace_id AND p.id = a.position_id
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 * JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
 * LEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id
 * JOIN core.locations AS loc ON loc.workspace_id = p.workspace_id AND loc.id = p.location_id
 * LEFT JOIN core.principals AS rp ON rp.workspace_id = a.workspace_id AND rp.id = a.requested_by_principal_id
 * LEFT JOIN core.memberships AS rm ON rm.workspace_id = rp.workspace_id AND rm.id = rp.membership_id
 * LEFT JOIN core.identities AS requester ON requester.id = rm.identity_id
 * LEFT JOIN core.principals AS dp ON dp.workspace_id = a.workspace_id AND dp.id = a.decided_by_principal_id
 * LEFT JOIN core.memberships AS dm ON dm.workspace_id = dp.workspace_id AND dm.id = dp.membership_id
 * LEFT JOIN core.identities AS decider ON decider.id = dm.identity_id
 * WHERE a.workspace_id = :workspaceId!
 *   AND i.kind = :kind!
 *   AND p.location_id = ANY (:locationIds!::uuid[])
 *   AND (:status::text IS NULL OR a.status = :status::text)
 *   AND (:requestedBy::uuid IS NULL OR a.requested_by_principal_id = :requestedBy::uuid)
 * ORDER BY (a.status = 'held') DESC, a.created_at DESC, a.id DESC
 * LIMIT :limit!
 * ```
 */
export const listAllocations = new PreparedQuery<IListAllocationsParams,IListAllocationsResult>(listAllocationsIR);


/** 'CountPendingAllocations' parameters type */
export interface ICountPendingAllocationsParams {
  kind: string;
  locationIds: stringArray;
  requestedBy?: string | null | void;
  workspaceId: string;
}

/** 'CountPendingAllocations' return type */
export interface ICountPendingAllocationsResult {
  count: number;
}

/** 'CountPendingAllocations' query type */
export interface ICountPendingAllocationsQuery {
  params: ICountPendingAllocationsParams;
  result: ICountPendingAllocationsResult;
}

const countPendingAllocationsIR: any = {"usedParamSet":{"workspaceId":true,"kind":true,"locationIds":true,"requestedBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":260,"b":272}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":289,"b":294}]},{"name":"locationIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":347,"b":359}]},{"name":"requestedBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":377,"b":388},{"a":437,"b":448}]}],"statement":"SELECT count(*)::int AS \"count!\"\nFROM inventory.allocations AS a\nJOIN inventory.positions AS p ON p.workspace_id = a.workspace_id AND p.id = a.position_id\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nWHERE a.workspace_id = :workspaceId!\n  AND i.kind = :kind!\n  AND a.status = 'held'\n  AND p.location_id = ANY (:locationIds!::uuid[])\n  AND (:requestedBy::uuid IS NULL OR a.requested_by_principal_id = :requestedBy::uuid)"};

/**
 * Query generated from SQL:
 * ```
 * SELECT count(*)::int AS "count!"
 * FROM inventory.allocations AS a
 * JOIN inventory.positions AS p ON p.workspace_id = a.workspace_id AND p.id = a.position_id
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 * WHERE a.workspace_id = :workspaceId!
 *   AND i.kind = :kind!
 *   AND a.status = 'held'
 *   AND p.location_id = ANY (:locationIds!::uuid[])
 *   AND (:requestedBy::uuid IS NULL OR a.requested_by_principal_id = :requestedBy::uuid)
 * ```
 */
export const countPendingAllocations = new PreparedQuery<ICountPendingAllocationsParams,ICountPendingAllocationsResult>(countPendingAllocationsIR);


