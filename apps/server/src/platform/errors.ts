import type { ErrorCode } from '@platlab/contracts';

/** Error esperado de un caso de uso; la capa HTTP lo traduce a su estado y al contrato. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Misma respuesta para un espacio inexistente o ajeno: no revela cuál de los dos es. */
export const accessDenied = () => new AppError('ACCESS_DENIED', 'Acceso denegado');
