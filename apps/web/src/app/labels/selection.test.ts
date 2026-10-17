import { describe, expect, it } from 'vitest';
import { initialSelection, parseIds } from './selection';

describe('parseIds', () => {
  it('lee los ids separados por comas', () => {
    expect(parseIds('a,b')).toEqual(['a', 'b']);
    expect(parseIds('a')).toEqual(['a']);
  });

  it('sin parámetro o vacío, no hay preselección', () => {
    expect(parseIds(null)).toBeNull();
    expect(parseIds('')).toBeNull();
    expect(parseIds(',')).toBeNull();
  });
});

describe('initialSelection', () => {
  const ids = ['a', 'b', 'c'];

  it('sin preselección, elige todas', () => {
    expect(initialSelection(ids, null)).toEqual(new Set(ids));
  });

  it('con preselección, solo las que existen en la hoja', () => {
    expect(initialSelection(ids, ['b', 'x'])).toEqual(new Set(['b']));
  });

  it('una preselección que no coincide con ninguna deja la hoja sin elegidas', () => {
    expect(initialSelection(ids, ['x']).size).toBe(0);
  });
});
