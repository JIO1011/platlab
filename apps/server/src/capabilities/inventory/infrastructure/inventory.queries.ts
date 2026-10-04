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
  name: string;
  workspaceId: string;
}

/** 'InsertItem' return type */
export interface IInsertItemResult {
  base_unit: string;
  code: string;
  id: string;
  name: string;
}

/** 'InsertItem' query type */
export interface IInsertItemQuery {
  params: IInsertItemParams;
  result: IInsertItemResult;
}

const insertItemIR: any = {"usedParamSet":{"workspaceId":true,"kind":true,"code":true,"name":true,"baseUnit":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":80,"b":92}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":95,"b":100}]},{"name":"code","required":true,"transform":{"type":"scalar"},"locs":[{"a":103,"b":108}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":111,"b":116}]},{"name":"baseUnit","required":true,"transform":{"type":"scalar"},"locs":[{"a":119,"b":128}]}],"statement":"INSERT INTO inventory.items (workspace_id, kind, code, name, base_unit)\nVALUES (:workspaceId!, :kind!, :code!, :name!, :baseUnit!)\nRETURNING id, code, name, base_unit"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO inventory.items (workspace_id, kind, code, name, base_unit)
 * VALUES (:workspaceId!, :kind!, :code!, :name!, :baseUnit!)
 * RETURNING id, code, name, base_unit
 * ```
 */
export const insertItem = new PreparedQuery<IInsertItemParams,IInsertItemResult>(insertItemIR);


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
  condition: string;
  id: string;
  item_id: string;
}

/** 'FindLot' query type */
export interface IFindLotQuery {
  params: IFindLotParams;
  result: IFindLotResult;
}

const findLotIR: any = {"usedParamSet":{"workspaceId":true,"lotId":true,"kind":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":187,"b":199}]},{"name":"lotId","required":true,"transform":{"type":"scalar"},"locs":[{"a":212,"b":218}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":233,"b":238}]}],"statement":"SELECT l.id, l.item_id, l.code, l.condition, i.base_unit\nFROM inventory.lots AS l\nJOIN inventory.items AS i ON i.workspace_id = l.workspace_id AND i.id = l.item_id\nWHERE l.workspace_id = :workspaceId! AND l.id = :lotId! AND i.kind = :kind! AND i.archived_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT l.id, l.item_id, l.code, l.condition, i.base_unit
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
  condition: string;
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

const lockPositionIR: any = {"usedParamSet":{"workspaceId":true,"positionId":true,"kind":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":396,"b":408}]},{"name":"positionId","required":true,"transform":{"type":"scalar"},"locs":[{"a":421,"b":432}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":447,"b":452}]}],"statement":"-- Bloquea la posición antes de leer su saldo: salidas y ajustes descuentan bajo el mismo bloqueo.\nSELECT p.id, p.location_id, p.disposition, l.condition, l.expires_on, i.base_unit\nFROM inventory.positions AS p\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nJOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\nWHERE p.workspace_id = :workspaceId! AND p.id = :positionId! AND i.kind = :kind!\nFOR UPDATE OF p"};

/**
 * Query generated from SQL:
 * ```
 * -- Bloquea la posición antes de leer su saldo: salidas y ajustes descuentan bajo el mismo bloqueo.
 * SELECT p.id, p.location_id, p.disposition, l.condition, l.expires_on, i.base_unit
 * FROM inventory.positions AS p
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 * JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
 * WHERE p.workspace_id = :workspaceId! AND p.id = :positionId! AND i.kind = :kind!
 * FOR UPDATE OF p
 * ```
 */
export const lockPosition = new PreparedQuery<ILockPositionParams,ILockPositionResult>(lockPositionIR);


/** 'InsertOperation' parameters type */
export interface IInsertOperationParams {
  correlationId: string;
  destination?: string | null | void;
  principalId: string;
  reason?: string | null | void;
  reference?: string | null | void;
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

const insertOperationIR: any = {"usedParamSet":{"workspaceId":true,"type":true,"principalId":true,"reason":true,"destination":true,"reference":true,"correlationId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":205,"b":217}]},{"name":"type","required":true,"transform":{"type":"scalar"},"locs":[{"a":220,"b":225}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":228,"b":240}]},{"name":"reason","required":false,"transform":{"type":"scalar"},"locs":[{"a":243,"b":249}]},{"name":"destination","required":false,"transform":{"type":"scalar"},"locs":[{"a":252,"b":263}]},{"name":"reference","required":false,"transform":{"type":"scalar"},"locs":[{"a":266,"b":275}]},{"name":"correlationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":278,"b":292}]}],"statement":"-- La fecha efectiva la fija la base (el runtime no puede escribirla).\nINSERT INTO inventory.operations\n  (workspace_id, type, actor_principal_id, reason, destination, reference, correlation_id)\nVALUES\n  (:workspaceId!, :type!, :principalId!, :reason, :destination, :reference, :correlationId!)\nRETURNING id, effective_at"};

/**
 * Query generated from SQL:
 * ```
 * -- La fecha efectiva la fija la base (el runtime no puede escribirla).
 * INSERT INTO inventory.operations
 *   (workspace_id, type, actor_principal_id, reason, destination, reference, correlation_id)
 * VALUES
 *   (:workspaceId!, :type!, :principalId!, :reason, :destination, :reference, :correlationId!)
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

const applyEntryIR: any = {"usedParamSet":{"sign":true,"quantity":true,"workspaceId":true,"positionId":true,"operationId":true,"unit":true},"params":[{"name":"sign","required":true,"transform":{"type":"scalar"},"locs":[{"a":242,"b":247},{"a":375,"b":380},{"a":615,"b":620},{"a":652,"b":657}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":251,"b":260},{"a":384,"b":393},{"a":624,"b":633},{"a":661,"b":670}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":317,"b":329},{"a":575,"b":587}]},{"name":"positionId","required":true,"transform":{"type":"scalar"},"locs":[{"a":344,"b":355}]},{"name":"operationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":590,"b":602}]},{"name":"unit","required":true,"transform":{"type":"scalar"},"locs":[{"a":682,"b":687}]}],"statement":"-- Saldo y asiento en una sola sentencia sobre la posición ya bloqueada. Si el saldo no alcanza,\n-- no actualiza ni inserta nada y el comando responde stock insuficiente.\nWITH moved AS (\n  UPDATE inventory.positions\n  SET balance = balance + :sign! * :quantity!::numeric, version = version + 1\n  WHERE workspace_id = :workspaceId!\n    AND id = :positionId!\n    AND balance + :sign! * :quantity!::numeric >= 0\n  RETURNING id, balance\n)\nINSERT INTO inventory.entries\n  (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)\nSELECT :workspaceId!, :operationId!, moved.id, :sign! * :quantity!::numeric,\n       :sign! * :quantity!::numeric, :unit!, moved.balance\nFROM moved\nRETURNING trim_scale(quantity) AS \"quantity!\", trim_scale(balance_after) AS \"balance_after!\""};

