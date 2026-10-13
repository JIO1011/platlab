/* Códigos automáticos (ADR 0015): quien genera uno serializa por espacio con un bloqueo consultivo. */

/* @name lockCodes */
-- Hasta el final de la transacción. Va en su propia sentencia: la siguiente consulta ya ve lo que
-- confirmó quien tenía el bloqueo.
SELECT pg_advisory_xact_lock(hashtextextended(:key!, 0))::text AS locked;
