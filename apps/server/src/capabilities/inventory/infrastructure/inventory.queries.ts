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
  minimum: string | null;
  name: string;
}

/** 'InsertItem' query type */
export interface IInsertItemQuery {
  params: IInsertItemParams;
  result: IInsertItemResult;
}

const insertItemIR: any = {"usedParamSet":{"workspaceId":true,"kind":true,"code":true,"name":true,"baseUnit":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":175,"b":187}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":190,"b":195}]},{"name":"code","required":true,"transform":{"type":"scalar"},"locs":[{"a":198,"b":203}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":206,"b":211}]},{"name":"baseUnit","required":true,"transform":{"type":"scalar"},"locs":[{"a":214,"b":223}]}],"statement":"-- El código lo genera el servidor a partir del nombre (ADR 0015), bajo el bloqueo de códigos.\nINSERT INTO inventory.items (workspace_id, kind, code, name, base_unit)\nVALUES (:workspaceId!, :kind!, :code!, :name!, :baseUnit!)\nRETURNING id, code, name, base_unit, trim_scale(minimum_quantity) AS minimum"};

/**
 * Query generated from SQL:
 * ```
 * -- El código lo genera el servidor a partir del nombre (ADR 0015), bajo el bloqueo de códigos.
 * INSERT INTO inventory.items (workspace_id, kind, code, name, base_unit)
 * VALUES (:workspaceId!, :kind!, :code!, :name!, :baseUnit!)
 * RETURNING id, code, name, base_unit, trim_scale(minimum_quantity) AS minimum
 * ```
 */
export const insertItem = new PreparedQuery<IInsertItemParams,IInsertItemResult>(insertItemIR);


/** 'ItemNameTaken' parameters type */
export interface IItemNameTakenParams {
  exceptId?: string | null | void;
  kind: string;
  name: string;
  workspaceId: string;
}

/** 'ItemNameTaken' return type */
export interface IItemNameTakenResult {
  name: string;
}

/** 'ItemNameTaken' query type */
export interface IItemNameTakenQuery {
  params: IItemNameTakenParams;
  result: IItemNameTakenResult;
}

const itemNameTakenIR: any = {"usedParamSet":{"workspaceId":true,"kind":true,"name":true,"exceptId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":227,"b":239}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":254,"b":259}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":341,"b":346}]},{"name":"exceptId","required":false,"transform":{"type":"scalar"},"locs":[{"a":356,"b":364},{"a":389,"b":397}]}],"statement":"-- Otro ítem activo del mismo tipo con el mismo nombre plegado (ADR 0015). Se consulta bajo el\n-- bloqueo del catálogo del espacio, que serializa altas y cambios de nombre.\nSELECT name\nFROM inventory.items\nWHERE workspace_id = :workspaceId!\n  AND kind = :kind!\n  AND archived_at IS NULL\n  AND inventory.fold_text(name) = inventory.fold_text(:name!)\n  AND (:exceptId::uuid IS NULL OR id <> :exceptId::uuid)\nLIMIT 1"};

/**
 * Query generated from SQL:
 * ```
 * -- Otro ítem activo del mismo tipo con el mismo nombre plegado (ADR 0015). Se consulta bajo el
 * -- bloqueo del catálogo del espacio, que serializa altas y cambios de nombre.
 * SELECT name
 * FROM inventory.items
 * WHERE workspace_id = :workspaceId!
 *   AND kind = :kind!
 *   AND archived_at IS NULL
 *   AND inventory.fold_text(name) = inventory.fold_text(:name!)
 *   AND (:exceptId::uuid IS NULL OR id <> :exceptId::uuid)
 * LIMIT 1
 * ```
 */
export const itemNameTaken = new PreparedQuery<IItemNameTakenParams,IItemNameTakenResult>(itemNameTakenIR);


/** 'ItemCodesLike' parameters type */
export interface IItemCodesLikeParams {
  base: string;
  workspaceId: string;
}

/** 'ItemCodesLike' return type */
export interface IItemCodesLikeResult {
  code: string;
}

/** 'ItemCodesLike' query type */
export interface IItemCodesLikeQuery {
  params: IItemCodesLikeParams;
  result: IItemCodesLikeResult;
}

const itemCodesLikeIR: any = {"usedParamSet":{"workspaceId":true,"base":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":140,"b":152}]},{"name":"base","required":true,"transform":{"type":"scalar"},"locs":[{"a":179,"b":184},{"a":221,"b":226}]}],"statement":"-- Códigos del espacio, de cualquier tipo, iguales al propuesto o con un sufijo «-N».\nSELECT code\nFROM inventory.items\nWHERE workspace_id = :workspaceId! AND (lower(code) = lower(:base!) OR starts_with(lower(code), lower(:base!) || '-'))"};

/**
 * Query generated from SQL:
 * ```
 * -- Códigos del espacio, de cualquier tipo, iguales al propuesto o con un sufijo «-N».
 * SELECT code
 * FROM inventory.items
 * WHERE workspace_id = :workspaceId! AND (lower(code) = lower(:base!) OR starts_with(lower(code), lower(:base!) || '-'))
 * ```
 */
export const itemCodesLike = new PreparedQuery<IItemCodesLikeParams,IItemCodesLikeResult>(itemCodesLikeIR);


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


/** 'LockItem' parameters type */
export interface ILockItemParams {
  itemId: string;
  kind: string;
  workspaceId: string;
}

/** 'LockItem' return type */
export interface ILockItemResult {
  base_unit: string;
  code: string;
  id: string;
  minimum: string | null;
  name: string;
}

/** 'LockItem' query type */
export interface ILockItemQuery {
  params: ILockItemParams;
  result: ILockItemResult;
}

const lockItemIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true,"kind":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":205,"b":217}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":228,"b":235}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":248,"b":253}]}],"statement":"-- Antes de editar la ficha (ADR 0015): un ingreso, que también bloquea el ítem, espera.\nSELECT id, code, name, base_unit, trim_scale(minimum_quantity) AS minimum\nFROM inventory.items\nWHERE workspace_id = :workspaceId! AND id = :itemId! AND kind = :kind! AND archived_at IS NULL\nFOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * -- Antes de editar la ficha (ADR 0015): un ingreso, que también bloquea el ítem, espera.
 * SELECT id, code, name, base_unit, trim_scale(minimum_quantity) AS minimum
 * FROM inventory.items
 * WHERE workspace_id = :workspaceId! AND id = :itemId! AND kind = :kind! AND archived_at IS NULL
 * FOR UPDATE
 * ```
 */
export const lockItem = new PreparedQuery<ILockItemParams,ILockItemResult>(lockItemIR);


/** 'ItemHasMovements' parameters type */
export interface IItemHasMovementsParams {
  itemId: string;
  workspaceId: string;
}

/** 'ItemHasMovements' return type */
export interface IItemHasMovementsResult {
  has_movements: boolean;
}

/** 'ItemHasMovements' query type */
export interface IItemHasMovementsQuery {
  params: IItemHasMovementsParams;
  result: IItemHasMovementsResult;
}

const itemHasMovementsIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":268,"b":280}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":298,"b":305}]}],"statement":"-- Con algún asiento, la unidad ya no cambia (ADR 0015; lo respalda items_protect_base_unit).\nSELECT EXISTS (\n  SELECT 1\n  FROM inventory.positions AS p\n  JOIN inventory.entries AS e ON e.workspace_id = p.workspace_id AND e.position_id = p.id\n  WHERE p.workspace_id = :workspaceId! AND p.item_id = :itemId!\n) AS \"has_movements!\""};

/**
 * Query generated from SQL:
 * ```
 * -- Con algún asiento, la unidad ya no cambia (ADR 0015; lo respalda items_protect_base_unit).
 * SELECT EXISTS (
 *   SELECT 1
 *   FROM inventory.positions AS p
 *   JOIN inventory.entries AS e ON e.workspace_id = p.workspace_id AND e.position_id = p.id
 *   WHERE p.workspace_id = :workspaceId! AND p.item_id = :itemId!
 * ) AS "has_movements!"
 * ```
 */
export const itemHasMovements = new PreparedQuery<IItemHasMovementsParams,IItemHasMovementsResult>(itemHasMovementsIR);


/** 'UpdateItem' parameters type */
export interface IUpdateItemParams {
  baseUnit: string;
  itemId: string;
  kind: string;
  name: string;
  workspaceId: string;
}

/** 'UpdateItem' return type */
export interface IUpdateItemResult {
  id: string;
}

/** 'UpdateItem' query type */
export interface IUpdateItemQuery {
  params: IUpdateItemParams;
  result: IUpdateItemResult;
}

const updateItemIR: any = {"usedParamSet":{"name":true,"baseUnit":true,"workspaceId":true,"itemId":true,"kind":true},"params":[{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":34,"b":39}]},{"name":"baseUnit","required":true,"transform":{"type":"scalar"},"locs":[{"a":54,"b":63}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":109,"b":121}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":132,"b":139}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":152,"b":157}]}],"statement":"UPDATE inventory.items\nSET name = :name!, base_unit = :baseUnit!, version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :itemId! AND kind = :kind!\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE inventory.items
 * SET name = :name!, base_unit = :baseUnit!, version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :itemId! AND kind = :kind!
 * RETURNING id
 * ```
 */
export const updateItem = new PreparedQuery<IUpdateItemParams,IUpdateItemResult>(updateItemIR);


/** 'ReserveLotSeq' parameters type */
export interface IReserveLotSeqParams {
  itemId: string;
  kind: string;
  workspaceId: string;
}

/** 'ReserveLotSeq' return type */
export interface IReserveLotSeqResult {
  base_unit: string;
  code: string;
  lot_seq: number;
  name: string;
}

/** 'ReserveLotSeq' query type */
export interface IReserveLotSeqQuery {
  params: IReserveLotSeqParams;
  result: IReserveLotSeqResult;
}

const reserveLotSeqIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true,"kind":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":320,"b":332}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":343,"b":350}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":363,"b":368}]}],"statement":"-- Número del lote automático (ADR 0015): el UPDATE bloquea el ítem, así que dos ingresos\n-- simultáneos reciben números distintos y la unidad no cambia mientras dura el ingreso. Orden de\n-- bloqueo dentro de «datos» (02 §6): ítem → lote → posición.\nUPDATE inventory.items\nSET lot_seq = lot_seq + 1\nWHERE workspace_id = :workspaceId! AND id = :itemId! AND kind = :kind! AND archived_at IS NULL\nRETURNING lot_seq, code, name, base_unit"};

/**
 * Query generated from SQL:
 * ```
 * -- Número del lote automático (ADR 0015): el UPDATE bloquea el ítem, así que dos ingresos
 * -- simultáneos reciben números distintos y la unidad no cambia mientras dura el ingreso. Orden de
 * -- bloqueo dentro de «datos» (02 §6): ítem → lote → posición.
 * UPDATE inventory.items
 * SET lot_seq = lot_seq + 1
 * WHERE workspace_id = :workspaceId! AND id = :itemId! AND kind = :kind! AND archived_at IS NULL
 * RETURNING lot_seq, code, name, base_unit
 * ```
 */
export const reserveLotSeq = new PreparedQuery<IReserveLotSeqParams,IReserveLotSeqResult>(reserveLotSeqIR);


