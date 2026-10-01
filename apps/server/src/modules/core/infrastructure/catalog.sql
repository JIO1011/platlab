/* Catálogo global fijo (03 §1.1); se compara con los manifiestos en catalog.int.test.ts. */

/* @name listRoles */
SELECT code FROM core.roles ORDER BY code;

/* @name listPermissions */
SELECT code, module_code FROM core.permissions ORDER BY code;

/* @name listRolePermissions */
SELECT role_code, permission_code FROM core.role_permissions ORDER BY role_code, permission_code;
