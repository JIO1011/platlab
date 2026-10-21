import type { WorkspaceMeResponse } from '@platlab/contracts';

/** Si el módulo admite operaciones nuevas en el espacio; sin esto, está en modo consulta (ADR 0009). */
export const canOperateModule = (me: WorkspaceMeResponse | undefined, code: string): boolean =>
  me?.modules.find((entry) => entry.code === code)?.access.includes('new_operation') ?? false;