/** 'InsertLot' parameters type */
export interface IInsertLotParams {
  brand?: string | null | void;
  code: string;
  departmentId?: string | null | void;
  expiresOn?: string | null | void;
  itemId: string;
  workspaceId: string;
}

/** 'InsertLot' return type */
export interface IInsertLotResult {
  code: string;
  id: string;
}

/** 'InsertLot' query type */
export interface IInsertLotQuery {
  params: IInsertLotParams;
  result: IInsertLotResult;
}

const insertLotIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true,"code":true,"brand":true,"departmentId":true,"expiresOn":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":202,"b":214}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":217,"b":224}]},{"name":"code","required":true,"transform":{"type":"scalar"},"locs":[{"a":227,"b":232}]},{"name":"brand","required":false,"transform":{"type":"scalar"},"locs":[{"a":235,"b":240}]},{"name":"departmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":243,"b":255}]},{"name":"expiresOn","required":false,"transform":{"type":"scalar"},"locs":[{"a":258,"b":267}]}],"statement":"-- Si el código automático ya lo tiene un lote anterior del ítem, no inserta y se prueba el siguiente.\nINSERT INTO inventory.lots (workspace_id, item_id, code, brand, department_id, expires_on)\nVALUES (:workspaceId!, :itemId!, :code!, :brand, :departmentId, :expiresOn)\nON CONFLICT (workspace_id, item_id, lower(code)) DO NOTHING\nRETURNING id, code"};

/**
 * Query generated from SQL:
 * ```
 * -- Si el código automático ya lo tiene un lote anterior del ítem, no inserta y se prueba el siguiente.
 * INSERT INTO inventory.lots (workspace_id, item_id, code, brand, department_id, expires_on)
 * VALUES (:workspaceId!, :itemId!, :code!, :brand, :departmentId, :expiresOn)
 * ON CONFLICT (workspace_id, item_id, lower(code)) DO NOTHING
 * RETURNING id, code
 * ```
 */
export const insertLot = new PreparedQuery<IInsertLotParams,IInsertLotResult>(insertLotIR);


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

const findLocationIR: any = {"usedParamSet":{"workspaceId":true,"locationId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":256,"b":268}]},{"name":"locationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":279,"b":290}]}],"statement":"-- La ubicación activa donde se coloca o se cuenta, bloqueada (compartida) hasta el final: archivarla\n-- espera a que esta operación termine y, si se archivó antes, la relectura no la devuelve (ADR 0024).\nSELECT id\nFROM core.locations\nWHERE workspace_id = :workspaceId! AND id = :locationId! AND archived_at IS NULL\nFOR SHARE"};

/**
 * Query generated from SQL:
 * ```
 * -- La ubicación activa donde se coloca o se cuenta, bloqueada (compartida) hasta el final: archivarla
 * -- espera a que esta operación termine y, si se archivó antes, la relectura no la devuelve (ADR 0024).
 * SELECT id
 * FROM core.locations
 * WHERE workspace_id = :workspaceId! AND id = :locationId! AND archived_at IS NULL
 * FOR SHARE
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
  codes: stringArray;
  density?: string | null | void;
  firstSeq: number;
  itemId: string;
  lotId: string;
  quantity: string;
  tare?: string | null | void;
  workspaceId: string;
}

/** 'InsertContainers' return type */
export interface IInsertContainersResult {
  code: string;
  id: string;
  tare: string | null;
}

/** 'InsertContainers' query type */
export interface IInsertContainersQuery {
  params: IInsertContainersParams;
  result: IInsertContainersResult;
}

const insertContainersIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true,"lotId":true,"firstSeq":true,"quantity":true,"tare":true,"density":true,"codes":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":263,"b":275}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":278,"b":285}]},{"name":"lotId","required":true,"transform":{"type":"scalar"},"locs":[{"a":288,"b":294}]},{"name":"firstSeq","required":true,"transform":{"type":"scalar"},"locs":[{"a":297,"b":306}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":337,"b":346}]},{"name":"tare","required":false,"transform":{"type":"scalar"},"locs":[{"a":365,"b":369}]},{"name":"density","required":false,"transform":{"type":"scalar"},"locs":[{"a":381,"b":388}]},{"name":"codes","required":true,"transform":{"type":"scalar"},"locs":[{"a":411,"b":417}]}],"statement":"-- Un frasco por código, numerados desde :firstSeq en el orden recibido (ADR 0015). Un código ya usado\n-- en el espacio choca con containers_code.\nINSERT INTO inventory.containers (workspace_id, item_id, lot_id, seq, code, initial_quantity, tare, density)\nSELECT :workspaceId!, :itemId!, :lotId!, :firstSeq!::int + c.n::int - 1, c.code, :quantity!::numeric,\n       :tare::numeric, :density::numeric\nFROM unnest(:codes!::text[]) WITH ORDINALITY AS c (code, n)\nORDER BY c.n\nRETURNING id, code, trim_scale(tare) AS tare"};

/**
 * Query generated from SQL:
 * ```
 * -- Un frasco por código, numerados desde :firstSeq en el orden recibido (ADR 0015). Un código ya usado
 * -- en el espacio choca con containers_code.
 * INSERT INTO inventory.containers (workspace_id, item_id, lot_id, seq, code, initial_quantity, tare, density)
 * SELECT :workspaceId!, :itemId!, :lotId!, :firstSeq!::int + c.n::int - 1, c.code, :quantity!::numeric,
 *        :tare::numeric, :density::numeric
 * FROM unnest(:codes!::text[]) WITH ORDINALITY AS c (code, n)
 * ORDER BY c.n
 * RETURNING id, code, trim_scale(tare) AS tare
 * ```
 */
export const insertContainers = new PreparedQuery<IInsertContainersParams,IInsertContainersResult>(insertContainersIR);


/** 'TakenContainerCode' parameters type */
export interface ITakenContainerCodeParams {
  codes: stringArray;
  workspaceId: string;
}

/** 'TakenContainerCode' return type */
export interface ITakenContainerCodeResult {
  code: string;
}

/** 'TakenContainerCode' query type */
export interface ITakenContainerCodeQuery {
  params: ITakenContainerCodeParams;
  result: ITakenContainerCodeResult;
}

const takenContainerCodeIR: any = {"usedParamSet":{"workspaceId":true,"codes":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":177,"b":189}]},{"name":"codes","required":true,"transform":{"type":"scalar"},"locs":[{"a":242,"b":248}]}],"statement":"-- Cuál de los códigos ya existe en el espacio: el detalle del choque no muestra la clave bajo RLS.\nSELECT lower(code) AS \"code!\"\nFROM inventory.containers\nWHERE workspace_id = :workspaceId! AND lower(code) = ANY (SELECT lower(c) FROM unnest(:codes!::text[]) AS c)\nLIMIT 1"};

/**
 * Query generated from SQL:
 * ```
 * -- Cuál de los códigos ya existe en el espacio: el detalle del choque no muestra la clave bajo RLS.
 * SELECT lower(code) AS "code!"
 * FROM inventory.containers
 * WHERE workspace_id = :workspaceId! AND lower(code) = ANY (SELECT lower(c) FROM unnest(:codes!::text[]) AS c)
 * LIMIT 1
 * ```
 */
export const takenContainerCode = new PreparedQuery<ITakenContainerCodeParams,ITakenContainerCodeResult>(takenContainerCodeIR);


/** 'ComputeTare' parameters type */
export interface IComputeTareParams {
  density?: string | null | void;
  grossWeight: string;
  quantity: string;
  unit: string;
}

/** 'ComputeTare' return type */
export interface IComputeTareResult {
  density: string | null;
  dimension: string;
  positive: boolean;
  tare: string | null;
}

/** 'ComputeTare' query type */
export interface IComputeTareQuery {
  params: IComputeTareParams;
  result: IComputeTareResult;
}

const computeTareIR: any = {"usedParamSet":{"grossWeight":true,"quantity":true,"density":true,"unit":true},"params":[{"name":"grossWeight","required":true,"transform":{"type":"scalar"},"locs":[{"a":218,"b":230}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":243,"b":252}]},{"name":"density","required":false,"transform":{"type":"scalar"},"locs":[{"a":298,"b":305},{"a":575,"b":582}]},{"name":"unit","required":true,"transform":{"type":"scalar"},"locs":[{"a":396,"b":401}]}],"statement":"-- Tara de un frasco (ADR 0015): su peso en g menos lo que contiene, pasado a gramos. Nula si la unidad\n-- no se pesa o, en volumen, falta la densidad; la densidad solo se guarda en volumen.\nWITH t AS (\n  SELECT round(:grossWeight!::numeric - :quantity!::numeric * inventory.grams_per_unit(u.code, :density::numeric), 9) AS tare,\n         u.dimension\n  FROM inventory.units AS u\n  WHERE u.code = :unit!\n)\nSELECT trim_scale(tare) AS tare,\n       coalesce(tare > 0, false) AS \"positive!\",\n       dimension AS \"dimension!\",\n       CASE WHEN dimension = 'volume' THEN trim_scale(:density::numeric) END AS density\nFROM t"};

/**
 * Query generated from SQL:
 * ```
 * -- Tara de un frasco (ADR 0015): su peso en g menos lo que contiene, pasado a gramos. Nula si la unidad
 * -- no se pesa o, en volumen, falta la densidad; la densidad solo se guarda en volumen.
 * WITH t AS (
 *   SELECT round(:grossWeight!::numeric - :quantity!::numeric * inventory.grams_per_unit(u.code, :density::numeric), 9) AS tare,
 *          u.dimension
 *   FROM inventory.units AS u
 *   WHERE u.code = :unit!
 * )
 * SELECT trim_scale(tare) AS tare,
 *        coalesce(tare > 0, false) AS "positive!",
 *        dimension AS "dimension!",
 *        CASE WHEN dimension = 'volume' THEN trim_scale(:density::numeric) END AS density
 * FROM t
 * ```
 */
export const computeTare = new PreparedQuery<IComputeTareParams,IComputeTareResult>(computeTareIR);


/** 'LockContainerStock' parameters type */
export interface ILockContainerStockParams {
  containerId: string;
  kind: string;
  workspaceId: string;
}

/** 'LockContainerStock' return type */
export interface ILockContainerStockResult {
  balance: string;
  base_unit: string;
  density: string | null;
  id: string;
  item_id: string;
  location_id: string;
  tare: string | null;
}

/** 'LockContainerStock' query type */
export interface ILockContainerStockQuery {
  params: ILockContainerStockParams;
  result: ILockContainerStockResult;
}

const lockContainerStockIR: any = {"usedParamSet":{"workspaceId":true,"containerId":true,"kind":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":381,"b":393},{"a":783,"b":795}]},{"name":"containerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":416,"b":428},{"a":808,"b":820}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":835,"b":840}]}],"statement":"-- Antes de fijar la tara (ADR 0015) se bloquean, en modo compartido y en orden estable, todas las\n-- posiciones del frasco: ningún movimiento ni traslado cambia su saldo entretanto. Devuelve la que\n-- tiene saldo o, si está vacío, la última que ocupó.\nWITH locked AS (\n  SELECT p.id, p.location_id, p.balance, p.updated_at\n  FROM inventory.positions AS p\n  WHERE p.workspace_id = :workspaceId! AND p.container_id = :containerId!\n  ORDER BY p.id\n  FOR SHARE\n)\nSELECT c.id, c.item_id, locked.location_id, trim_scale(locked.balance) AS \"balance!\", i.base_unit,\n       trim_scale(c.tare) AS tare, trim_scale(c.density) AS density\nFROM inventory.containers AS c\nJOIN inventory.items AS i ON i.workspace_id = c.workspace_id AND i.id = c.item_id\nJOIN locked ON true\nWHERE c.workspace_id = :workspaceId! AND c.id = :containerId! AND i.kind = :kind!\nORDER BY (locked.balance > 0) DESC, locked.updated_at DESC\nLIMIT 1"};

/**
 * Query generated from SQL:
 * ```
 * -- Antes de fijar la tara (ADR 0015) se bloquean, en modo compartido y en orden estable, todas las
 * -- posiciones del frasco: ningún movimiento ni traslado cambia su saldo entretanto. Devuelve la que
 * -- tiene saldo o, si está vacío, la última que ocupó.
 * WITH locked AS (
 *   SELECT p.id, p.location_id, p.balance, p.updated_at
 *   FROM inventory.positions AS p
 *   WHERE p.workspace_id = :workspaceId! AND p.container_id = :containerId!
 *   ORDER BY p.id
 *   FOR SHARE
 * )
 * SELECT c.id, c.item_id, locked.location_id, trim_scale(locked.balance) AS "balance!", i.base_unit,
 *        trim_scale(c.tare) AS tare, trim_scale(c.density) AS density
 * FROM inventory.containers AS c
 * JOIN inventory.items AS i ON i.workspace_id = c.workspace_id AND i.id = c.item_id
 * JOIN locked ON true
 * WHERE c.workspace_id = :workspaceId! AND c.id = :containerId! AND i.kind = :kind!
 * ORDER BY (locked.balance > 0) DESC, locked.updated_at DESC
 * LIMIT 1
 * ```
 */
export const lockContainerStock = new PreparedQuery<ILockContainerStockParams,ILockContainerStockResult>(lockContainerStockIR);


/** 'SetContainerTare' parameters type */
export interface ISetContainerTareParams {
  containerId: string;
  density?: string | null | void;
  tare: string;
  workspaceId: string;
}

/** 'SetContainerTare' return type */
export interface ISetContainerTareResult {
  density: string | null;
  tare: string;
}

/** 'SetContainerTare' query type */
export interface ISetContainerTareQuery {
  params: ISetContainerTareParams;
  result: ISetContainerTareResult;
}

const setContainerTareIR: any = {"usedParamSet":{"tare":true,"density":true,"workspaceId":true,"containerId":true},"params":[{"name":"tare","required":true,"transform":{"type":"scalar"},"locs":[{"a":39,"b":44}]},{"name":"density","required":false,"transform":{"type":"scalar"},"locs":[{"a":66,"b":73}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":105,"b":117}]},{"name":"containerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":128,"b":140}]}],"statement":"UPDATE inventory.containers\nSET tare = :tare!::numeric, density = :density::numeric\nWHERE workspace_id = :workspaceId! AND id = :containerId!\nRETURNING trim_scale(tare) AS \"tare!\", trim_scale(density) AS density"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE inventory.containers
 * SET tare = :tare!::numeric, density = :density::numeric
 * WHERE workspace_id = :workspaceId! AND id = :containerId!
 * RETURNING trim_scale(tare) AS "tare!", trim_scale(density) AS density
 * ```
 */
export const setContainerTare = new PreparedQuery<ISetContainerTareParams,ISetContainerTareResult>(setContainerTareIR);


/** 'WeighPosition' parameters type */
export interface IWeighPositionParams {
  grossWeight: string;
  positionId: string;
  workspaceId: string;
}

/** 'WeighPosition' return type */
export interface IWeighPositionResult {
  below_tare: boolean | null;
  delta: string | null;
  tare: string | null;
}

/** 'WeighPosition' query type */
export interface IWeighPositionQuery {
  params: IWeighPositionParams;
  result: IWeighPositionResult;
}

const weighPositionIR: any = {"usedParamSet":{"grossWeight":true,"workspaceId":true,"positionId":true},"params":[{"name":"grossWeight","required":true,"transform":{"type":"scalar"},"locs":[{"a":240,"b":252},{"a":313,"b":325}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":707,"b":719}]},{"name":"positionId","required":true,"transform":{"type":"scalar"},"locs":[{"a":732,"b":743}]}],"statement":"-- Ajuste por peso (ADR 0015) sobre la posición ya bloqueada: el saldo que marca la balanza,\n-- redondeado a centésimas, y su diferencia con el saldo actual. La aritmética ocurre aquí, en numeric.\nSELECT trim_scale(c.tare) AS tare,\n       (:grossWeight!::numeric < c.tare) AS below_tare,\n       trim_scale(round((:grossWeight!::numeric - c.tare) / f.factor, 2) - p.balance) AS delta\nFROM inventory.positions AS p\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nLEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id\nCROSS JOIN LATERAL (SELECT inventory.grams_per_unit(i.base_unit, c.density) AS factor) AS f\nWHERE p.workspace_id = :workspaceId! AND p.id = :positionId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Ajuste por peso (ADR 0015) sobre la posición ya bloqueada: el saldo que marca la balanza,
 * -- redondeado a centésimas, y su diferencia con el saldo actual. La aritmética ocurre aquí, en numeric.
 * SELECT trim_scale(c.tare) AS tare,
 *        (:grossWeight!::numeric < c.tare) AS below_tare,
 *        trim_scale(round((:grossWeight!::numeric - c.tare) / f.factor, 2) - p.balance) AS delta
 * FROM inventory.positions AS p
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 * LEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id
 * CROSS JOIN LATERAL (SELECT inventory.grams_per_unit(i.base_unit, c.density) AS factor) AS f
 * WHERE p.workspace_id = :workspaceId! AND p.id = :positionId!
 * ```
 */
export const weighPosition = new PreparedQuery<IWeighPositionParams,IWeighPositionResult>(weighPositionIR);


/** 'FindItemName' parameters type */
export interface IFindItemNameParams {
  itemId: string;
  kind: string;
  workspaceId: string;
}

/** 'FindItemName' return type */
export interface IFindItemNameResult {
  name: string;
}

/** 'FindItemName' query type */
export interface IFindItemNameQuery {
  params: IFindItemNameParams;
  result: IFindItemNameResult;
}

const findItemNameIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true,"kind":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":54,"b":66}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":77,"b":84}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":97,"b":102}]}],"statement":"SELECT name\nFROM inventory.items\nWHERE workspace_id = :workspaceId! AND id = :itemId! AND kind = :kind! AND archived_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT name
 * FROM inventory.items
 * WHERE workspace_id = :workspaceId! AND id = :itemId! AND kind = :kind! AND archived_at IS NULL
 * ```
 */
export const findItemName = new PreparedQuery<IFindItemNameParams,IFindItemNameResult>(findItemNameIR);


/** 'LastNumberedContainerCode' parameters type */
export interface ILastNumberedContainerCodeParams {
  itemId: string;
  kind: string;
  workspaceId: string;
}

/** 'LastNumberedContainerCode' return type */
export interface ILastNumberedContainerCodeResult {
  code: string;
}

/** 'LastNumberedContainerCode' query type */
export interface ILastNumberedContainerCodeQuery {
  params: ILastNumberedContainerCodeParams;
  result: ILastNumberedContainerCodeResult;
}

const lastNumberedContainerCodeIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true,"kind":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":239,"b":251}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":269,"b":276}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":291,"b":296}]}],"statement":"-- El código del reactivo con el número final más alto: de él sigue su serie (ADR 0015).\nSELECT c.code\nFROM inventory.containers AS c\nJOIN inventory.items AS i ON i.workspace_id = c.workspace_id AND i.id = c.item_id\nWHERE c.workspace_id = :workspaceId! AND c.item_id = :itemId! AND i.kind = :kind! AND c.code ~ '[0-9]$'\nORDER BY substring(c.code FROM '([0-9]+)$')::numeric DESC, c.created_at DESC, c.id\nLIMIT 1"};

/**
 * Query generated from SQL:
 * ```
 * -- El código del reactivo con el número final más alto: de él sigue su serie (ADR 0015).
 * SELECT c.code
 * FROM inventory.containers AS c
 * JOIN inventory.items AS i ON i.workspace_id = c.workspace_id AND i.id = c.item_id
 * WHERE c.workspace_id = :workspaceId! AND c.item_id = :itemId! AND i.kind = :kind! AND c.code ~ '[0-9]$'
 * ORDER BY substring(c.code FROM '([0-9]+)$')::numeric DESC, c.created_at DESC, c.id
 * LIMIT 1
 * ```
 */
export const lastNumberedContainerCode = new PreparedQuery<ILastNumberedContainerCodeParams,ILastNumberedContainerCodeResult>(lastNumberedContainerCodeIR);


/** 'ContainerCodesLike' parameters type */
export interface IContainerCodesLikeParams {
  prefix: string;
  workspaceId: string;
}

/** 'ContainerCodesLike' return type */
export interface IContainerCodesLikeResult {
  code: string;
}

/** 'ContainerCodesLike' query type */
export interface IContainerCodesLikeQuery {
  params: IContainerCodesLikeParams;
  result: IContainerCodesLikeResult;
}

const containerCodesLikeIR: any = {"usedParamSet":{"workspaceId":true,"prefix":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":153,"b":165}]},{"name":"prefix","required":true,"transform":{"type":"scalar"},"locs":[{"a":202,"b":209}]}],"statement":"-- Códigos de frasco del espacio, de cualquier tipo, que empiezan por el prefijo de la serie.\nSELECT code\nFROM inventory.containers\nWHERE workspace_id = :workspaceId! AND starts_with(lower(code), lower(:prefix!))"};

/**
 * Query generated from SQL:
 * ```
 * -- Códigos de frasco del espacio, de cualquier tipo, que empiezan por el prefijo de la serie.
 * SELECT code
 * FROM inventory.containers
 * WHERE workspace_id = :workspaceId! AND starts_with(lower(code), lower(:prefix!))
 * ```
 */
export const containerCodesLike = new PreparedQuery<IContainerCodesLikeParams,IContainerCodesLikeResult>(containerCodesLikeIR);


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

const lockCountPositionIR: any = {"usedParamSet":{"expected":true,"counted":true,"workspaceId":true,"positionId":true,"kind":true},"params":[{"name":"expected","required":true,"transform":{"type":"scalar"},"locs":[{"a":287,"b":296}]},{"name":"counted","required":true,"transform":{"type":"scalar"},"locs":[{"a":343,"b":351},{"a":396,"b":404}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":826,"b":838}]},{"name":"positionId","required":true,"transform":{"type":"scalar"},"locs":[{"a":851,"b":862}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":877,"b":882}]}],"statement":"-- Una línea del conteo (ADR 0012, entrega 4) bajo el bloqueo del frasco: si su saldo sigue siendo\n-- el que se vio al contar, la diferencia con lo contado, y si lo contado queda bajo lo apartado.\n-- La aritmética ocurre aquí, en numeric.\nSELECT p.id, p.location_id,\n       (p.balance = :expected!::numeric) AS \"unchanged!\",\n       trim_scale(:counted!::numeric - p.balance) AS \"delta!\",\n       (:counted!::numeric < p.reserved) AS \"below_reserved!\",\n       coalesce(c.code, l.code) AS \"code!\",\n       i.base_unit\nFROM inventory.positions AS p\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nJOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\nLEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id\nWHERE p.workspace_id = :workspaceId! AND p.id = :positionId! AND i.kind = :kind!\nFOR UPDATE OF p"};

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
 *        coalesce(c.code, l.code) AS "code!",
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
  workspaceId: string;
}

/** 'ListPositions' return type */
export interface IListPositionsResult {
  balance: string;
  base_unit: string;
  brand: string | null;
  container_code: string;
  container_density: string | null;
  container_has_receipt: boolean;
  container_id: string | null;
  container_initial_quantity: string | null;
  container_received_at: Date | null;
  container_received_by_name: string | null;
  container_tare: string | null;
  department_id: string | null;
  department_name: string | null;
  disposition: string;
  expires_on: string | null;
  id: string;
  item_code: string;
  item_id: string;
  item_name: string;
  location_code: string;
  location_id: string;
  location_name: string;
  location_path: stringArray;
  lot_code: string;
  lot_id: string;
  reserved: string;
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

const listPositionsIR: any = {"usedParamSet":{"workspaceId":true,"kind":true,"itemId":true,"locationId":true,"afterId":true,"afterItem":true,"afterLot":true,"afterSeq":true,"afterLocation":true,"limit":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":2881,"b":2893}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":2910,"b":2915}]},{"name":"itemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2924,"b":2930},{"a":2961,"b":2967}]},{"name":"locationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2983,"b":2993},{"a":3028,"b":3038}]},{"name":"afterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":3370,"b":3377},{"a":3557,"b":3564}]},{"name":"afterItem","required":false,"transform":{"type":"scalar"},"locs":[{"a":3484,"b":3493}]},{"name":"afterLot","required":false,"transform":{"type":"scalar"},"locs":[{"a":3502,"b":3510}]},{"name":"afterSeq","required":false,"transform":{"type":"scalar"},"locs":[{"a":3519,"b":3527}]},{"name":"afterLocation","required":false,"transform":{"type":"scalar"},"locs":[{"a":3535,"b":3548}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":3664,"b":3670}]}],"statement":"SELECT\n  p.id,\n  i.id AS item_id,\n  i.code AS item_code,\n  i.name AS item_name,\n  l.id AS lot_id,\n  l.code AS lot_code,\n  l.expires_on,\n  l.brand,\n  dept.id AS \"department_id?\",\n  dept.name AS \"department_name?\",\n  p.disposition,\n  c.id AS \"container_id?\",\n  c.code AS container_code,\n  trim_scale(c.initial_quantity) AS container_initial_quantity,\n  c.created_at AS \"container_received_at?\",\n  -- Quién lo ingresó: el actor del ingreso que llenó su primera posición; nadie si no hubo ingreso.\n  receipt.operation_id IS NOT NULL AS \"container_has_receipt!\",\n  receipt.actor_name AS \"container_received_by_name?\",\n  trim_scale(c.tare) AS container_tare,\n  trim_scale(c.density) AS container_density,\n  loc.id AS location_id,\n  loc.code AS location_code,\n  loc.name AS location_name,\n  -- Ruta desde el primer nivel bajo la sede (sin ella, salvo que sea la propia), hasta 6 niveles.\n  (\n    WITH RECURSIVE up AS (\n      SELECT loc.parent_id, loc.kind, loc.name, 0 AS depth\n      UNION ALL\n      SELECT parent.parent_id, parent.kind, parent.name, up.depth + 1\n      FROM up\n      JOIN core.locations AS parent ON parent.workspace_id = loc.workspace_id AND parent.id = up.parent_id\n      WHERE up.depth < 5\n    )\n    SELECT array_agg(up.name ORDER BY up.depth DESC) FILTER (WHERE up.depth = 0 OR up.kind <> 'site')\n    FROM up\n  ) AS \"location_path!\",\n  trim_scale(p.balance) AS \"balance!\",\n  trim_scale(p.reserved) AS \"reserved!\",\n  i.base_unit,\n  lower(i.code) AS \"sort_item!\",\n  lower(l.code) AS \"sort_lot!\",\n  coalesce(c.seq, 0) AS \"sort_seq!\",\n  lower(loc.code) AS \"sort_location!\"\nFROM inventory.positions AS p\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nJOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\nLEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id\n-- El nombre sale de la misma cadena que el actor de listOperations.\nLEFT JOIN LATERAL (\n  SELECT o.id AS operation_id, ident.display_name AS actor_name\n  FROM inventory.positions AS cp\n  JOIN inventory.entries AS e ON e.workspace_id = cp.workspace_id AND e.position_id = cp.id\n  JOIN inventory.operations AS o ON o.workspace_id = e.workspace_id AND o.id = e.operation_id\n  LEFT JOIN core.principals AS pr ON pr.workspace_id = o.workspace_id AND pr.id = o.actor_principal_id\n  LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\n  LEFT JOIN core.identities AS ident ON ident.id = m.identity_id\n  WHERE cp.workspace_id = c.workspace_id AND cp.container_id = c.id AND o.type = 'receipt'\n  ORDER BY o.effective_at, o.id\n  LIMIT 1\n) AS receipt ON true\nJOIN core.locations AS loc ON loc.workspace_id = p.workspace_id AND loc.id = p.location_id\nLEFT JOIN core.departments AS dept ON dept.workspace_id = l.workspace_id AND dept.id = l.department_id\nWHERE p.workspace_id = :workspaceId!\n  AND i.kind = :kind!\n  AND (:itemId::uuid IS NULL OR p.item_id = :itemId::uuid)\n  AND (:locationId::uuid IS NULL OR p.location_id = :locationId::uuid)\n  -- Un frasco trasladado deja su posición de origen vacía: solo se muestra donde está.\n  AND (p.container_id IS NULL OR p.balance > 0 OR NOT EXISTS (\n    SELECT 1 FROM inventory.positions AS other\n    WHERE other.workspace_id = p.workspace_id AND other.container_id = p.container_id AND other.balance > 0\n  ))\n  AND (\n    :afterId::uuid IS NULL\n    OR (lower(i.code), lower(l.code), coalesce(c.seq, 0), lower(loc.code), p.id)\n       > (:afterItem::text, :afterLot::text, :afterSeq::int, :afterLocation::text, :afterId::uuid)\n  )\nORDER BY lower(i.code), lower(l.code), coalesce(c.seq, 0), lower(loc.code), p.id\nLIMIT :limit!"};

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
 *   l.brand,
 *   dept.id AS "department_id?",
 *   dept.name AS "department_name?",
 *   p.disposition,
 *   c.id AS "container_id?",
 *   c.code AS container_code,
 *   trim_scale(c.initial_quantity) AS container_initial_quantity,
 *   c.created_at AS "container_received_at?",
 *   -- Quién lo ingresó: el actor del ingreso que llenó su primera posición; nadie si no hubo ingreso.
 *   receipt.operation_id IS NOT NULL AS "container_has_receipt!",
 *   receipt.actor_name AS "container_received_by_name?",
 *   trim_scale(c.tare) AS container_tare,
 *   trim_scale(c.density) AS container_density,
 *   loc.id AS location_id,
 *   loc.code AS location_code,
 *   loc.name AS location_name,
 *   -- Ruta desde el primer nivel bajo la sede (sin ella, salvo que sea la propia), hasta 6 niveles.
 *   (
 *     WITH RECURSIVE up AS (
 *       SELECT loc.parent_id, loc.kind, loc.name, 0 AS depth
 *       UNION ALL
 *       SELECT parent.parent_id, parent.kind, parent.name, up.depth + 1
 *       FROM up
 *       JOIN core.locations AS parent ON parent.workspace_id = loc.workspace_id AND parent.id = up.parent_id
 *       WHERE up.depth < 5
 *     )
 *     SELECT array_agg(up.name ORDER BY up.depth DESC) FILTER (WHERE up.depth = 0 OR up.kind <> 'site')
 *     FROM up
 *   ) AS "location_path!",
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
 * -- El nombre sale de la misma cadena que el actor de listOperations.
 * LEFT JOIN LATERAL (
 *   SELECT o.id AS operation_id, ident.display_name AS actor_name
 *   FROM inventory.positions AS cp
 *   JOIN inventory.entries AS e ON e.workspace_id = cp.workspace_id AND e.position_id = cp.id
 *   JOIN inventory.operations AS o ON o.workspace_id = e.workspace_id AND o.id = e.operation_id
 *   LEFT JOIN core.principals AS pr ON pr.workspace_id = o.workspace_id AND pr.id = o.actor_principal_id
 *   LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 *   LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
 *   WHERE cp.workspace_id = c.workspace_id AND cp.container_id = c.id AND o.type = 'receipt'
 *   ORDER BY o.effective_at, o.id
 *   LIMIT 1
 * ) AS receipt ON true
 * JOIN core.locations AS loc ON loc.workspace_id = p.workspace_id AND loc.id = p.location_id
 * LEFT JOIN core.departments AS dept ON dept.workspace_id = l.workspace_id AND dept.id = l.department_id
 * WHERE p.workspace_id = :workspaceId!
 *   AND i.kind = :kind!
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
  container_code: string;
  cursor_at: string;
  destination: string | null;
  effective_at: Date;
  entry_id: string;
  id: string;
  item_code: string;
  item_id: string;
  item_name: string;
  location_code: string;
  location_name: string;
  location_path: stringArray;
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

const listOperationsIR: any = {"usedParamSet":{"workspaceId":true,"kind":true,"types":true,"itemIds":true,"responsibleIds":true,"destinations":true,"reasons":true,"filterLocationIds":true,"positionId":true,"days":true,"timeZone":true,"fromDate":true,"toDate":true,"beforeId":true,"beforeAt":true,"beforeEntryId":true,"limit":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":2247,"b":2259},{"a":4826,"b":4838}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":2278,"b":2283}]},{"name":"types","required":false,"transform":{"type":"scalar"},"locs":[{"a":2294,"b":2299},{"a":2334,"b":2339}]},{"name":"itemIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":2360,"b":2367},{"a":2405,"b":2412}]},{"name":"responsibleIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":2440,"b":2454},{"a":2548,"b":2562}]},{"name":"destinations","required":false,"transform":{"type":"scalar"},"locs":[{"a":2588,"b":2600},{"a":2642,"b":2654}]},{"name":"reasons","required":false,"transform":{"type":"scalar"},"locs":[{"a":2675,"b":2682},{"a":2719,"b":2726}]},{"name":"filterLocationIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":2747,"b":2764},{"a":2806,"b":2823}]},{"name":"positionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2844,"b":2854},{"a":2880,"b":2890}]},{"name":"days","required":false,"transform":{"type":"scalar"},"locs":[{"a":3008,"b":3012},{"a":3097,"b":3101}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":3076,"b":3085},{"a":3138,"b":3147},{"a":3346,"b":3355},{"a":3455,"b":3464}]},{"name":"fromDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":3260,"b":3268},{"a":3306,"b":3314}]},{"name":"toDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":3368,"b":3374},{"a":3412,"b":3418}]},{"name":"beforeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":3484,"b":3492},{"a":3573,"b":3581}]},{"name":"beforeAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":3549,"b":3557}]},{"name":"beforeEntryId","required":false,"transform":{"type":"scalar"},"locs":[{"a":3590,"b":3603}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":3679,"b":3685}]}],"statement":"-- Un asiento por fila: un ingreso de varios frascos son varias filas de la misma operación. El\n-- cursor incluye el asiento para que una página nunca corte una operación a medias. La ruta de la\n-- ubicación se calcula fuera de `page`, solo para las filas de la página.\nWITH page AS (\n  SELECT\n    o.id,\n    e.id AS entry_id,\n    o.type,\n    o.effective_at,\n    -- Marca exacta (microsegundos, UTC) para el cursor; un Date de JavaScript la redondearía.\n    to_char(o.effective_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS cursor_at,\n    o.reason,\n    o.destination,\n    o.reference,\n    o.requested_by_principal_id,\n    o.actor_principal_id,\n    ident.display_name AS actor_name,\n    requester.display_name AS requester_name,\n    e.position_id,\n    trim_scale(e.quantity) AS quantity,\n    trim_scale(e.balance_after) AS balance_after,\n    p.item_id,\n    i.code AS item_code,\n    i.name AS item_name,\n    l.code AS lot_code,\n    c.code AS container_code,\n    p.location_id,\n    i.base_unit\n  FROM inventory.operations AS o\n  JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id\n  JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id\n  JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\n  JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\n  LEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id\n  LEFT JOIN core.principals AS pr ON pr.workspace_id = o.workspace_id AND pr.id = o.actor_principal_id\n  LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\n  LEFT JOIN core.identities AS ident ON ident.id = m.identity_id\n  LEFT JOIN core.principals AS rqp ON rqp.workspace_id = o.workspace_id AND rqp.id = o.requested_by_principal_id\n  LEFT JOIN core.memberships AS rqm ON rqm.workspace_id = rqp.workspace_id AND rqm.id = rqp.membership_id\n  LEFT JOIN core.identities AS requester ON requester.id = rqm.identity_id\n  -- Filtros del libro (ADR 0014), los mismos en operationFacets y operationTotals: si cambian aquí,\n  -- cambian allí. `filterLocationIds` es la ubicación que elige el usuario.\n  WHERE o.workspace_id = :workspaceId!\n    AND i.kind = :kind!\n    AND (:types::text[] IS NULL OR o.type = ANY (:types::text[]))\n    AND (:itemIds::uuid[] IS NULL OR p.item_id = ANY (:itemIds::uuid[]))\n    AND (\n      :responsibleIds::uuid[] IS NULL\n      OR coalesce(o.requested_by_principal_id, o.actor_principal_id) = ANY (:responsibleIds::uuid[])\n    )\n    AND (:destinations::text[] IS NULL OR o.destination = ANY (:destinations::text[]))\n    AND (:reasons::text[] IS NULL OR o.reason = ANY (:reasons::text[]))\n    AND (:filterLocationIds::uuid[] IS NULL OR p.location_id = ANY (:filterLocationIds::uuid[]))\n    AND (:positionId::uuid IS NULL OR p.id = :positionId::uuid)\n    -- Misma ventana que countOperationsByDay: desde la medianoche local de hace N - 1 días.\n    AND (\n      :days::int IS NULL\n      OR o.effective_at >= (((now() AT TIME ZONE :timeZone!)::date - (:days::int - 1))::timestamp AT TIME ZONE :timeZone!)\n    )\n    -- Desde la medianoche local de `fromDate` hasta antes de la del día siguiente a `toDate`.\n    AND (:fromDate::date IS NULL OR o.effective_at >= (:fromDate::date::timestamp AT TIME ZONE :timeZone!))\n    AND (:toDate::date IS NULL OR o.effective_at < ((:toDate::date + 1)::timestamp AT TIME ZONE :timeZone!))\n    AND (\n      :beforeId::uuid IS NULL\n      OR (o.effective_at, o.id, e.id) < (:beforeAt::timestamptz, :beforeId::uuid, :beforeEntryId::uuid)\n    )\n  ORDER BY o.effective_at DESC, o.id DESC, e.id DESC\n  LIMIT :limit!\n)\nSELECT\n  page.id,\n  page.entry_id,\n  page.type,\n  page.effective_at,\n  page.cursor_at AS \"cursor_at!\",\n  page.reason,\n  page.destination,\n  page.reference,\n  page.requested_by_principal_id,\n  page.actor_principal_id,\n  page.actor_name,\n  page.requester_name,\n  page.position_id,\n  page.quantity AS \"quantity!\",\n  page.balance_after AS \"balance_after!\",\n  page.item_id,\n  page.item_code,\n  page.item_name,\n  page.lot_code,\n  page.container_code,\n  loc.code AS location_code,\n  loc.name AS location_name,\n  -- La misma ruta que listPositions: desde el primer nivel bajo la sede, hasta 6 niveles.\n  (\n    WITH RECURSIVE up AS (\n      SELECT loc.parent_id, loc.kind, loc.name, 0 AS depth\n      UNION ALL\n      SELECT parent.parent_id, parent.kind, parent.name, up.depth + 1\n      FROM up\n      JOIN core.locations AS parent ON parent.workspace_id = loc.workspace_id AND parent.id = up.parent_id\n      WHERE up.depth < 5\n    )\n    SELECT array_agg(up.name ORDER BY up.depth DESC) FILTER (WHERE up.depth = 0 OR up.kind <> 'site')\n    FROM up\n  ) AS \"location_path!\",\n  page.base_unit\nFROM page\nJOIN core.locations AS loc ON loc.workspace_id = :workspaceId! AND loc.id = page.location_id\nORDER BY page.effective_at DESC, page.id DESC, page.entry_id DESC"};

/**
 * Query generated from SQL:
 * ```
 * -- Un asiento por fila: un ingreso de varios frascos son varias filas de la misma operación. El
 * -- cursor incluye el asiento para que una página nunca corte una operación a medias. La ruta de la
 * -- ubicación se calcula fuera de `page`, solo para las filas de la página.
 * WITH page AS (
 *   SELECT
 *     o.id,
 *     e.id AS entry_id,
 *     o.type,
 *     o.effective_at,
 *     -- Marca exacta (microsegundos, UTC) para el cursor; un Date de JavaScript la redondearía.
 *     to_char(o.effective_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_at,
 *     o.reason,
 *     o.destination,
 *     o.reference,
 *     o.requested_by_principal_id,
 *     o.actor_principal_id,
 *     ident.display_name AS actor_name,
 *     requester.display_name AS requester_name,
 *     e.position_id,
 *     trim_scale(e.quantity) AS quantity,
 *     trim_scale(e.balance_after) AS balance_after,
 *     p.item_id,
 *     i.code AS item_code,
 *     i.name AS item_name,
 *     l.code AS lot_code,
 *     c.code AS container_code,
 *     p.location_id,
 *     i.base_unit
 *   FROM inventory.operations AS o
 *   JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
 *   JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
 *   JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 *   JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
 *   LEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id
 *   LEFT JOIN core.principals AS pr ON pr.workspace_id = o.workspace_id AND pr.id = o.actor_principal_id
 *   LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 *   LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
 *   LEFT JOIN core.principals AS rqp ON rqp.workspace_id = o.workspace_id AND rqp.id = o.requested_by_principal_id
 *   LEFT JOIN core.memberships AS rqm ON rqm.workspace_id = rqp.workspace_id AND rqm.id = rqp.membership_id
 *   LEFT JOIN core.identities AS requester ON requester.id = rqm.identity_id
 *   -- Filtros del libro (ADR 0014), los mismos en operationFacets y operationTotals: si cambian aquí,
 *   -- cambian allí. `filterLocationIds` es la ubicación que elige el usuario.
 *   WHERE o.workspace_id = :workspaceId!
 *     AND i.kind = :kind!
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
 *     -- Misma ventana que countOperationsByDay: desde la medianoche local de hace N - 1 días.
 *     AND (
 *       :days::int IS NULL
 *       OR o.effective_at >= (((now() AT TIME ZONE :timeZone!)::date - (:days::int - 1))::timestamp AT TIME ZONE :timeZone!)
 *     )
 *     -- Desde la medianoche local de `fromDate` hasta antes de la del día siguiente a `toDate`.
 *     AND (:fromDate::date IS NULL OR o.effective_at >= (:fromDate::date::timestamp AT TIME ZONE :timeZone!))
 *     AND (:toDate::date IS NULL OR o.effective_at < ((:toDate::date + 1)::timestamp AT TIME ZONE :timeZone!))
 *     AND (
 *       :beforeId::uuid IS NULL
 *       OR (o.effective_at, o.id, e.id) < (:beforeAt::timestamptz, :beforeId::uuid, :beforeEntryId::uuid)
 *     )
 *   ORDER BY o.effective_at DESC, o.id DESC, e.id DESC
 *   LIMIT :limit!
 * )
 * SELECT
 *   page.id,
 *   page.entry_id,
 *   page.type,
 *   page.effective_at,
 *   page.cursor_at AS "cursor_at!",
 *   page.reason,
 *   page.destination,
 *   page.reference,
 *   page.requested_by_principal_id,
 *   page.actor_principal_id,
 *   page.actor_name,
 *   page.requester_name,
 *   page.position_id,
 *   page.quantity AS "quantity!",
 *   page.balance_after AS "balance_after!",
 *   page.item_id,
 *   page.item_code,
 *   page.item_name,
 *   page.lot_code,
 *   page.container_code,
 *   loc.code AS location_code,
 *   loc.name AS location_name,
 *   -- La misma ruta que listPositions: desde el primer nivel bajo la sede, hasta 6 niveles.
 *   (
 *     WITH RECURSIVE up AS (
 *       SELECT loc.parent_id, loc.kind, loc.name, 0 AS depth
 *       UNION ALL
 *       SELECT parent.parent_id, parent.kind, parent.name, up.depth + 1
 *       FROM up
 *       JOIN core.locations AS parent ON parent.workspace_id = loc.workspace_id AND parent.id = up.parent_id
 *       WHERE up.depth < 5
 *     )
 *     SELECT array_agg(up.name ORDER BY up.depth DESC) FILTER (WHERE up.depth = 0 OR up.kind <> 'site')
 *     FROM up
 *   ) AS "location_path!",
 *   page.base_unit
 * FROM page
 * JOIN core.locations AS loc ON loc.workspace_id = :workspaceId! AND loc.id = page.location_id
 * ORDER BY page.effective_at DESC, page.id DESC, page.entry_id DESC
 * ```
 */
export const listOperations = new PreparedQuery<IListOperationsParams,IListOperationsResult>(listOperationsIR);


/** 'CountOperationsByDay' parameters type */
export interface ICountOperationsByDayParams {
  days: number;
  kind: string;
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

const countOperationsByDayIR: any = {"usedParamSet":{"timeZone":true,"days":true,"workspaceId":true,"type":true,"kind":true},"params":[{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":279,"b":288},{"a":360,"b":369},{"a":556,"b":565},{"a":765,"b":774}]},{"name":"days","required":true,"transform":{"type":"scalar"},"locs":[{"a":300,"b":305}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":664,"b":676}]},{"name":"type","required":true,"transform":{"type":"scalar"},"locs":[{"a":695,"b":700}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":1126,"b":1131}]}],"statement":"-- Operaciones de un tipo por día, en la zona del espacio, para los gráficos (ADR 0011). Cuenta\n-- sucesos: nunca suma cantidades de unidades distintas. Los días sin operaciones salen con cero para\n-- que el gráfico no salte fechas.\nWITH bounds AS (\n  SELECT (now() AT TIME ZONE :timeZone!)::date - (:days!::int - 1) AS first_day,\n         (now() AT TIME ZONE :timeZone!)::date AS last_day\n),\ndays AS (\n  SELECT generate_series(b.first_day, b.last_day, interval '1 day')::date AS day\n  FROM bounds AS b\n),\nscoped AS (\n  SELECT (o.effective_at AT TIME ZONE :timeZone!)::date AS day\n  FROM inventory.operations AS o\n  CROSS JOIN bounds AS b\n  WHERE o.workspace_id = :workspaceId!\n    AND o.type = :type!\n    AND o.effective_at >= (b.first_day::timestamp AT TIME ZONE :timeZone!)\n    AND EXISTS (\n      SELECT 1\n      FROM inventory.entries AS e\n      JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id\n      JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\n      WHERE e.workspace_id = o.workspace_id\n        AND e.operation_id = o.id\n        AND i.kind = :kind!\n    )\n)\nSELECT to_char(d.day, 'YYYY-MM-DD') AS \"day!\", count(s.day)::int AS \"count!\"\nFROM days AS d\nLEFT JOIN scoped AS s ON s.day = d.day\nGROUP BY d.day\nORDER BY d.day"};

/**
 * Query generated from SQL:
 * ```
 * -- Operaciones de un tipo por día, en la zona del espacio, para los gráficos (ADR 0011). Cuenta
 * -- sucesos: nunca suma cantidades de unidades distintas. Los días sin operaciones salen con cero para
 * -- que el gráfico no salte fechas.
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

const operationFacetsIR: any = {"usedParamSet":{"types":true,"itemIds":true,"responsibleIds":true,"destinations":true,"reasons":true,"filterLocationIds":true,"workspaceId":true,"kind":true,"positionId":true,"days":true,"timeZone":true,"fromDate":true,"toDate":true,"productQuery":true,"productLimit":true},"params":[{"name":"types","required":false,"transform":{"type":"scalar"},"locs":[{"a":682,"b":687},{"a":722,"b":727},{"a":3576,"b":3581}]},{"name":"itemIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":771,"b":778},{"a":816,"b":823},{"a":3647,"b":3654}]},{"name":"responsibleIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":874,"b":888},{"a":982,"b":996},{"a":3724,"b":3738}]},{"name":"destinations","required":false,"transform":{"type":"scalar"},"locs":[{"a":1058,"b":1070},{"a":1112,"b":1124},{"a":3808,"b":3820}]},{"name":"reasons","required":false,"transform":{"type":"scalar"},"locs":[{"a":1175,"b":1182},{"a":1219,"b":1226},{"a":3885,"b":3892}]},{"name":"filterLocationIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1272,"b":1289},{"a":1331,"b":1348},{"a":3959,"b":3976}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1707,"b":1719},{"a":4757,"b":4769},{"a":4900,"b":4912},{"a":5021,"b":5033}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":1738,"b":1743},{"a":4787,"b":4792}]},{"name":"positionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1754,"b":1764},{"a":1790,"b":1800}]},{"name":"days","required":false,"transform":{"type":"scalar"},"locs":[{"a":1825,"b":1829},{"a":1914,"b":1918}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":1893,"b":1902},{"a":1955,"b":1964},{"a":2068,"b":2077},{"a":2177,"b":2186}]},{"name":"fromDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":1982,"b":1990},{"a":2028,"b":2036}]},{"name":"toDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":2090,"b":2096},{"a":2134,"b":2140}]},{"name":"productQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":5815,"b":5827},{"a":5880,"b":5892},{"a":5943,"b":5955}]},{"name":"productLimit","required":true,"transform":{"type":"scalar"},"locs":[{"a":6136,"b":6149}]}],"statement":"-- Asientos por opción de cada filtro de Movimientos (ADR 0014), en una sola lectura del libro para que\n-- el total y los grupos salgan de la misma instantánea. Faceta disyuntiva: cada grupo aplica todos los\n-- filtros menos el suyo, así marcar «Salidas» sigue contando los ingresos. Llegan las opciones con\n-- asientos y las elegidas aunque queden en cero (para poder quitarlas), pero nunca un reactivo de otro\n-- tipo, un principal ni una ubicación de otro espacio.\nWITH scoped AS MATERIALIZED (\n  SELECT\n    o.type,\n    p.item_id,\n    coalesce(o.requested_by_principal_id, o.actor_principal_id) AS responsible_id,\n    o.destination,\n    o.reason,\n    p.location_id,\n    coalesce(:types::text[] IS NULL OR o.type = ANY (:types::text[]), false) AS by_type,\n    coalesce(:itemIds::uuid[] IS NULL OR p.item_id = ANY (:itemIds::uuid[]), false) AS by_item,\n    coalesce(\n      :responsibleIds::uuid[] IS NULL\n      OR coalesce(o.requested_by_principal_id, o.actor_principal_id) = ANY (:responsibleIds::uuid[]),\n      false\n    ) AS by_responsible,\n    coalesce(:destinations::text[] IS NULL OR o.destination = ANY (:destinations::text[]), false) AS by_destination,\n    coalesce(:reasons::text[] IS NULL OR o.reason = ANY (:reasons::text[]), false) AS by_reason,\n    coalesce(:filterLocationIds::uuid[] IS NULL OR p.location_id = ANY (:filterLocationIds::uuid[]), false) AS by_location\n  FROM inventory.operations AS o\n  JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id\n  JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id\n  JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\n  WHERE o.workspace_id = :workspaceId!\n    AND i.kind = :kind!\n    AND (:positionId::uuid IS NULL OR p.id = :positionId::uuid)\n    AND (\n      :days::int IS NULL\n      OR o.effective_at >= (((now() AT TIME ZONE :timeZone!)::date - (:days::int - 1))::timestamp AT TIME ZONE :timeZone!)\n    )\n    AND (:fromDate::date IS NULL OR o.effective_at >= (:fromDate::date::timestamp AT TIME ZONE :timeZone!))\n    AND (:toDate::date IS NULL OR o.effective_at < ((:toDate::date + 1)::timestamp AT TIME ZONE :timeZone!))\n),\ncounted AS (\n  SELECT 'total' AS facet, NULL::uuid AS id, NULL::text AS value, count(*) AS n\n  FROM scoped\n  WHERE by_type AND by_item AND by_responsible AND by_destination AND by_reason AND by_location\n  UNION ALL\n  SELECT 'type', NULL, type, count(*)\n  FROM scoped\n  WHERE by_item AND by_responsible AND by_destination AND by_reason AND by_location\n  GROUP BY type\n  UNION ALL\n  SELECT 'product', item_id, NULL, count(*)\n  FROM scoped\n  WHERE by_type AND by_responsible AND by_destination AND by_reason AND by_location\n  GROUP BY item_id\n  UNION ALL\n  SELECT 'responsible', responsible_id, NULL, count(*)\n  FROM scoped\n  WHERE by_type AND by_item AND by_destination AND by_reason AND by_location\n  GROUP BY responsible_id\n  UNION ALL\n  SELECT 'destination', NULL, destination, count(*)\n  FROM scoped\n  WHERE destination IS NOT NULL AND by_type AND by_item AND by_responsible AND by_reason AND by_location\n  GROUP BY destination\n  UNION ALL\n  SELECT 'reason', NULL, reason, count(*)\n  FROM scoped\n  WHERE reason IS NOT NULL AND by_type AND by_item AND by_responsible AND by_destination AND by_location\n  GROUP BY reason\n  UNION ALL\n  SELECT 'location', location_id, NULL, count(*)\n  FROM scoped\n  WHERE by_type AND by_item AND by_responsible AND by_destination AND by_reason\n  GROUP BY location_id\n),\nselected AS (\n  SELECT 'type' AS facet, NULL::uuid AS id, v AS value FROM unnest(:types::text[]) AS v\n  UNION ALL SELECT 'product', v, NULL FROM unnest(:itemIds::uuid[]) AS v\n  UNION ALL SELECT 'responsible', v, NULL FROM unnest(:responsibleIds::uuid[]) AS v\n  UNION ALL SELECT 'destination', NULL, v FROM unnest(:destinations::text[]) AS v\n  UNION ALL SELECT 'reason', NULL, v FROM unnest(:reasons::text[]) AS v\n  UNION ALL SELECT 'location', v, NULL FROM unnest(:filterLocationIds::uuid[]) AS v\n),\noptions AS (\n  SELECT\n    coalesce(c.facet, s.facet) AS facet,\n    coalesce(c.id, s.id) AS id,\n    coalesce(c.value, s.value) AS value,\n    coalesce(c.n, 0) AS n,\n    s.facet IS NOT NULL AS selected\n  FROM counted AS c\n  FULL JOIN selected AS s\n    ON s.facet = c.facet AND s.id IS NOT DISTINCT FROM c.id AND s.value IS NOT DISTINCT FROM c.value\n),\nnamed AS (\n  SELECT\n    op.facet,\n    op.id,\n    op.value,\n    op.n,\n    op.selected,\n    coalesce(item.code, loc.code) AS code,\n    CASE op.facet\n      WHEN 'product' THEN item.name\n      WHEN 'location' THEN loc.name\n      WHEN 'responsible' THEN ident.display_name\n      ELSE op.value\n    END AS name\n  FROM options AS op\n  LEFT JOIN inventory.items AS item\n    ON op.facet = 'product' AND item.workspace_id = :workspaceId! AND item.kind = :kind! AND item.id = op.id\n  LEFT JOIN core.locations AS loc\n    ON op.facet = 'location' AND loc.workspace_id = :workspaceId! AND loc.id = op.id\n  LEFT JOIN core.principals AS pr\n    ON op.facet = 'responsible' AND pr.workspace_id = :workspaceId! AND pr.id = op.id\n  LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\n  LEFT JOIN core.identities AS ident ON ident.id = m.identity_id\n  WHERE (op.facet <> 'product' OR item.id IS NOT NULL)\n    AND (op.facet <> 'location' OR loc.id IS NOT NULL)\n    AND (op.facet <> 'responsible' OR pr.id IS NOT NULL)\n),\nranked AS (\n  -- Reactivos: los elegidos siempre; de los demás, los que coinciden con la búsqueda, uno más del\n  -- límite para saber si hay más.\n  SELECT\n    nd.*,\n    CASE WHEN nd.facet = 'product' AND NOT nd.selected THEN\n      row_number() OVER (PARTITION BY nd.facet, nd.selected ORDER BY nd.n DESC, lower(nd.name), nd.id)\n    END AS product_rank\n  FROM named AS nd\n  WHERE nd.facet <> 'product'\n     OR nd.selected\n     OR :productQuery::text IS NULL\n     OR strpos(lower(nd.code), lower(:productQuery::text)) > 0\n     OR strpos(lower(nd.name), lower(:productQuery::text)) > 0\n)\nSELECT\n  facet AS \"facet!\",\n  id,\n  value,\n  code,\n  name,\n  n::int AS \"count!\",\n  selected AS \"selected!\"\nFROM ranked\nWHERE product_rank IS NULL OR product_rank <= :productLimit!::int + 1\nORDER BY facet, n DESC, lower(name), id, value"};

