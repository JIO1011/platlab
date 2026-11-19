/* Préstamos de material (ADR 0025, 03 §5): vales, líneas y su historial de devoluciones. */

/* @name nextLoanNumber */
-- El siguiente número del espacio; se pide con el bloqueo del espacio tomado, así dos vales no repiten número.
SELECT coalesce(max(number), 0) + 1 AS "number!"
FROM materials.loans
WHERE workspace_id = :workspaceId!;

/* @name insertLoan */
INSERT INTO materials.loans (workspace_id, number, borrower_principal_id, lent_by_principal_id, due_on, notes)
VALUES (:workspaceId!, :number!, :borrowerId!, :principalId!, :dueOn::date, :notes)
RETURNING id;

/* @name insertLoanLine */
INSERT INTO materials.loan_lines (workspace_id, loan_id, line, position_id, quantity)
VALUES (:workspaceId!, :loanId!, :line!, :positionId!, :quantity!::numeric);

/* @name loanableClasses */
-- La clase de cada posición pedida: solo un reutilizable por cantidad se presta (ADR 0025).
SELECT p.id, m.class
FROM inventory.positions AS p
JOIN materials.products AS m ON m.workspace_id = p.workspace_id AND m.item_id = p.item_id
WHERE p.workspace_id = :workspaceId! AND p.id = ANY (:positionIds!::uuid[]);

/* @name lockLoan */
-- El vale bloqueado: primero en el orden de bloqueo del dominio (vale → posiciones), antes de cambiarlo.
SELECT id, number, status, version
FROM materials.loans
WHERE workspace_id = :workspaceId! AND id = :loanId!
FOR UPDATE;

/* @name loanLinesOf */
-- Las líneas de un vale con lo que falta devolver, calculado en numeric.
SELECT ln.id, ln.line, ln.position_id, trim_scale(ln.quantity) AS "quantity!",
       trim_scale(ln.quantity - ln.returned - ln.damaged - ln.lost) AS "outstanding!"
FROM materials.loan_lines AS ln
WHERE ln.workspace_id = :workspaceId! AND ln.loan_id = :loanId!
ORDER BY ln.line;

/* @name applyLineReturn */
-- Suma lo devuelto, dañado y perdido; la base rechaza que lo resuelto supere lo prestado.
UPDATE materials.loan_lines
SET returned = returned + :good!::numeric, damaged = damaged + :damaged!::numeric, lost = lost + :lost!::numeric
WHERE workspace_id = :workspaceId! AND id = :lineId!
RETURNING id;

/* @name insertReturnLine */
INSERT INTO materials.return_lines
  (workspace_id, loan_line_id, outcome, quantity, note, returned_by_principal_id, operation_id)
VALUES (:workspaceId!, :lineId!, :outcome!, :quantity!::numeric, :note, :principalId!, :operationId);

/* @name advanceLoan */
-- Sube la versión y cierra el vale cuando ya no falta nada por devolver en ninguna línea.
UPDATE materials.loans AS l
SET version = l.version + 1,
    status = CASE WHEN done.finished THEN 'closed' ELSE l.status END,
    closed_at = CASE WHEN done.finished THEN now() ELSE l.closed_at END
FROM (
  SELECT NOT EXISTS (
    SELECT 1 FROM materials.loan_lines AS ln
    WHERE ln.workspace_id = :workspaceId! AND ln.loan_id = :loanId!
      AND ln.returned + ln.damaged + ln.lost < ln.quantity
  ) AS finished
) AS done
WHERE l.workspace_id = :workspaceId! AND l.id = :loanId!
RETURNING l.status;

/* @name listLoans */
-- Vales de más nuevo a más viejo, paginados por número. «Atrasado» es abierto con la fecha prevista vencida en
-- la fecha civil del espacio. Con :loanId, solo ese vale.
SELECT
  l.id,
  l.number,
  l.borrower_principal_id AS borrower_id,
  borrower.display_name AS borrower_name,
  l.lent_by_principal_id AS lent_by_id,
  lender.display_name AS lent_by_name,
  l.lent_at,
  l.due_on,
  l.status,
  l.notes,
  l.version,
  l.closed_at,
  (l.status = 'open' AND l.due_on IS NOT NULL AND l.due_on < (now() AT TIME ZONE :timeZone!)::date) AS "overdue!",
  EXISTS (SELECT 1 FROM materials.loan_lines AS ln
           WHERE ln.workspace_id = l.workspace_id AND ln.loan_id = l.id AND ln.damaged + ln.lost > 0) AS "has_debt!",
  (SELECT count(*) FROM materials.loan_lines AS ln
    WHERE ln.workspace_id = l.workspace_id AND ln.loan_id = l.id)::int AS "line_count!",
  (SELECT count(*) FROM materials.loan_lines AS ln
    WHERE ln.workspace_id = l.workspace_id AND ln.loan_id = l.id
      AND ln.returned + ln.damaged + ln.lost < ln.quantity)::int AS "outstanding_lines!"
FROM materials.loans AS l
JOIN LATERAL (
  SELECT ident.display_name
  FROM core.principals AS pr
  JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
  JOIN core.identities AS ident ON ident.id = m.identity_id
  WHERE pr.workspace_id = l.workspace_id AND pr.id = l.borrower_principal_id
) AS borrower ON true
JOIN LATERAL (
  SELECT ident.display_name
  FROM core.principals AS pr
  JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
  JOIN core.identities AS ident ON ident.id = m.identity_id
  WHERE pr.workspace_id = l.workspace_id AND pr.id = l.lent_by_principal_id
) AS lender ON true
WHERE l.workspace_id = :workspaceId!
  AND (:loanId::uuid IS NULL OR l.id = :loanId::uuid)
  AND (:borrowerId::uuid IS NULL OR l.borrower_principal_id = :borrowerId::uuid)
  AND (:filter::text IS NULL
       OR (:filter::text = 'open' AND l.status = 'open')
       OR (:filter::text = 'closed' AND l.status = 'closed')
       OR (:filter::text = 'overdue' AND l.status = 'open' AND l.due_on < (now() AT TIME ZONE :timeZone!)::date))
  AND (:beforeNumber::int IS NULL OR l.number < :beforeNumber::int)
ORDER BY l.number DESC
LIMIT :limit!;

/* @name listLoanLines */
SELECT ln.line, ln.position_id, i.id AS product_id, i.code AS product_code, i.name AS product_name, i.base_unit AS unit,
       trim_scale(ln.quantity) AS "quantity!", trim_scale(ln.returned) AS "returned!",
       trim_scale(ln.damaged) AS "damaged!", trim_scale(ln.lost) AS "lost!",
       trim_scale(ln.quantity - ln.returned - ln.damaged - ln.lost) AS "outstanding!"
FROM materials.loan_lines AS ln
JOIN inventory.positions AS p ON p.workspace_id = ln.workspace_id AND p.id = ln.position_id
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
WHERE ln.workspace_id = :workspaceId! AND ln.loan_id = :loanId!
ORDER BY ln.line;
