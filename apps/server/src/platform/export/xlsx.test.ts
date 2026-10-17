import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { readZipEntry } from '../../testing/zip.js';
import { writeXlsx } from './xlsx.js';

/** Escribe un libro en memoria y devuelve sus bytes. */
async function build(write: (sheet: ReturnType<typeof writeXlsx>) => Promise<void>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const out = new Writable({
    write(chunk: Buffer, _encoding, done) {
      chunks.push(chunk);
      done();
    },
  });
  const sheet = writeXlsx(out, { sheetName: 'Equipos: [todos]', widths: [12, 30] });
  await write(sheet);
  await sheet.end();
  return Buffer.concat(chunks);
}

describe('writeXlsx', () => {
  it('arma un libro con sus partes, el nombre de hoja válido y los anchos', async () => {
    const bytes = await build(async (sheet) => sheet.row(['Hola']));
    expect(readZipEntry(bytes, '[Content_Types].xml')).toContain('/xl/worksheets/sheet1.xml');
    expect(readZipEntry(bytes, 'xl/workbook.xml')).toContain('name="Equipos   todos"');
    expect(readZipEntry(bytes, 'xl/styles.xml')).toContain('numFmtId="14"');
    expect(readZipEntry(bytes, 'xl/worksheets/sheet1.xml')).toContain('<col min="2" max="2" width="30" customWidth="1"/>');
  });

  it('escribe texto escapado, números exactos, fechas de Excel y celdas vacías', async () => {
    const bytes = await build(async (sheet) => {
      await sheet.row(['Código', 'Valor'], { bold: true });
      await sheet.row(['A&B <x> "y"\u0007', { number: '7200.50' }, { date: '2026-10-16' }, null, { number: '1e5' }]);
    });
    const xml = readZipEntry(bytes, 'xl/worksheets/sheet1.xml');
    expect(xml).toContain('<c r="A1" t="inlineStr" s="1"><is><t xml:space="preserve">Código</t></is></c>');
    expect(xml).toContain('<t xml:space="preserve">A&amp;B &lt;x&gt; &quot;y&quot;</t>');
    expect(xml).toContain('<c r="B2"><v>7200.50</v></c>');
    // 16-10-2026 es el día 46311 de Excel.
    expect(xml).toContain('<c r="C2" s="2"><v>46311</v></c>');
    expect(xml).not.toContain('r="D2"');
    // Lo que no es un decimal simple queda como texto, nunca como número aproximado.
    expect(xml).toContain('<c r="E2" t="inlineStr"><is><t xml:space="preserve">1e5</t></is></c>');
    expect(xml.endsWith('</sheetData></worksheet>')).toBe(true);
  });

  it('pasa de la columna Z a la AA', async () => {
    const bytes = await build(async (sheet) => sheet.row(Array.from({ length: 27 }, (_, index) => `c${index}`)));
    expect(readZipEntry(bytes, 'xl/worksheets/sheet1.xml')).toContain('<c r="AA1" t="inlineStr">');
  });

  it('una hoja sin filas sigue siendo un libro válido', async () => {
    const bytes = await build(async () => undefined);
    expect(readZipEntry(bytes, 'xl/worksheets/sheet1.xml')).toContain('<sheetData></sheetData></worksheet>');
  });

  it('si el destino falla, la escritura rechaza en vez de quedarse esperando', async () => {
    const out = new Writable({
      write(_chunk, _encoding, done) {
        done(new Error('conexión cortada'));
      },
    });
    const sheet = writeXlsx(out, { sheetName: 'Equipos' });
    await expect(
      (async () => {
        for (let index = 0; index < 10_000; index += 1) await sheet.row([`fila ${index} ${'x'.repeat(200)}`]);
        await sheet.end();
      })(),
    ).rejects.toThrow();
  });
});
