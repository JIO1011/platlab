/**
 * Último espacio usado por cada identidad en este navegador (ADR 0011, entrada directa). Es una
 * comodidad local: si el almacenamiento no está disponible, se entra al primero de la lista.
 */
const key = (userId: string) => `platlab.ultimo-espacio.${userId}`;

export function rememberWorkspace(userId: string, workspaceId: string): void {
  try {
    localStorage.setItem(key(userId), workspaceId);
  } catch {
    // Sin almacenamiento (modo privado o bloqueado): la próxima vez se entra al primero.
  }
}

export function lastWorkspace(userId: string): string | null {
  try {
    return localStorage.getItem(key(userId));
  } catch {
    return null;
  }
}
