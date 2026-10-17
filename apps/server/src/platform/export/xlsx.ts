import { once } from 'node:events';
import { PassThrough, type Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import yazl from 'yazl';

/**
 * Escritor de Excel (.xlsx) por partes (ADR 0017, 0019): la hoja se escribe fila a fila dentro de un
 * zip que sale directo al destino, sin cargar el archivo en memoria ni guardarlo. Si el destino va
 * lento, `row` espera; si se corta, rechaza, y quien exporta revierte su transacción.
 *
 * Una sola hoja con texto en línea (sin tabla de textos compartidos), números exactos y fechas.
 */

export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Texto, número decimal exacto como cadena (`'7200.50'`), fecha `YYYY-MM-DD` o celda vacía. */
export type XlsxCell = string | { number: string } | { date: string } | null;

export interface XlsxSheet {
  /** Agrega una fila; en negrita, para títulos y encabezados de columna. */
  row(cells: XlsxCell[], options?: { bold?: boolean }): Promise<void>;
  /** Cierra la hoja y el archivo; resuelve cuando todo llegó al destino. */
  end(): Promise<void>;
}

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const PKG_RELS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const DOC_RELS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const OFFICE = 'application/vnd.openxmlformats-officedocument';

// Estilos: 0 normal, 1 negrita, 2 fecha corta del idioma de quien abre el archivo (formato 14).
const BOLD = 1;
const DATE = 2;
const STYLES =
  `${XML}<styleSheet xmlns="${MAIN}">` +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

const DECIMAL = /^-?\d{1,15}(\.\d{1,15})?$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
// Caracteres que XML 1.0 no admite: se quitan. Buscarlos es justo lo que pide la expresión.
// eslint-disable-next-line no-control-regex
const INVALID_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

const escapeXml = (value: string) =>
  value.replace(INVALID_XML, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** «A», «B», …, «Z», «AA»…: la columna de una celda, desde 0. */
function columnName(index: number): string {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

/** Días desde el 30-12-1899, como guarda Excel las fechas; aritmética de calendario, no de cantidades. */
function excelDay(iso: string): number | null {
  const match = ISO_DATE.exec(iso);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000 + 25_569;
}

function cellXml(cell: XlsxCell, ref: string, bold: boolean): string {
  if (cell === null) return '';
  const style = bold ? ` s="${BOLD}"` : '';
  if (typeof cell === 'object' && 'number' in cell && DECIMAL.test(cell.number)) {
    return `<c r="${ref}"${style}><v>${cell.number}</v></c>`;
  }
  if (typeof cell === 'object' && 'date' in cell) {
    const day = excelDay(cell.date);
    if (day !== null) return `<c r="${ref}" s="${DATE}"><v>${day}</v></c>`;
  }
  const text = typeof cell === 'string' ? cell : 'number' in cell ? cell.number : cell.date;
  return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
}

/** Nombre de hoja válido para Excel: hasta 31 caracteres y sin `[ ] : * ? / \`. */
const sheetTitle = (name: string) => name.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Hoja 1';

/**
 * Empieza un libro de una hoja que se escribe en `out`. `widths` son los anchos de columna en
 * caracteres, en orden.
 */
export function writeXlsx(out: Writable, options: { sheetName: string; widths?: number[] }): XlsxSheet {
  const zip = new yazl.ZipFile();
  const sheet = new PassThrough();
  const parts: Record<string, string> = {
    '[Content_Types].xml':
      `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      `<Override PartName="/xl/workbook.xml" ContentType="${OFFICE}.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="${OFFICE}.spreadsheetml.worksheet+xml"/>` +
      `<Override PartName="/xl/styles.xml" ContentType="${OFFICE}.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `${XML}<Relationships xmlns="${PKG_RELS}"><Relationship Id="rId1" Type="${DOC_RELS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml':
      `${XML}<workbook xmlns="${MAIN}" xmlns:r="${DOC_RELS}"><sheets>` +
      `<sheet name="${escapeXml(sheetTitle(options.sheetName))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels':
      `${XML}<Relationships xmlns="${PKG_RELS}">` +
      `<Relationship Id="rId1" Type="${DOC_RELS}/worksheet" Target="worksheets/sheet1.xml"/>` +
      `<Relationship Id="rId2" Type="${DOC_RELS}/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': STYLES,
  };
  for (const [name, content] of Object.entries(parts)) zip.addBuffer(Buffer.from(content, 'utf8'), name);
  zip.addReadStream(sheet, 'xl/worksheets/sheet1.xml');
  zip.end();

  // Si el destino se corta, la hoja también: una escritura en espera rechaza en vez de colgarse y las
  // siguientes rechazan con el mismo error. yazl no escucha los errores de la hoja: el fallo lo
  // informan `row` y `end`, nunca un error sin manejar.
  let failure: Error | undefined;
  sheet.on('error', () => undefined);
  zip.on('error', (error: Error) => out.destroy(error));
  const delivered = pipeline(zip.outputStream, out);
  delivered.catch((error: unknown) => {
    failure ??= error instanceof Error ? error : new Error(String(error));
    sheet.destroy(failure);
  });

  const write = async (chunk: string) => {
    if (failure) throw failure;
    if (!sheet.write(chunk)) await once(sheet, 'drain');
  };

  const cols = (options.widths ?? [])
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join('');
  let rowNumber = 0;
  let started = false;

  return {
    async row(cells, rowOptions) {
      if (!started) {
        started = true;
        await write(`${XML}<worksheet xmlns="${MAIN}">${cols ? `<cols>${cols}</cols>` : ''}<sheetData>`);
      }
      rowNumber += 1;
      const bold = rowOptions?.bold ?? false;
      const xml = cells.map((cell, index) => cellXml(cell, `${columnName(index)}${rowNumber}`, bold)).join('');
      await write(`<row r="${rowNumber}">${xml}</row>`);
    },
    async end() {
      if (!started) await write(`${XML}<worksheet xmlns="${MAIN}"><sheetData>`);
      if (failure) throw failure;
      sheet.end('</sheetData></worksheet>');
      await delivered;
    },
  };
}
