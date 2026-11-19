/** Types generated for queries found in "src/modules/materials/infrastructure/loans.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'NextLoanNumber' parameters type */
export interface INextLoanNumberParams {
  workspaceId: string;
}

/** 'NextLoanNumber' return type */
export interface INextLoanNumberResult {
  number: number;
}

/** 'NextLoanNumber' query type */
export interface INextLoanNumberQuery {
  params: INextLoanNumberParams;
  result: INextLoanNumberResult;
}

const nextLoanNumberIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":203,"b":215}]}],"statement":"-- El siguiente número del espacio; se pide con el bloqueo del espacio tomado, así dos vales no repiten número.\nSELECT coalesce(max(number), 0) + 1 AS \"number!\"\nFROM materials.loans\nWHERE workspace_id = :workspaceId!"};

/**
 * Query generated from SQL:
 * ```
 * -- El siguiente número del espacio; se pide con el bloqueo del espacio tomado, así dos vales no repiten número.
 * SELECT coalesce(max(number), 0) + 1 AS "number!"
 * FROM materials.loans
 * WHERE workspace_id = :workspaceId!
 * ```
 */
export const nextLoanNumber = new PreparedQuery<INextLoanNumberParams,INextLoanNumberResult>(nextLoanNumberIR);


/** 'InsertLoan' parameters type */
export interface IInsertLoanParams {
  borrowerId: string;
  dueOn?: string | null | void;
  notes?: string | null | void;
  number: number;
  principalId: string;
  workspaceId: string;
}

/** 'InsertLoan' return type */
export interface IInsertLoanResult {
  id: string;
}

/** 'InsertLoan' query type */
export interface IInsertLoanQuery {
  params: IInsertLoanParams;
  result: IInsertLoanResult;
}

