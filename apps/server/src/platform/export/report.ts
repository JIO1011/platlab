import type { Writable } from 'node:stream';
import { todayIn } from '../dates.js';
import { writeXlsx, type XlsxCell } from './xlsx.js';

/** Una columna del Excel de un informe: su título, su ancho en caracteres y el valor de cada fila. */
export type ReportColumn<Row> = [title: string, width: number, value: (row: Row) => XlsxCell];

export interface ReportSheet<Row> {
  /** Agrega una fila con el valor de cada columna. */
  add(row: Row): Promise<void>;
  /** Cierra el archivo: después de confirmar la auditoría, o la descarga queda incompleta. */
  end(): Promise<void>;
}

/**
 * Abre el Excel de un informe (ADR 0017, 0022) con el encabezado común a todos: el título, el espacio, cuándo y
 * quién lo generó, los filtros en palabras y, tras una fila en blanco, los títulos de las columnas. El archivo se
 * llama `<nombre>-<hoy>.xlsx`, con el día en la zona del espacio. Se llama después de autorizar: abre el destino.
 */
export async function startReport<Row>(
  open: (fileName: string) => Writable,
  report: {
    fileName: string;
    sheetName: string;
    title: string;
    workspace: { name: string; timeZone: string };
    author: string;
    filters: string;
    columns: ReportColumn<Row>[];
  },
): Promise<ReportSheet<Row>> {
  const { timeZone } = report.workspace;
  const book = writeXlsx(open(`${report.fileName}-${todayIn(timeZone)}.xlsx`), {
    sheetName: report.sheetName,
    widths: report.columns.map(([, width]) => width),
  });
  const stamp = new Intl.DateTimeFormat('es-EC', { timeZone, dateStyle: 'short', timeStyle: 'short' }).format(new Date());
  await book.row([report.title], { bold: true });
  await book.row([`Espacio: ${report.workspace.name}`]);
  await book.row([`Generado el ${stamp} por ${report.author}`]);
  await book.row([`Filtros: ${report.filters}`]);
  await book.row([]);
  await book.row(
    report.columns.map(([title]) => title),
    { bold: true },
  );
  return {
    add: (row) => book.row(report.columns.map(([, , value]) => value(row))),
    end: () => book.end(),
  };
}
