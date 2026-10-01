/** Etapa del módulo (ADR 0009, 02 §6). */
export type ModuleStage = 'development' | 'pilot' | 'general';

/** Roles del catálogo fijo que pueden recibir permisos (ADR 0008). */
export type RoleCode = 'admin' | 'operator' | 'teacher' | 'student' | 'regulatory_officer';

export interface NavEntry {
  path: string;
  label: string;
  permission: string;
}

/** Manifiesto de un módulo: única fuente para contratos, permisos e interfaz (02 §4). */
export interface ModuleManifest {
  code: string;
  name: string;
  requires: readonly string[];
  integrates: readonly string[];
  permissions: readonly string[];
  roleGrants: Partial<Record<RoleCode, readonly string[]>>;
  nav: readonly NavEntry[];
  homeCard?: { permission: string };
  stage: ModuleStage;
}

/**
 * Valida la coherencia interna del manifiesto al registrarlo:
 * todo permiso concedido o usado en la interfaz debe estar declarado,
 * y llevar el prefijo del módulo (rutas y permisos por módulo, 02 §4).
 */
export function defineModule<const M extends ModuleManifest>(manifest: M): M {
  const declared = new Set(manifest.permissions);
  const problems: string[] = [];

  for (const permission of manifest.permissions) {
    if (!permission.startsWith(`${manifest.code}.`)) {
      problems.push(`permiso sin prefijo del módulo: ${permission}`);
    }
  }
  const used = [
    ...Object.values(manifest.roleGrants).flatMap((grants) => grants ?? []),
    ...manifest.nav.map((entry) => entry.permission),
    ...(manifest.homeCard ? [manifest.homeCard.permission] : []),
  ];
  for (const permission of used) {
    if (!declared.has(permission)) {
      problems.push(`permiso usado pero no declarado: ${permission}`);
    }
  }
  if (manifest.requires.includes(manifest.code)) {
    problems.push('un módulo no puede depender de sí mismo');
  }
  if (problems.length > 0) {
    throw new Error(`Manifiesto inválido «${manifest.code}»: ${problems.join('; ')}`);
  }
  return manifest;
}