const insertLoanIR: any = {"usedParamSet":{"workspaceId":true,"number":true,"borrowerId":true,"principalId":true,"dueOn":true,"notes":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":119,"b":131}]},{"name":"number","required":true,"transform":{"type":"scalar"},"locs":[{"a":134,"b":141}]},{"name":"borrowerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":144,"b":155}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":158,"b":170}]},{"name":"dueOn","required":false,"transform":{"type":"scalar"},"locs":[{"a":173,"b":178}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":187,"b":192}]}],"statement":"INSERT INTO materials.loans (workspace_id, number, borrower_principal_id, lent_by_principal_id, due_on, notes)\nVALUES (:workspaceId!, :number!, :borrowerId!, :principalId!, :dueOn::date, :notes)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO materials.loans (workspace_id, number, borrower_principal_id, lent_by_principal_id, due_on, notes)
 * VALUES (:workspaceId!, :number!, :borrowerId!, :principalId!, :dueOn::date, :notes)
 * RETURNING id
 * ```
 */
export const insertLoan = new PreparedQuery<IInsertLoanParams,IInsertLoanResult>(insertLoanIR);


/** 'InsertLoanLine' parameters type */
export interface IInsertLoanLineParams {
  line: number;
  loanId: string;
  positionId: string;
  quantity: string;
  workspaceId: string;
}

/** 'InsertLoanLine' return type */
export type IInsertLoanLineResult = void;

/** 'InsertLoanLine' query type */
export interface IInsertLoanLineQuery {
  params: IInsertLoanLineParams;
  result: IInsertLoanLineResult;
}

const insertLoanLineIR: any = {"usedParamSet":{"workspaceId":true,"loanId":true,"line":true,"positionId":true,"quantity":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":94,"b":106}]},{"name":"loanId","required":true,"transform":{"type":"scalar"},"locs":[{"a":109,"b":116}]},{"name":"line","required":true,"transform":{"type":"scalar"},"locs":[{"a":119,"b":124}]},{"name":"positionId","required":true,"transform":{"type":"scalar"},"locs":[{"a":127,"b":138}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":141,"b":150}]}],"statement":"INSERT INTO materials.loan_lines (workspace_id, loan_id, line, position_id, quantity)\nVALUES (:workspaceId!, :loanId!, :line!, :positionId!, :quantity!::numeric)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO materials.loan_lines (workspace_id, loan_id, line, position_id, quantity)
 * VALUES (:workspaceId!, :loanId!, :line!, :positionId!, :quantity!::numeric)
 * ```
 */
export const insertLoanLine = new PreparedQuery<IInsertLoanLineParams,IInsertLoanLineResult>(insertLoanLineIR);


/** 'LoanableClasses' parameters type */
export interface ILoanableClassesParams {
  positionIds: stringArray;
  workspaceId: string;
}

/** 'LoanableClasses' return type */
export interface ILoanableClassesResult {
  class: string;
  id: string;
}

/** 'LoanableClasses' query type */
export interface ILoanableClassesQuery {
  params: ILoanableClassesParams;
  result: ILoanableClassesResult;
}

const loanableClassesIR: any = {"usedParamSet":{"workspaceId":true,"positionIds":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":257,"b":269}]},{"name":"positionIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":287,"b":299}]}],"statement":"-- La clase de cada posición pedida: solo un reutilizable por cantidad se presta (ADR 0025).\nSELECT p.id, m.class\nFROM inventory.positions AS p\nJOIN materials.products AS m ON m.workspace_id = p.workspace_id AND m.item_id = p.item_id\nWHERE p.workspace_id = :workspaceId! AND p.id = ANY (:positionIds!::uuid[])"};

/**
 * Query generated from SQL:
 * ```
 * -- La clase de cada posición pedida: solo un reutilizable por cantidad se presta (ADR 0025).
 * SELECT p.id, m.class
 * FROM inventory.positions AS p
 * JOIN materials.products AS m ON m.workspace_id = p.workspace_id AND m.item_id = p.item_id
 * WHERE p.workspace_id = :workspaceId! AND p.id = ANY (:positionIds!::uuid[])
 * ```
 */
export const loanableClasses = new PreparedQuery<ILoanableClassesParams,ILoanableClassesResult>(loanableClassesIR);


/** 'LockLoan' parameters type */
export interface ILockLoanParams {
  loanId: string;
  workspaceId: string;
}

/** 'LockLoan' return type */
export interface ILockLoanResult {
  id: string;
  number: number;
  status: string;
  version: number;
}

/** 'LockLoan' query type */
export interface ILockLoanQuery {
  params: ILockLoanParams;
  result: ILockLoanResult;
}

const lockLoanIR: any = {"usedParamSet":{"workspaceId":true,"loanId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":183,"b":195}]},{"name":"loanId","required":true,"transform":{"type":"scalar"},"locs":[{"a":206,"b":213}]}],"statement":"-- El vale bloqueado: primero en el orden de bloqueo del dominio (vale → posiciones), antes de cambiarlo.\nSELECT id, number, status, version\nFROM materials.loans\nWHERE workspace_id = :workspaceId! AND id = :loanId!\nFOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * -- El vale bloqueado: primero en el orden de bloqueo del dominio (vale → posiciones), antes de cambiarlo.
 * SELECT id, number, status, version
 * FROM materials.loans
 * WHERE workspace_id = :workspaceId! AND id = :loanId!
 * FOR UPDATE
 * ```
 */
export const lockLoan = new PreparedQuery<ILockLoanParams,ILockLoanResult>(lockLoanIR);


/** 'LoanLinesOf' parameters type */
export interface ILoanLinesOfParams {
  loanId: string;
  workspaceId: string;
}

/** 'LoanLinesOf' return type */
export interface ILoanLinesOfResult {
  id: string;
  line: number;
  outstanding: string;
  position_id: string;
  quantity: string;
}

/** 'LoanLinesOf' query type */
export interface ILoanLinesOfQuery {
  params: ILoanLinesOfParams;
  result: ILoanLinesOfResult;
}

const loanLinesOfIR: any = {"usedParamSet":{"workspaceId":true,"loanId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":295,"b":307}]},{"name":"loanId","required":true,"transform":{"type":"scalar"},"locs":[{"a":326,"b":333}]}],"statement":"-- Las líneas de un vale con lo que falta devolver, calculado en numeric.\nSELECT ln.id, ln.line, ln.position_id, trim_scale(ln.quantity) AS \"quantity!\",\n       trim_scale(ln.quantity - ln.returned - ln.damaged - ln.lost) AS \"outstanding!\"\nFROM materials.loan_lines AS ln\nWHERE ln.workspace_id = :workspaceId! AND ln.loan_id = :loanId!\nORDER BY ln.line"};

/**
 * Query generated from SQL:
 * ```
 * -- Las líneas de un vale con lo que falta devolver, calculado en numeric.
 * SELECT ln.id, ln.line, ln.position_id, trim_scale(ln.quantity) AS "quantity!",
 *        trim_scale(ln.quantity - ln.returned - ln.damaged - ln.lost) AS "outstanding!"
 * FROM materials.loan_lines AS ln
 * WHERE ln.workspace_id = :workspaceId! AND ln.loan_id = :loanId!
 * ORDER BY ln.line
 * ```
 */
export const loanLinesOf = new PreparedQuery<ILoanLinesOfParams,ILoanLinesOfResult>(loanLinesOfIR);


/** 'ApplyLineReturn' parameters type */
export interface IApplyLineReturnParams {
  damaged: string;
  good: string;
  lineId: string;
  lost: string;
  workspaceId: string;
}

/** 'ApplyLineReturn' return type */
export interface IApplyLineReturnResult {
  id: string;
}

/** 'ApplyLineReturn' query type */
export interface IApplyLineReturnQuery {
  params: IApplyLineReturnParams;
  result: IApplyLineReturnResult;
}

const applyLineReturnIR: any = {"usedParamSet":{"good":true,"damaged":true,"lost":true,"workspaceId":true,"lineId":true},"params":[{"name":"good","required":true,"transform":{"type":"scalar"},"locs":[{"a":145,"b":150}]},{"name":"damaged","required":true,"transform":{"type":"scalar"},"locs":[{"a":182,"b":190}]},{"name":"lost","required":true,"transform":{"type":"scalar"},"locs":[{"a":216,"b":221}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":253,"b":265}]},{"name":"lineId","required":true,"transform":{"type":"scalar"},"locs":[{"a":276,"b":283}]}],"statement":"-- Suma lo devuelto, dañado y perdido; la base rechaza que lo resuelto supere lo prestado.\nUPDATE materials.loan_lines\nSET returned = returned + :good!::numeric, damaged = damaged + :damaged!::numeric, lost = lost + :lost!::numeric\nWHERE workspace_id = :workspaceId! AND id = :lineId!\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- Suma lo devuelto, dañado y perdido; la base rechaza que lo resuelto supere lo prestado.
 * UPDATE materials.loan_lines
 * SET returned = returned + :good!::numeric, damaged = damaged + :damaged!::numeric, lost = lost + :lost!::numeric
 * WHERE workspace_id = :workspaceId! AND id = :lineId!
 * RETURNING id
 * ```
 */
export const applyLineReturn = new PreparedQuery<IApplyLineReturnParams,IApplyLineReturnResult>(applyLineReturnIR);


/** 'InsertReturnLine' parameters type */
export interface IInsertReturnLineParams {
  lineId: string;
  note?: string | null | void;
  operationId?: string | null | void;
  outcome: string;
  principalId: string;
  quantity: string;
  workspaceId: string;
}

/** 'InsertReturnLine' return type */
export type IInsertReturnLineResult = void;

/** 'InsertReturnLine' query type */
export interface IInsertReturnLineQuery {
  params: IInsertReturnLineParams;
  result: IInsertReturnLineResult;
}

const insertReturnLineIR: any = {"usedParamSet":{"workspaceId":true,"lineId":true,"outcome":true,"quantity":true,"note":true,"principalId":true,"operationId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":139,"b":151}]},{"name":"lineId","required":true,"transform":{"type":"scalar"},"locs":[{"a":154,"b":161}]},{"name":"outcome","required":true,"transform":{"type":"scalar"},"locs":[{"a":164,"b":172}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":175,"b":184}]},{"name":"note","required":false,"transform":{"type":"scalar"},"locs":[{"a":196,"b":200}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":203,"b":215}]},{"name":"operationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":218,"b":229}]}],"statement":"INSERT INTO materials.return_lines\n  (workspace_id, loan_line_id, outcome, quantity, note, returned_by_principal_id, operation_id)\nVALUES (:workspaceId!, :lineId!, :outcome!, :quantity!::numeric, :note, :principalId!, :operationId)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO materials.return_lines
 *   (workspace_id, loan_line_id, outcome, quantity, note, returned_by_principal_id, operation_id)
 * VALUES (:workspaceId!, :lineId!, :outcome!, :quantity!::numeric, :note, :principalId!, :operationId)
 * ```
 */
export const insertReturnLine = new PreparedQuery<IInsertReturnLineParams,IInsertReturnLineResult>(insertReturnLineIR);


/** 'AdvanceLoan' parameters type */
export interface IAdvanceLoanParams {
  loanId: string;
  workspaceId: string;
}

/** 'AdvanceLoan' return type */
export interface IAdvanceLoanResult {
  status: string;
}

/** 'AdvanceLoan' query type */
export interface IAdvanceLoanQuery {
  params: IAdvanceLoanParams;
  result: IAdvanceLoanResult;
}

const advanceLoanIR: any = {"usedParamSet":{"workspaceId":true,"loanId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":392,"b":404},{"a":540,"b":552}]},{"name":"loanId","required":true,"transform":{"type":"scalar"},"locs":[{"a":423,"b":430},{"a":565,"b":572}]}],"statement":"-- Sube la versión y cierra el vale cuando ya no falta nada por devolver en ninguna línea.\nUPDATE materials.loans AS l\nSET version = l.version + 1,\n    status = CASE WHEN done.finished THEN 'closed' ELSE l.status END,\n    closed_at = CASE WHEN done.finished THEN now() ELSE l.closed_at END\nFROM (\n  SELECT NOT EXISTS (\n    SELECT 1 FROM materials.loan_lines AS ln\n    WHERE ln.workspace_id = :workspaceId! AND ln.loan_id = :loanId!\n      AND ln.returned + ln.damaged + ln.lost < ln.quantity\n  ) AS finished\n) AS done\nWHERE l.workspace_id = :workspaceId! AND l.id = :loanId!\nRETURNING l.status"};

/**
 * Query generated from SQL:
 * ```
 * -- Sube la versión y cierra el vale cuando ya no falta nada por devolver en ninguna línea.
 * UPDATE materials.loans AS l
 * SET version = l.version + 1,
 *     status = CASE WHEN done.finished THEN 'closed' ELSE l.status END,
 *     closed_at = CASE WHEN done.finished THEN now() ELSE l.closed_at END
 * FROM (
 *   SELECT NOT EXISTS (
 *     SELECT 1 FROM materials.loan_lines AS ln
 *     WHERE ln.workspace_id = :workspaceId! AND ln.loan_id = :loanId!
 *       AND ln.returned + ln.damaged + ln.lost < ln.quantity
 *   ) AS finished
 * ) AS done
 * WHERE l.workspace_id = :workspaceId! AND l.id = :loanId!
 * RETURNING l.status
 * ```
 */
export const advanceLoan = new PreparedQuery<IAdvanceLoanParams,IAdvanceLoanResult>(advanceLoanIR);


/** 'ListLoans' parameters type */
export interface IListLoansParams {
  beforeNumber?: number | null | void;
  borrowerId?: string | null | void;
  filter?: string | null | void;
  limit: NumberOrString;
  loanId?: string | null | void;
  q?: string | null | void;
  timeZone: string;
  workspaceId: string;
}

/** 'ListLoans' return type */
export interface IListLoansResult {
  borrower_id: string;
  borrower_name: string;
  borrower_roles: stringArray;
  closed_at: Date | null;
  due_on: string | null;
  has_debt: boolean;
  id: string;
  lent_at: Date;
  lent_by_id: string;
  lent_by_name: string;
  line_count: number;
  notes: string | null;
  number: number;
  outstanding_lines: number;
  overdue: boolean;
  pieces_lent: string;
  pieces_outstanding: string;
  status: string;
  version: number;
}

/** 'ListLoans' query type */
export interface IListLoansQuery {
  params: IListLoansParams;
  result: IListLoansResult;
}

const listLoansIR: any = {"usedParamSet":{"q":true,"timeZone":true,"workspaceId":true,"loanId":true,"borrowerId":true,"filter":true,"beforeNumber":true,"limit":true},"params":[{"name":"q","required":false,"transform":{"type":"scalar"},"locs":[{"a":592,"b":593},{"a":3628,"b":3629}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":1499,"b":1508},{"a":3522,"b":3531}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":3132,"b":3144}]},{"name":"loanId","required":false,"transform":{"type":"scalar"},"locs":[{"a":3153,"b":3159},{"a":3185,"b":3191}]},{"name":"borrowerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":3207,"b":3217},{"a":3262,"b":3272}]},{"name":"filter","required":false,"transform":{"type":"scalar"},"locs":[{"a":3288,"b":3294},{"a":3321,"b":3327},{"a":3378,"b":3384},{"a":3439,"b":3445}]},{"name":"beforeNumber","required":false,"transform":{"type":"scalar"},"locs":[{"a":4243,"b":4255},{"a":4284,"b":4296}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":4333,"b":4339}]}],"statement":"-- Vales de más nuevo a más viejo, paginados por número. «Atrasado» es abierto con la fecha prevista vencida en\n-- la fecha civil del espacio. Con :loanId, solo ese vale. Con :q, los vales cuyo número, prestatario o algún material\n-- (nombre o código) lo contienen, plegados con inventory.fold_text y con `\\`, `%` y `_` escapados como en el catálogo.\n-- Los roles del prestatario solo se muestran (ADR 0011): no autorizan nada. Las piezas suman en la unidad del\n-- reutilizable, que siempre es la pieza (ADR 0025).\nWITH search AS (\n  SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),\n           chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern\n)\nSELECT\n  l.id,\n  l.number,\n  l.borrower_principal_id AS borrower_id,\n  borrower.display_name AS borrower_name,\n  coalesce((SELECT array_agg(DISTINCT r.name ORDER BY r.name)\n              FROM core.effective_role_assignments AS ra\n              JOIN core.roles AS r ON r.code = ra.role_code\n             WHERE ra.workspace_id = l.workspace_id AND ra.principal_id = l.borrower_principal_id\n               AND ra.revoked_at IS NULL AND ra.valid_from <= now()\n               AND (ra.valid_until IS NULL OR ra.valid_until > now())), '{}') AS \"borrower_roles!\",\n  l.lent_by_principal_id AS lent_by_id,\n  lender.display_name AS lent_by_name,\n  l.lent_at,\n  l.due_on,\n  l.status,\n  l.notes,\n  l.version,\n  l.closed_at,\n  (l.status = 'open' AND l.due_on IS NOT NULL AND l.due_on < (now() AT TIME ZONE :timeZone!)::date) AS \"overdue!\",\n  EXISTS (SELECT 1 FROM materials.loan_lines AS ln\n           WHERE ln.workspace_id = l.workspace_id AND ln.loan_id = l.id AND ln.damaged + ln.lost > 0) AS \"has_debt!\",\n  (SELECT count(*) FROM materials.loan_lines AS ln\n    WHERE ln.workspace_id = l.workspace_id AND ln.loan_id = l.id)::int AS \"line_count!\",\n  (SELECT count(*) FROM materials.loan_lines AS ln\n    WHERE ln.workspace_id = l.workspace_id AND ln.loan_id = l.id\n      AND ln.returned + ln.damaged + ln.lost < ln.quantity)::int AS \"outstanding_lines!\",\n  pieces.lent AS \"pieces_lent!\",\n  pieces.outstanding AS \"pieces_outstanding!\"\nFROM materials.loans AS l\nCROSS JOIN search\nCROSS JOIN LATERAL (\n  SELECT trim_scale(coalesce(sum(ln.quantity), 0)) AS lent,\n         trim_scale(coalesce(sum(ln.quantity - ln.returned - ln.damaged - ln.lost), 0)) AS outstanding\n  FROM materials.loan_lines AS ln\n  WHERE ln.workspace_id = l.workspace_id AND ln.loan_id = l.id\n) AS pieces\nJOIN LATERAL (\n  SELECT ident.display_name\n  FROM core.principals AS pr\n  JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\n  JOIN core.identities AS ident ON ident.id = m.identity_id\n  WHERE pr.workspace_id = l.workspace_id AND pr.id = l.borrower_principal_id\n) AS borrower ON true\nJOIN LATERAL (\n  SELECT ident.display_name\n  FROM core.principals AS pr\n  JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\n  JOIN core.identities AS ident ON ident.id = m.identity_id\n  WHERE pr.workspace_id = l.workspace_id AND pr.id = l.lent_by_principal_id\n) AS lender ON true\nWHERE l.workspace_id = :workspaceId!\n  AND (:loanId::uuid IS NULL OR l.id = :loanId::uuid)\n  AND (:borrowerId::uuid IS NULL OR l.borrower_principal_id = :borrowerId::uuid)\n  AND (:filter::text IS NULL\n       OR (:filter::text = 'open' AND l.status = 'open')\n       OR (:filter::text = 'closed' AND l.status = 'closed')\n       OR (:filter::text = 'overdue' AND l.status = 'open' AND l.due_on < (now() AT TIME ZONE :timeZone!)::date))\n  AND (search.pattern IS NULL\n       OR l.number::text = nullif(ltrim(substring(lower(:q::text) FROM '^(?:p-?)?([0-9]+)$'), '0'), '')\n       OR inventory.fold_text(borrower.display_name) LIKE search.pattern\n       OR EXISTS (SELECT 1\n                    FROM materials.loan_lines AS ln\n                    JOIN inventory.positions AS p ON p.workspace_id = ln.workspace_id AND p.id = ln.position_id\n                    JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\n                   WHERE ln.workspace_id = l.workspace_id AND ln.loan_id = l.id\n                     AND (inventory.fold_text(i.name) LIKE search.pattern OR lower(i.code) LIKE search.pattern)))\n  AND (:beforeNumber::int IS NULL OR l.number < :beforeNumber::int)\nORDER BY l.number DESC\nLIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * -- Vales de más nuevo a más viejo, paginados por número. «Atrasado» es abierto con la fecha prevista vencida en
 * -- la fecha civil del espacio. Con :loanId, solo ese vale. Con :q, los vales cuyo número, prestatario o algún material
 * -- (nombre o código) lo contienen, plegados con inventory.fold_text y con `\`, `%` y `_` escapados como en el catálogo.
 * -- Los roles del prestatario solo se muestran (ADR 0011): no autorizan nada. Las piezas suman en la unidad del
 * -- reutilizable, que siempre es la pieza (ADR 0025).
 * WITH search AS (
 *   SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),
 *            chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern
 * )
 * SELECT
 *   l.id,
 *   l.number,
 *   l.borrower_principal_id AS borrower_id,
 *   borrower.display_name AS borrower_name,
 *   coalesce((SELECT array_agg(DISTINCT r.name ORDER BY r.name)
 *               FROM core.effective_role_assignments AS ra
 *               JOIN core.roles AS r ON r.code = ra.role_code
 *              WHERE ra.workspace_id = l.workspace_id AND ra.principal_id = l.borrower_principal_id
 *                AND ra.revoked_at IS NULL AND ra.valid_from <= now()
 *                AND (ra.valid_until IS NULL OR ra.valid_until > now())), '{}') AS "borrower_roles!",
 *   l.lent_by_principal_id AS lent_by_id,
 *   lender.display_name AS lent_by_name,
 *   l.lent_at,
 *   l.due_on,
 *   l.status,
 *   l.notes,
 *   l.version,
 *   l.closed_at,
 *   (l.status = 'open' AND l.due_on IS NOT NULL AND l.due_on < (now() AT TIME ZONE :timeZone!)::date) AS "overdue!",
 *   EXISTS (SELECT 1 FROM materials.loan_lines AS ln
 *            WHERE ln.workspace_id = l.workspace_id AND ln.loan_id = l.id AND ln.damaged + ln.lost > 0) AS "has_debt!",
 *   (SELECT count(*) FROM materials.loan_lines AS ln
 *     WHERE ln.workspace_id = l.workspace_id AND ln.loan_id = l.id)::int AS "line_count!",
 *   (SELECT count(*) FROM materials.loan_lines AS ln
 *     WHERE ln.workspace_id = l.workspace_id AND ln.loan_id = l.id
 *       AND ln.returned + ln.damaged + ln.lost < ln.quantity)::int AS "outstanding_lines!",
 *   pieces.lent AS "pieces_lent!",
 *   pieces.outstanding AS "pieces_outstanding!"
 * FROM materials.loans AS l
 * CROSS JOIN search
 * CROSS JOIN LATERAL (
 *   SELECT trim_scale(coalesce(sum(ln.quantity), 0)) AS lent,
 *          trim_scale(coalesce(sum(ln.quantity - ln.returned - ln.damaged - ln.lost), 0)) AS outstanding
 *   FROM materials.loan_lines AS ln
 *   WHERE ln.workspace_id = l.workspace_id AND ln.loan_id = l.id
 * ) AS pieces
 * JOIN LATERAL (
 *   SELECT ident.display_name
 *   FROM core.principals AS pr
 *   JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 *   JOIN core.identities AS ident ON ident.id = m.identity_id
 *   WHERE pr.workspace_id = l.workspace_id AND pr.id = l.borrower_principal_id
 * ) AS borrower ON true
 * JOIN LATERAL (
 *   SELECT ident.display_name
 *   FROM core.principals AS pr
 *   JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 *   JOIN core.identities AS ident ON ident.id = m.identity_id
 *   WHERE pr.workspace_id = l.workspace_id AND pr.id = l.lent_by_principal_id
 * ) AS lender ON true
 * WHERE l.workspace_id = :workspaceId!
 *   AND (:loanId::uuid IS NULL OR l.id = :loanId::uuid)
 *   AND (:borrowerId::uuid IS NULL OR l.borrower_principal_id = :borrowerId::uuid)
 *   AND (:filter::text IS NULL
 *        OR (:filter::text = 'open' AND l.status = 'open')
 *        OR (:filter::text = 'closed' AND l.status = 'closed')
 *        OR (:filter::text = 'overdue' AND l.status = 'open' AND l.due_on < (now() AT TIME ZONE :timeZone!)::date))
 *   AND (search.pattern IS NULL
 *        OR l.number::text = nullif(ltrim(substring(lower(:q::text) FROM '^(?:p-?)?([0-9]+)$'), '0'), '')
 *        OR inventory.fold_text(borrower.display_name) LIKE search.pattern
 *        OR EXISTS (SELECT 1
 *                     FROM materials.loan_lines AS ln
 *                     JOIN inventory.positions AS p ON p.workspace_id = ln.workspace_id AND p.id = ln.position_id
 *                     JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 *                    WHERE ln.workspace_id = l.workspace_id AND ln.loan_id = l.id
 *                      AND (inventory.fold_text(i.name) LIKE search.pattern OR lower(i.code) LIKE search.pattern)))
 *   AND (:beforeNumber::int IS NULL OR l.number < :beforeNumber::int)
 * ORDER BY l.number DESC
 * LIMIT :limit!
 * ```
 */
