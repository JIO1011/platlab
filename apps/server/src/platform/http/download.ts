import { PassThrough, type Writable } from 'node:stream';
import type { FastifyReply } from 'fastify';
import { XLSX_TYPE } from '../export/xlsx.js';

/**
 * Responde con un Excel que sale por partes mientras se lee (ADR 0017, 0022). `run` abre el destino solo después
 * de autorizar: un rechazo antes de empezar responde con su error; un fallo a mitad corta la descarga, que queda
 * incompleta, y la transacción se revierte.
 */
export async function sendXlsx(reply: FastifyReply, run: (open: (fileName: string) => Writable) => Promise<void>): Promise<FastifyReply> {
  const body = new PassThrough();
  try {
    await run((fileName) => {
      void reply.type(XLSX_TYPE).header('content-disposition', `attachment; filename="${fileName}"`).send(body);
      return body;
    });
  } catch (error) {
    if (!reply.sent) throw error;
    body.destroy(error instanceof Error ? error : new Error(String(error)));
  }
  return reply;
}
