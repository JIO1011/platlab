/** La ruta de la app de Materiales en el espacio, la del manifiesto. */
export function materialsPath(modules: Array<{ code: string; nav: Array<{ path: string }> }>, workspaceId: string): string {
  return `/e/${workspaceId}/${modules.find((entry) => entry.code === 'materials')?.nav[0]?.path ?? 'materiales'}`;
}
