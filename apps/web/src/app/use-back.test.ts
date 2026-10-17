import { describe, expect, it } from 'vitest';
import { backTarget } from './use-back';

describe('backTarget', () => {
  it('sube al nivel padre en la primera entrada de la app (se llegó por un enlace o un QR)', () => {
    expect(backTarget(0, '/equipos/inventario')).toBe('/equipos/inventario');
  });

  it('da un paso atrás cuando ya se navegó dentro de la app', () => {
    expect(backTarget(3, '/equipos/inventario')).toBe(-1);
  });
});
