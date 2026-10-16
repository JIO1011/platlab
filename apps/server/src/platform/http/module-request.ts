import type { FastifyRequest } from 'fastify';
import { workspaceParams } from '@platlab/contracts';
import { verifiedSubject } from './auth.js';
import { idempotencyKey } from './idempotency-key.js';

/** Consulta de un módulo: el sujeto del JWT verificado y el espacio de la ruta, nunca del cuerpo. */
export const queryRequest = (request: FastifyRequest) => ({
  subject: verifiedSubject(request),
  workspaceId: workspaceParams.parse(request.params).workspaceId,
});

/** Comando de un módulo: además, su clave idempotente opcional (02 §7). */
export const commandRequest = (request: FastifyRequest) => ({
  ...queryRequest(request),
  idempotencyKey: idempotencyKey(request),
});
