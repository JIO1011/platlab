import { describe, expect, it } from 'vitest';
import { assignKeys, fieldKey } from './field-keys';

describe('fieldKey', () => {
  it('quita las tildes, pasa a minúsculas y une las palabras con guion bajo', () => {
    expect(fieldKey('Número de estudiantes')).toBe('numero_de_estudiantes');
    expect(fieldKey('  ¿Requiere Campana?  ')).toBe('requiere_campana');
    expect(fieldKey('Año / Semestre')).toBe('ano_semestre');
  });

  it('empieza siempre por una letra', () => {
    expect(fieldKey('2do parcial')).toBe('campo_2do_parcial');
  });

  it('sin letras ni cifras queda «campo»', () => {
    expect(fieldKey('¿?')).toBe('campo');
  });

  it('no pasa de 40 caracteres ni termina en guion bajo', () => {
    const key = fieldKey('Descripción detallada del procedimiento que se hará en la práctica');
    expect(key.length).toBeLessThanOrEqual(40);
    expect(key.endsWith('_')).toBe(false);
  });
});

describe('assignKeys', () => {
  it('añade un número a las etiquetas que repiten la clave', () => {
    expect(assignKeys([{ label: 'Grupo' }, { label: 'grupo' }, { label: 'GRUPO' }])).toEqual(['grupo', 'grupo_2', 'grupo_3']);
  });

  it('un campo publicado conserva su clave aunque cambie su etiqueta', () => {
    expect(assignKeys([{ label: 'Carrera o programa', key: 'carrera' }, { label: 'Carrera' }])).toEqual(['carrera', 'carrera_2']);
  });

  it('la clave nueva no pisa una publicada que viene después', () => {
    expect(assignKeys([{ label: 'Grupo' }, { label: 'Otro', key: 'grupo' }])).toEqual(['grupo_2', 'grupo']);
  });

  it('el sufijo cabe en 40 caracteres', () => {
    const label = 'a'.repeat(60);
    const keys = assignKeys([{ label }, { label }]);
    expect(keys.every((key) => key.length <= 40)).toBe(true);
    expect(new Set(keys).size).toBe(2);
  });
});
