import { useMutation } from '@tanstack/react-query';
import { apiDownload } from './api';

/**
 * Descarga de un informe (ADR 0022): pide a la API el archivo que arma `pathOf` con lo filtrado y lo guarda con el
 * nombre que dio el servidor. Es una consulta: no lleva clave idempotente ni refresca la caché.
 */
export function useFileDownload<T>(pathOf: (input: T) => string) {
  return useMutation({
    mutationFn: async (input: T) => {
      const { blob, fileName } = await apiDownload(pathOf(input));
      saveFile(blob, fileName);
    },
  });
}

/**
 * Guarda un archivo que dio la API (el Excel del Informe) con el diálogo de descarga del navegador:
 * un enlace temporal al blob, que se libera después del clic.
 */
function saveFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
