import { describe, expect, it } from 'vitest';
import { labelPath, readEquipmentLabel, readLabelCode, readLabelLink } from './label-link';

const workspaceId = '3f0c9a52-8d2e-4b7a-9c41-6e5d1a2b3c4d';
const id = '0b1c2d3e-4f50-4617-8899-aabbccddeeff';
const frasco = labelPath('frasco', workspaceId, id);
const equipo = labelPath('equipo', workspaceId, id);
const code = frasco.slice('/q/'.length);

describe('labelPath y readLabelCode', () => {
  it('cifran el espacio y lo etiquetado en 43 caracteres, con el prefijo de su tipo', () => {
    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(equipo).toBe(`/q/e/${code}`);
    expect(readLabelCode(code)).toEqual({ workspaceId, id });
  });

  it('rechazan un código que no es de PlatLab', () => {
    expect(readLabelCode(code.slice(1))).toBeNull();
    expect(readLabelCode(`${code.slice(0, 42)}!`)).toBeNull();
  });
});

describe('readLabelLink', () => {
  it('lee la etiqueta de un frasco y la de un equipo desde el enlace completo', () => {
    expect(readLabelLink(`https://platlab.example${frasco}`)).toEqual({ kind: 'frasco', workspaceId, id, path: frasco });
    expect(readLabelLink(`  http://localhost:5173${equipo}/ \n`)).toEqual({ kind: 'equipo', workspaceId, id, path: equipo });
  });

  it('acepta la ruta sola', () => {
    expect(readLabelLink(frasco)?.path).toBe(frasco);
    expect(readLabelLink(equipo)?.kind).toBe('equipo');
  });

  it('rechaza cualquier otro contenido', () => {
    expect(readLabelLink('')).toBeNull();
    expect(readLabelLink('https://example.com')).toBeNull();
    expect(readLabelLink('7647-14-5')).toBeNull();
    expect(readLabelLink(`https://platlab.example/otra/${code}`)).toBeNull();
    expect(readLabelLink(`https://platlab.example/q/x/${code}`)).toBeNull();
    expect(readLabelLink(`https://platlab.example/q/${code.slice(1)}`)).toBeNull();
    expect(readLabelLink(`https://platlab.example/q/${'a'.repeat(42)}!`)).toBeNull();
  });
});

describe('readEquipmentLabel', () => {
  const read = readEquipmentLabel(workspaceId, 'Equipo leído');

  it('da el id del equipo con el texto de lectura que se pidió', () => {
    expect(read(equipo)).toEqual({ value: id, found: 'Equipo leído' });
    expect(readEquipmentLabel(workspaceId, 'Buscando…')(`https://platlab.example${equipo}`)).toEqual({ value: id, found: 'Buscando…' });
  });

  it('avisa por qué no sirve un código ajeno, un frasco o un equipo de otro espacio', () => {
    expect(read('7647-14-5')).toEqual({ notice: 'Ese código no es una etiqueta de PlatLab.' });
    expect(read(frasco)).toEqual({ notice: 'Es la etiqueta de un frasco: escanea la de un equipo.' });
    expect(readEquipmentLabel('9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d', 'Equipo leído')(equipo)).toEqual({
      notice: 'Ese equipo es de otro espacio de trabajo.',
    });
  });
});
