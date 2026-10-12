import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('conserva los tamaños propios junto a un color de texto', () => {
    expect(cn('text-metric-sm', 'text-ink')).toBe('text-metric-sm text-ink');
    expect(cn('text-display text-ink-muted')).toBe('text-display text-ink-muted');
  });

  it('sigue resolviendo los conflictos reales', () => {
    expect(cn('text-metric', 'text-metric-sm')).toBe('text-metric-sm');
    expect(cn('text-ink', 'text-action')).toBe('text-action');
  });
});
