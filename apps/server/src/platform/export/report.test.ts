import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { readZipEntry } from '../../testing/zip.js';
import { todayIn } from '../dates.js';
import { startReport } from './report.js';

describe('startReport', () => {
  it('abre el archivo con la fecha del espacio, escribe el encabezado común y una fila por elemento', async () => {
    const chunks: Buffer[] = [];
    const names: string[] = [];
    const out = new Writable({
      write(chunk: Buffer, _encoding, done) {
        chunks.push(chunk);
        done();
      },
    });
    const sheet = await startReport<{ code: string; value: string }>(
      (fileName) => {
        names.push(fileName);
        return out;
      },
      {
        fileName: 'informe-prueba',
        sheetName: 'Prueba',
        title: 'Informe de prueba',
        workspace: { name: 'Laboratorio Demo', timeZone: 'America/Guayaquil' },
        author: 'Ana Pérez',
        filters: 'ninguno',
        columns: [
          ['Código', 12, (row) => row.code],
          ['Valor', 10, (row) => ({ number: row.value })],
        ],
      },
    );
    await sheet.add({ code: 'EQ-1', value: '7.50' });
    await sheet.end();

    expect(names).toEqual([`informe-prueba-${todayIn('America/Guayaquil')}.xlsx`]);
    const xml = readZipEntry(Buffer.concat(chunks), 'xl/worksheets/sheet1.xml');
    expect(xml).toContain('<c r="A1" t="inlineStr" s="1"><is><t xml:space="preserve">Informe de prueba</t></is></c>');
    expect(xml).toContain('Espacio: Laboratorio Demo');
    expect(xml).toMatch(/Generado el [^<]+ por Ana Pérez/);
    expect(xml).toContain('Filtros: ninguno');
    expect(xml).toContain('<c r="A6" t="inlineStr" s="1"><is><t xml:space="preserve">Código</t></is></c>');
    expect(xml).toContain('<c r="B7"><v>7.50</v></c>');
    expect(xml).toContain('<col min="1" max="1" width="12" customWidth="1"/>');
  });
});
