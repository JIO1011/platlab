import { describe, expect, it } from 'vitest';
import { defineModule, moduleRegistry } from './index.js';

const base = {
  code: 'demo',
  name: 'Demo',
  requires: ['core'],
  integrates: [],
  permissions: ['demo.read'],
  roleGrants: { admin: ['demo.read'] },
  nav: [{ path: 'demo', label: 'Demo', permission: 'demo.read' }],
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

  it('el registro solo contiene módulos válidos y con códigos únicos', () => {
    const codes = moduleRegistry.map((module) => module.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