/**
 * Query generated from SQL:
 * ```
 * -- Asientos por opción de cada filtro de Movimientos (ADR 0014), en una sola lectura del libro para que
 * -- el total y los grupos salgan de la misma instantánea. Faceta disyuntiva: cada grupo aplica todos los
 * -- filtros menos el suyo, así marcar «Salidas» sigue contando los ingresos. Llegan las opciones con
 * -- asientos y las elegidas aunque queden en cero (para poder quitarlas), pero nunca un reactivo de otro
 * -- tipo, un principal ni una ubicación de otro espacio.
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

const operationTotalsIR: any = {"usedParamSet":{"groupBy":true,"timeZone":true,"workspaceId":true,"kind":true,"types":true,"itemIds":true,"responsibleIds":true,"destinations":true,"reasons":true,"filterLocationIds":true,"positionId":true,"days":true,"fromDate":true,"toDate":true,"maxGroups":true},"params":[{"name":"groupBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":414,"b":422},{"a":586,"b":594},{"a":2974,"b":2982},{"a":3247,"b":3255},{"a":3376,"b":3384},{"a":3721,"b":3729}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":706,"b":715},{"a":1881,"b":1890},{"a":1943,"b":1952},{"a":2056,"b":2065},{"a":2165,"b":2174}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1145,"b":1157},{"a":3297,"b":3309},{"a":3430,"b":3442},{"a":4510,"b":4522}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":1176,"b":1181}]},{"name":"types","required":false,"transform":{"type":"scalar"},"locs":[{"a":1192,"b":1197},{"a":1232,"b":1237}]},{"name":"itemIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1258,"b":1265},{"a":1303,"b":1310}]},{"name":"responsibleIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1338,"b":1352},{"a":1446,"b":1460}]},{"name":"destinations","required":false,"transform":{"type":"scalar"},"locs":[{"a":1486,"b":1498},{"a":1540,"b":1552}]},{"name":"reasons","required":false,"transform":{"type":"scalar"},"locs":[{"a":1573,"b":1580},{"a":1617,"b":1624}]},{"name":"filterLocationIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1645,"b":1662},{"a":1704,"b":1721}]},{"name":"positionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1742,"b":1752},{"a":1778,"b":1788}]},{"name":"days","required":false,"transform":{"type":"scalar"},"locs":[{"a":1813,"b":1817},{"a":1902,"b":1906}]},{"name":"fromDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":1970,"b":1978},{"a":2016,"b":2024}]},{"name":"toDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":2078,"b":2084},{"a":2122,"b":2128}]},{"name":"maxGroups","required":true,"transform":{"type":"scalar"},"locs":[{"a":4567,"b":4577}]}],"statement":"-- Totales del libro filtrado (ADR 0014), por reactivo, responsable, destino o mes en la zona del\n-- espacio. Cada fila es un reactivo dentro de su grupo, en su unidad base: nunca suma unidades\n-- distintas. Las sumas llevan signo y son exactas (numeric); un traslado se cuenta, pero no suma\n-- cantidad. Llegan los primeros `maxGroups` grupos y `groups_total` dice cuántos hay.\nWITH scoped AS (\n  SELECT\n    CASE :groupBy!::text\n      WHEN 'product' THEN p.item_id\n      WHEN 'responsible' THEN coalesce(o.requested_by_principal_id, o.actor_principal_id)\n    END AS group_id,\n    CASE :groupBy!::text\n      WHEN 'destination' THEN o.destination\n      WHEN 'month' THEN to_char(o.effective_at AT TIME ZONE :timeZone!, 'YYYY-MM')\n    END AS group_text,\n    p.item_id,\n    o.id AS operation_id,\n    o.type,\n    e.quantity\n  FROM inventory.operations AS o\n  JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id\n  JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id\n  JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\n  WHERE o.workspace_id = :workspaceId!\n    AND i.kind = :kind!\n    AND (:types::text[] IS NULL OR o.type = ANY (:types::text[]))\n    AND (:itemIds::uuid[] IS NULL OR p.item_id = ANY (:itemIds::uuid[]))\n    AND (\n      :responsibleIds::uuid[] IS NULL\n      OR coalesce(o.requested_by_principal_id, o.actor_principal_id) = ANY (:responsibleIds::uuid[])\n    )\n    AND (:destinations::text[] IS NULL OR o.destination = ANY (:destinations::text[]))\n    AND (:reasons::text[] IS NULL OR o.reason = ANY (:reasons::text[]))\n    AND (:filterLocationIds::uuid[] IS NULL OR p.location_id = ANY (:filterLocationIds::uuid[]))\n    AND (:positionId::uuid IS NULL OR p.id = :positionId::uuid)\n    AND (\n      :days::int IS NULL\n      OR o.effective_at >= (((now() AT TIME ZONE :timeZone!)::date - (:days::int - 1))::timestamp AT TIME ZONE :timeZone!)\n    )\n    AND (:fromDate::date IS NULL OR o.effective_at >= (:fromDate::date::timestamp AT TIME ZONE :timeZone!))\n    AND (:toDate::date IS NULL OR o.effective_at < ((:toDate::date + 1)::timestamp AT TIME ZONE :timeZone!))\n),\nper_item AS (\n  SELECT\n    group_id,\n    group_text,\n    item_id,\n    count(*) AS n,\n    sum(quantity) FILTER (WHERE type = 'receipt') AS receipts,\n    sum(quantity) FILTER (WHERE type = 'issue') AS issues,\n    sum(quantity) FILTER (WHERE type = 'adjustment') AS adjustments,\n    coalesce(sum(quantity) FILTER (WHERE type <> 'transfer'), 0) AS net,\n    -- Un traslado son dos asientos (sale y entra) de una operación: se cuenta una vez (ADR 0014).\n    count(DISTINCT operation_id) FILTER (WHERE type = 'transfer') AS transfers\n  FROM scoped\n  GROUP BY group_id, group_text, item_id\n),\nlabelled AS (\n  -- PARTITION BY agrupa los nulos juntos: las operaciones sin destino forman un solo grupo.\n  SELECT\n    pi.*,\n    sum(pi.n) OVER (PARTITION BY pi.group_id, pi.group_text) AS group_n,\n    CASE :groupBy!::text\n      WHEN 'product' THEN gi.name\n      WHEN 'responsible' THEN ident.display_name\n      WHEN 'destination' THEN coalesce(pi.group_text, 'Sin destino')\n      ELSE pi.group_text\n    END AS label\n  FROM per_item AS pi\n  LEFT JOIN inventory.items AS gi\n    ON :groupBy!::text = 'product' AND gi.workspace_id = :workspaceId! AND gi.id = pi.group_id\n  LEFT JOIN core.principals AS pr\n    ON :groupBy!::text = 'responsible' AND pr.workspace_id = :workspaceId! AND pr.id = pi.group_id\n  LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\n  LEFT JOIN core.identities AS ident ON ident.id = m.identity_id\n),\nranked AS (\n  SELECT\n    l.*,\n    dense_rank() OVER (\n      ORDER BY\n        CASE WHEN :groupBy!::text = 'month' THEN l.group_text END DESC,\n        l.group_n DESC,\n        lower(l.label),\n        l.group_id,\n        l.group_text\n    ) AS group_rank\n  FROM labelled AS l\n),\ncounted AS (\n  SELECT r.*, max(r.group_rank) OVER () AS groups_total FROM ranked AS r\n)\nSELECT\n  c.group_rank::int AS \"group_rank!\",\n  c.group_id,\n  c.group_text,\n  c.label,\n  c.group_n::int AS \"group_count!\",\n  c.groups_total::int AS \"groups_total!\",\n  i.id AS item_id,\n  i.code AS item_code,\n  i.name AS item_name,\n  i.base_unit,\n  c.n::int AS \"count!\",\n  trim_scale(c.receipts) AS receipts,\n  trim_scale(c.issues) AS issues,\n  trim_scale(c.adjustments) AS adjustments,\n  trim_scale(c.net) AS \"net!\",\n  c.transfers::int AS \"transfers!\"\nFROM counted AS c\nJOIN inventory.items AS i ON i.workspace_id = :workspaceId! AND i.id = c.item_id\nWHERE c.group_rank <= :maxGroups!::int\nORDER BY c.group_rank, c.n DESC, lower(i.code), i.id"};

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
 *     o.id AS operation_id,
 *     o.type,
 *     e.quantity
 *   FROM inventory.operations AS o
 *   JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
 *   JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
 *   JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 *   WHERE o.workspace_id = :workspaceId!
 *     AND i.kind = :kind!
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
 *     -- Un traslado son dos asientos (sale y entra) de una operación: se cuenta una vez (ADR 0014).
 *     count(DISTINCT operation_id) FILTER (WHERE type = 'transfer') AS transfers
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


/** 'StockedItemsByArea' parameters type */
export interface IStockedItemsByAreaParams {
  kind: string;
  workspaceId: string;
}