export const listLoans = new PreparedQuery<IListLoansParams,IListLoansResult>(listLoansIR);


/** 'ListLoanLines' parameters type */
export interface IListLoanLinesParams {
  loanId: string;
  workspaceId: string;
}

/** 'ListLoanLines' return type */
export interface IListLoanLinesResult {
  damaged: string;
  line: number;
  lost: string;
  outstanding: string;
  position_id: string;
  product_code: string;
  product_id: string;
  product_name: string;
  quantity: string;
  returned: string;
  unit: string;
}

/** 'ListLoanLines' query type */
export interface IListLoanLinesQuery {
  params: IListLoanLinesParams;
  result: IListLoanLinesResult;
}

const listLoanLinesIR: any = {"usedParamSet":{"workspaceId":true,"loanId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":601,"b":613}]},{"name":"loanId","required":true,"transform":{"type":"scalar"},"locs":[{"a":632,"b":639}]}],"statement":"SELECT ln.line, ln.position_id, i.id AS product_id, i.code AS product_code, i.name AS product_name, i.base_unit AS unit,\n       trim_scale(ln.quantity) AS \"quantity!\", trim_scale(ln.returned) AS \"returned!\",\n       trim_scale(ln.damaged) AS \"damaged!\", trim_scale(ln.lost) AS \"lost!\",\n       trim_scale(ln.quantity - ln.returned - ln.damaged - ln.lost) AS \"outstanding!\"\nFROM materials.loan_lines AS ln\nJOIN inventory.positions AS p ON p.workspace_id = ln.workspace_id AND p.id = ln.position_id\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nWHERE ln.workspace_id = :workspaceId! AND ln.loan_id = :loanId!\nORDER BY ln.line"};

/**
 * Query generated from SQL:
 * ```
 * SELECT ln.line, ln.position_id, i.id AS product_id, i.code AS product_code, i.name AS product_name, i.base_unit AS unit,
 *        trim_scale(ln.quantity) AS "quantity!", trim_scale(ln.returned) AS "returned!",
 *        trim_scale(ln.damaged) AS "damaged!", trim_scale(ln.lost) AS "lost!",
 *        trim_scale(ln.quantity - ln.returned - ln.damaged - ln.lost) AS "outstanding!"
 * FROM materials.loan_lines AS ln
 * JOIN inventory.positions AS p ON p.workspace_id = ln.workspace_id AND p.id = ln.position_id
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 * WHERE ln.workspace_id = :workspaceId! AND ln.loan_id = :loanId!
 * ORDER BY ln.line
 * ```
 */
export const listLoanLines = new PreparedQuery<IListLoanLinesParams,IListLoanLinesResult>(listLoanLinesIR);


