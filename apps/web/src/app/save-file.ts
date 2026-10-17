/**
 * Guarda un archivo que dio la API (el Excel del Informe) con el diálogo de descarga del navegador:
 * un enlace temporal al blob, que se libera después del clic.
 */
export function saveFile(blob: Blob, fileName: string): void {
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