/** 'StockedItemsByArea' return type */
export interface IStockedItemsByAreaResult {
  area_id: string;
  count: number;
}

/** 'StockedItemsByArea' query type */
export interface IStockedItemsByAreaQuery {
  params: IStockedItemsByAreaParams;
  result: IStockedItemsByAreaResult;
}

const stockedItemsByAreaIR: any = {"usedParamSet":{"workspaceId":true,"kind":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":425,"b":437}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":452,"b":457}]}],"statement":"-- Cifras de Áreas (ADR 0024): ítems distintos del tipo con existencias en cada área, en todos sus niveles.\nSELECT la.area_id AS \"area_id!\", count(DISTINCT p.item_id)::integer AS \"count!\"\nFROM inventory.positions AS p\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nJOIN core.location_areas AS la ON la.workspace_id = p.workspace_id AND la.location_id = p.location_id\nWHERE p.workspace_id = :workspaceId! AND i.kind = :kind! AND p.balance > 0\nGROUP BY la.area_id"};

/**
 * Query generated from SQL:
 * ```
 * -- Cifras de Áreas (ADR 0024): ítems distintos del tipo con existencias en cada área, en todos sus niveles.
 * SELECT la.area_id AS "area_id!", count(DISTINCT p.item_id)::integer AS "count!"
 * FROM inventory.positions AS p
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 * JOIN core.location_areas AS la ON la.workspace_id = p.workspace_id AND la.location_id = p.location_id
 * WHERE p.workspace_id = :workspaceId! AND i.kind = :kind! AND p.balance > 0
 * GROUP BY la.area_id
 * ```
 */