/**
 * Query generated from SQL:
 * ```
 * -- Saldo y asiento en una sola sentencia sobre la posición ya bloqueada. Si el saldo no alcanza,
 * -- no actualiza ni inserta nada y el comando responde stock insuficiente.
 * WITH moved AS (
 *   UPDATE inventory.positions
 *   SET balance = balance + :sign! * :quantity!::numeric, version = version + 1
 *   WHERE workspace_id = :workspaceId!
 *     AND id = :positionId!
 *     AND balance + :sign! * :quantity!::numeric >= 0
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
  lot_condition: string;
  lot_id: string;
  sort_item: string;
  sort_location: string;
  sort_lot: string;
  sort_seq: number;
}

/** 'ListPositions' query type */
export interface IListPositionsQuery {
  params: IListPositionsParams;
  result: IListPositionsResult;
}

const listPositionsIR: any = {"usedParamSet":{"workspaceId":true,"kind":true,"locationIds":true,"itemId":true,"afterId":true,"afterItem":true,"afterLot":true,"afterSeq":true,"afterLocation":true,"limit":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1062,"b":1074}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":1091,"b":1096}]},{"name":"locationIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":1125,"b":1137}]},{"name":"itemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1155,"b":1161},{"a":1192,"b":1198}]},{"name":"afterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1530,"b":1537},{"a":1717,"b":1724}]},{"name":"afterItem","required":false,"transform":{"type":"scalar"},"locs":[{"a":1644,"b":1653}]},{"name":"afterLot","required":false,"transform":{"type":"scalar"},"locs":[{"a":1662,"b":1670}]},{"name":"afterSeq","required":false,"transform":{"type":"scalar"},"locs":[{"a":1679,"b":1687}]},{"name":"afterLocation","required":false,"transform":{"type":"scalar"},"locs":[{"a":1695,"b":1708}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":1824,"b":1830}]}],"statement":"SELECT\n  p.id,\n  i.id AS item_id,\n  i.code AS item_code,\n  i.name AS item_name,\n  l.id AS lot_id,\n  l.code AS lot_code,\n  l.expires_on,\n  l.condition AS lot_condition,\n  p.disposition,\n  c.id AS \"container_id?\",\n  CASE WHEN c.id IS NULL THEN NULL ELSE l.code || '-' || lpad(c.seq::text, 2, '0') END AS container_code,\n  trim_scale(c.initial_quantity) AS container_initial_quantity,\n  loc.id AS location_id,\n  loc.code AS location_code,\n  loc.name AS location_name,\n  trim_scale(p.balance) AS \"balance!\",\n  i.base_unit,\n  lower(i.code) AS \"sort_item!\",\n  lower(l.code) AS \"sort_lot!\",\n  coalesce(c.seq, 0) AS \"sort_seq!\",\n  lower(loc.code) AS \"sort_location!\"\nFROM inventory.positions AS p\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nJOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\nLEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id\nJOIN core.locations AS loc ON loc.workspace_id = p.workspace_id AND loc.id = p.location_id\nWHERE p.workspace_id = :workspaceId!\n  AND i.kind = :kind!\n  AND p.location_id = ANY (:locationIds!::uuid[])\n  AND (:itemId::uuid IS NULL OR p.item_id = :itemId::uuid)\n  -- Un frasco trasladado deja su posición de origen vacía: solo se muestra donde está.\n  AND (p.container_id IS NULL OR p.balance > 0 OR NOT EXISTS (\n    SELECT 1 FROM inventory.positions AS other\n    WHERE other.workspace_id = p.workspace_id AND other.container_id = p.container_id AND other.balance > 0\n  ))\n  AND (\n    :afterId::uuid IS NULL\n    OR (lower(i.code), lower(l.code), coalesce(c.seq, 0), lower(loc.code), p.id)\n       > (:afterItem::text, :afterLot::text, :afterSeq::int, :afterLocation::text, :afterId::uuid)\n  )\nORDER BY lower(i.code), lower(l.code), coalesce(c.seq, 0), lower(loc.code), p.id\nLIMIT :limit!"};

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
 *   l.condition AS lot_condition,
 *   p.disposition,
 *   c.id AS "container_id?",
 *   CASE WHEN c.id IS NULL THEN NULL ELSE l.code || '-' || lpad(c.seq::text, 2, '0') END AS container_code,
 *   trim_scale(c.initial_quantity) AS container_initial_quantity,
 *   loc.id AS location_id,
 *   loc.code AS location_code,
 *   loc.name AS location_name,
 *   trim_scale(p.balance) AS "balance!",
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
  itemId?: string | null | void;
  kind: string;
  limit: NumberOrString;
  locationId?: string | null | void;
  locationIds: stringArray;
  positionId?: string | null | void;
  timeZone: string;
  type?: string | null | void;
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
  item_name: string;
  location_code: string;
  lot_code: string;
  position_id: string;
  quantity: string;
  reason: string | null;
  reference: string | null;
  type: string;
}

