import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defineModule, moduleRegistry } from './index.js';

const base = {
  code: 'demo',
  name: 'Demo',
  requires: ['core'],
  integrates: [],
  permissions: ['demo.read'],
  roleGrants: { admin: ['demo.read'] },
  nav: [{ path: 'demo', label: 'Demo', permission: 'demo.read', sections: [{ path: '', label: 'Resumen', permission: 'demo.read' }] }],
  stage: 'development',
} as const;

describe('defineModule', () => {
  it('acepta un manifiesto coherente', () => {
    expect(defineModule(base).code).toBe('demo');
  });

  it('rechaza permisos sin el prefijo del módulo', () => {
    expect(() => defineModule({ ...base, permissions: ['inventory.issue.create'] })).toThrow(
      /sin prefijo/,
    );
  });

  it('rechaza permisos usados que no están declarados', () => {
    expect(() => defineModule({ ...base, roleGrants: { admin: ['demo.write'] } })).toThrow(
      /no declarado/,
    );
  });

  it('rechaza una sección con un permiso no declarado', () => {
    const nav = [{ ...base.nav[0], sections: [{ path: 'informes', label: 'Informes', permission: 'demo.report' }] }];
    expect(() => defineModule({ ...base, nav })).toThrow(/no declarado: demo.report/);
  });

    it('el registro solo contiene módulos válidos y con códigos únicos', () => {
    const codes = moduleRegistry.map((module) => module.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('temas de módulo', () => {
  // ADR 0010 (color por módulo): sin su bloque de tokens, un módulo caería en el azul de la
  // plataforma, que significa «fuera de un módulo». Se lee el CSS como texto, sin importar ui.
  const styles = readFileSync(new URL('../../ui/src/styles.css', import.meta.url), 'utf8');

  it.each(moduleRegistry.map((module) => module.code))('«%s» tiene su acento en packages/ui', (code) => {
    const block = styles.match(new RegExp(`\\[data-module='${code}'\\]\\s*\\{([^}]*)\\}`))?.[1] ?? '';
    for (const token of ['--color-action:', '--color-action-hover:', '--color-action-pressed:', '--color-action-soft:']) {
      expect(block).toContain(token);
    }
  });
});