export const stockedItemsByArea = new PreparedQuery<IStockedItemsByAreaParams,IStockedItemsByAreaResult>(stockedItemsByAreaIR);


/** 'StockedItemsByDepartment' parameters type */
export interface IStockedItemsByDepartmentParams {
  kind: string;
  workspaceId: string;
}

/** 'StockedItemsByDepartment' return type */
export interface IStockedItemsByDepartmentResult {
  count: number;
  department_id: string;
}

/** 'StockedItemsByDepartment' query type */
export interface IStockedItemsByDepartmentQuery {
  params: IStockedItemsByDepartmentParams;
  result: IStockedItemsByDepartmentResult;
}

const stockedItemsByDepartmentIR: any = {"usedParamSet":{"workspaceId":true,"kind":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":381,"b":393}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":408,"b":413}]}],"statement":"-- Ítems distintos del tipo con existencias en lotes de cada departamento.\nSELECT l.department_id AS \"department_id!\", count(DISTINCT p.item_id)::integer AS \"count!\"\nFROM inventory.positions AS p\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nJOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\nWHERE p.workspace_id = :workspaceId! AND i.kind = :kind! AND p.balance > 0 AND l.department_id IS NOT NULL\nGROUP BY l.department_id"};

/**
 * Query generated from SQL:
 * ```
 * -- Ítems distintos del tipo con existencias en lotes de cada departamento.
 * SELECT l.department_id AS "department_id!", count(DISTINCT p.item_id)::integer AS "count!"
 * FROM inventory.positions AS p
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 * JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
 * WHERE p.workspace_id = :workspaceId! AND i.kind = :kind! AND p.balance > 0 AND l.department_id IS NOT NULL
 * GROUP BY l.department_id
 * ```
 */