/** 'ListOperations' query type */
export interface IListOperationsQuery {
  params: IListOperationsParams;
  result: IListOperationsResult;
}

const listOperationsIR: any = {"usedParamSet":{"workspaceId":true,"kind":true,"locationIds":true,"itemId":true,"locationId":true,"positionId":true,"type":true,"days":true,"timeZone":true,"beforeId":true,"beforeAt":true,"beforeEntryId":true,"limit":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1705,"b":1717}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":1734,"b":1739}]},{"name":"locationIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":1768,"b":1780}]},{"name":"itemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1798,"b":1804},{"a":1835,"b":1841}]},{"name":"locationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1857,"b":1867},{"a":1902,"b":1912}]},{"name":"positionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1928,"b":1938},{"a":1964,"b":1974}]},{"name":"type","required":false,"transform":{"type":"scalar"},"locs":[{"a":1990,"b":1994},{"a":2022,"b":2026}]},{"name":"days","required":false,"transform":{"type":"scalar"},"locs":[{"a":2138,"b":2142},{"a":2225,"b":2229}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":2204,"b":2213},{"a":2266,"b":2275}]},{"name":"beforeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2294,"b":2302},{"a":2381,"b":2389}]},{"name":"beforeAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":2357,"b":2365}]},{"name":"beforeEntryId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2398,"b":2411}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":2481,"b":2487}]}],"statement":"-- Un asiento por fila: un ingreso de varios frascos son varias filas de la misma operación. El\n-- cursor incluye el asiento para que una página nunca corte una operación a medias.\nSELECT\n  o.id,\n  e.id AS entry_id,\n  o.type,\n  o.effective_at,\n  -- Marca exacta (microsegundos, UTC) para el cursor; un Date de JavaScript la redondearía.\n  to_char(o.effective_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS \"cursor_at!\",\n  o.reason,\n  o.destination,\n  o.reference,\n  o.actor_principal_id,\n  ident.display_name AS actor_name,\n  e.position_id,\n  trim_scale(e.quantity) AS \"quantity!\",\n  trim_scale(e.balance_after) AS \"balance_after!\",\n  i.code AS item_code,\n  i.name AS item_name,\n  l.code AS lot_code,\n  CASE WHEN c.id IS NULL THEN NULL ELSE l.code || '-' || lpad(c.seq::text, 2, '0') END AS container_code,\n  loc.code AS location_code,\n  i.base_unit\nFROM inventory.operations AS o\nJOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id\nJOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nJOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\nLEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id\nJOIN core.locations AS loc ON loc.workspace_id = p.workspace_id AND loc.id = p.location_id\nLEFT JOIN core.principals AS pr ON pr.workspace_id = o.workspace_id AND pr.id = o.actor_principal_id\nLEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\nLEFT JOIN core.identities AS ident ON ident.id = m.identity_id\nWHERE o.workspace_id = :workspaceId!\n  AND i.kind = :kind!\n  AND p.location_id = ANY (:locationIds!::uuid[])\n  AND (:itemId::uuid IS NULL OR p.item_id = :itemId::uuid)\n  AND (:locationId::uuid IS NULL OR p.location_id = :locationId::uuid)\n  AND (:positionId::uuid IS NULL OR p.id = :positionId::uuid)\n  AND (:type::text IS NULL OR o.type = :type::text)\n  -- Misma ventana que countOperationsByDay: desde la medianoche local de hace N - 1 días.\n  AND (\n    :days::int IS NULL\n    OR o.effective_at >= (((now() AT TIME ZONE :timeZone!)::date - (:days::int - 1))::timestamp AT TIME ZONE :timeZone!)\n  )\n  AND (\n    :beforeId::uuid IS NULL\n    OR (o.effective_at, o.id, e.id) < (:beforeAt::timestamptz, :beforeId::uuid, :beforeEntryId::uuid)\n  )\nORDER BY o.effective_at DESC, o.id DESC, e.id DESC\nLIMIT :limit!"};

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
 *   o.actor_principal_id,
 *   ident.display_name AS actor_name,
 *   e.position_id,
 *   trim_scale(e.quantity) AS "quantity!",
 *   trim_scale(e.balance_after) AS "balance_after!",
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
 * WHERE o.workspace_id = :workspaceId!
 *   AND i.kind = :kind!
 *   AND p.location_id = ANY (:locationIds!::uuid[])
 *   AND (:itemId::uuid IS NULL OR p.item_id = :itemId::uuid)
 *   AND (:locationId::uuid IS NULL OR p.location_id = :locationId::uuid)
 *   AND (:positionId::uuid IS NULL OR p.id = :positionId::uuid)
 *   AND (:type::text IS NULL OR o.type = :type::text)
 *   -- Misma ventana que countOperationsByDay: desde la medianoche local de hace N - 1 días.
 *   AND (
 *     :days::int IS NULL
 *     OR o.effective_at >= (((now() AT TIME ZONE :timeZone!)::date - (:days::int - 1))::timestamp AT TIME ZONE :timeZone!)
 *   )
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