export const stockedItemsByDepartment = new PreparedQuery<IStockedItemsByDepartmentParams,IStockedItemsByDepartmentResult>(stockedItemsByDepartmentIR);


/** 'StockAt' parameters type */
export interface IStockAtParams {
  kind: string;
  locationIds: stringArray;
  workspaceId: string;
}

/** 'StockAt' return type */
export interface IStockAtResult {
  stocked: boolean;
}

/** 'StockAt' query type */
export interface IStockAtQuery {
  params: IStockAtParams;
  result: IStockAtResult;
}

const stockAtIR: any = {"usedParamSet":{"workspaceId":true,"kind":true,"locationIds":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":313,"b":325}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":340,"b":345}]},{"name":"locationIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":394,"b":406}]}],"statement":"-- ¿Hay existencias del tipo en alguna de estas ubicaciones? Lo pregunta el archivo de un área (ADR 0024),\n-- con las ubicaciones ya bloqueadas.\nSELECT EXISTS (\n  SELECT 1\n  FROM inventory.positions AS p\n  JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\n  WHERE p.workspace_id = :workspaceId! AND i.kind = :kind! AND p.balance > 0\n    AND p.location_id = ANY (:locationIds!::uuid[])\n) AS \"stocked!\""};

/**
 * Query generated from SQL:
 * ```
 * -- ¿Hay existencias del tipo en alguna de estas ubicaciones? Lo pregunta el archivo de un área (ADR 0024),
 * -- con las ubicaciones ya bloqueadas.
 * SELECT EXISTS (
 *   SELECT 1
 *   FROM inventory.positions AS p
 *   JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 *   WHERE p.workspace_id = :workspaceId! AND i.kind = :kind! AND p.balance > 0
 *     AND p.location_id = ANY (:locationIds!::uuid[])
 * ) AS "stocked!"
 * ```
 */
export const stockAt = new PreparedQuery<IStockAtParams,IStockAtResult>(stockAtIR);


/** 'ListBrands' parameters type */
export interface IListBrandsParams {
  kind: string;
  workspaceId: string;
}

/** 'ListBrands' return type */
export interface IListBrandsResult {
  brand: string;
}

/** 'ListBrands' query type */
export interface IListBrandsQuery {
  params: IListBrandsParams;
  result: IListBrandsResult;
}

const listBrandsIR: any = {"usedParamSet":{"workspaceId":true,"kind":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":330,"b":342}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":357,"b":362}]}],"statement":"-- Marcas ya usadas en lotes del tipo del módulo (ADR 0015): una por nombre, la más reciente primero.\nSELECT brand AS \"brand!\"\nFROM (\n  SELECT DISTINCT ON (lower(l.brand)) l.brand, l.created_at\n  FROM inventory.lots AS l\n  JOIN inventory.items AS i ON i.workspace_id = l.workspace_id AND i.id = l.item_id\n  WHERE l.workspace_id = :workspaceId! AND i.kind = :kind! AND l.brand IS NOT NULL\n  ORDER BY lower(l.brand), l.created_at DESC\n) AS brands\nORDER BY created_at DESC, lower(brand)\nLIMIT 50"};

/**
 * Query generated from SQL:
 * ```
 * -- Marcas ya usadas en lotes del tipo del módulo (ADR 0015): una por nombre, la más reciente primero.
 * SELECT brand AS "brand!"
 * FROM (
 *   SELECT DISTINCT ON (lower(l.brand)) l.brand, l.created_at
 *   FROM inventory.lots AS l
 *   JOIN inventory.items AS i ON i.workspace_id = l.workspace_id AND i.id = l.item_id
 *   WHERE l.workspace_id = :workspaceId! AND i.kind = :kind! AND l.brand IS NOT NULL
 *   ORDER BY lower(l.brand), l.created_at DESC
 * ) AS brands
 * ORDER BY created_at DESC, lower(brand)
 * LIMIT 50
 * ```
 */
export const listBrands = new PreparedQuery<IListBrandsParams,IListBrandsResult>(listBrandsIR);


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
  requestedBy?: string | null | void;
  status?: string | null | void;
  workspaceId: string;
}

/** 'ListAllocations' return type */
export interface IListAllocationsResult {
  base_unit: string;
  container_code: string;
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

const listAllocationsIR: any = {"usedParamSet":{"workspaceId":true,"kind":true,"status":true,"requestedBy":true,"limit":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1592,"b":1604}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":1621,"b":1626}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":1635,"b":1641},{"a":1671,"b":1677}]},{"name":"requestedBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":1693,"b":1704},{"a":1753,"b":1764}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":1843,"b":1849}]}],"statement":"-- Solicitudes del espacio; `requestedBy` acota a las de una persona.\nSELECT\n  a.id,\n  a.status,\n  trim_scale(a.quantity) AS \"quantity!\",\n  a.reason,\n  a.destination,\n  a.decision_reason,\n  a.created_at,\n  a.decided_at,\n  a.position_id,\n  a.requested_by_principal_id,\n  a.decided_by_principal_id,\n  requester.display_name AS requester_name,\n  decider.display_name AS decider_name,\n  i.id AS item_id,\n  i.name AS item_name,\n  i.base_unit,\n  l.code AS lot_code,\n  c.code AS container_code,\n  loc.code AS location_code,\n  loc.name AS location_name\nFROM inventory.allocations AS a\nJOIN inventory.positions AS p ON p.workspace_id = a.workspace_id AND p.id = a.position_id\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nJOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\nLEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id\nJOIN core.locations AS loc ON loc.workspace_id = p.workspace_id AND loc.id = p.location_id\nLEFT JOIN core.principals AS rp ON rp.workspace_id = a.workspace_id AND rp.id = a.requested_by_principal_id\nLEFT JOIN core.memberships AS rm ON rm.workspace_id = rp.workspace_id AND rm.id = rp.membership_id\nLEFT JOIN core.identities AS requester ON requester.id = rm.identity_id\nLEFT JOIN core.principals AS dp ON dp.workspace_id = a.workspace_id AND dp.id = a.decided_by_principal_id\nLEFT JOIN core.memberships AS dm ON dm.workspace_id = dp.workspace_id AND dm.id = dp.membership_id\nLEFT JOIN core.identities AS decider ON decider.id = dm.identity_id\nWHERE a.workspace_id = :workspaceId!\n  AND i.kind = :kind!\n  AND (:status::text IS NULL OR a.status = :status::text)\n  AND (:requestedBy::uuid IS NULL OR a.requested_by_principal_id = :requestedBy::uuid)\nORDER BY (a.status = 'held') DESC, a.created_at DESC, a.id DESC\nLIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * -- Solicitudes del espacio; `requestedBy` acota a las de una persona.
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
 *   c.code AS container_code,
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

const countPendingAllocationsIR: any = {"usedParamSet":{"workspaceId":true,"kind":true,"requestedBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":260,"b":272}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":289,"b":294}]},{"name":"requestedBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":327,"b":338},{"a":387,"b":398}]}],"statement":"SELECT count(*)::int AS \"count!\"\nFROM inventory.allocations AS a\nJOIN inventory.positions AS p ON p.workspace_id = a.workspace_id AND p.id = a.position_id\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nWHERE a.workspace_id = :workspaceId!\n  AND i.kind = :kind!\n  AND a.status = 'held'\n  AND (:requestedBy::uuid IS NULL OR a.requested_by_principal_id = :requestedBy::uuid)"};

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
 *   AND (:requestedBy::uuid IS NULL OR a.requested_by_principal_id = :requestedBy::uuid)
 * ```
 */
export const countPendingAllocations = new PreparedQuery<ICountPendingAllocationsParams,ICountPendingAllocationsResult>(countPendingAllocationsIR);


/** 'LockPositionPlace' parameters type */
export interface ILockPositionPlaceParams {
  positionId: string;
  workspaceId: string;
}

/** 'LockPositionPlace' return type */
export interface ILockPositionPlaceResult {
  id: string;
}

/** 'LockPositionPlace' query type */
export interface ILockPositionPlaceQuery {
  params: ILockPositionPlaceParams;
  result: ILockPositionPlaceResult;
}

const lockPositionPlaceIR: any = {"usedParamSet":{"workspaceId":true,"positionId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":343,"b":355}]},{"name":"positionId","required":true,"transform":{"type":"scalar"},"locs":[{"a":368,"b":379}]}],"statement":"-- La ubicación activa de una posición, bloqueada (compartida) hasta el final: un movimiento que suma no deja\n-- existencias en un lugar archivado y archivarlo espera a que termine (ADR 0024).\nSELECT l.id\nFROM inventory.positions AS p\nJOIN core.locations AS l ON l.workspace_id = p.workspace_id AND l.id = p.location_id\nWHERE p.workspace_id = :workspaceId! AND p.id = :positionId! AND l.archived_at IS NULL\nFOR SHARE OF l"};

/**
 * Query generated from SQL:
 * ```
 * -- La ubicación activa de una posición, bloqueada (compartida) hasta el final: un movimiento que suma no deja
 * -- existencias en un lugar archivado y archivarlo espera a que termine (ADR 0024).
 * SELECT l.id
 * FROM inventory.positions AS p
 * JOIN core.locations AS l ON l.workspace_id = p.workspace_id AND l.id = p.location_id
 * WHERE p.workspace_id = :workspaceId! AND p.id = :positionId! AND l.archived_at IS NULL
 * FOR SHARE OF l
 * ```
 */
export const lockPositionPlace = new PreparedQuery<ILockPositionPlaceParams,ILockPositionPlaceResult>(lockPositionPlaceIR);


