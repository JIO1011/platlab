import { Navigate, useParams } from 'react-router';
import { labelUrl, readLabelCode } from '../../app/label-link';
import { NotFound } from '../../app/states';
import { useEquipment } from './context';

/** Enlace del QR de un equipo: corto (`/q/e/…`), como el del frasco (ADR 0019, E-01d). */
export function assetLabelUrl(workspaceId: string, assetId: string): string {
  return labelUrl('equipo', workspaceId, assetId);
}

/**
 * Destino del QR de un equipo, fuera del espacio: el código dice el espacio y el equipo, y lleva a la app de
 * Equipos de ese espacio, que decide adónde según el rol de quien lo abre.
 */
export function EquipmentLinkPage() {
  const { code = '' } = useParams();
  const target = readLabelCode(code);
  if (!target) return <NotFound />;
  return <Navigate replace to={`/e/${target.workspaceId}/equipos/q/${target.id}`} />;
}

/**
 * Ya en el espacio: quien consulta el inventario (Administrador y Operador) llega a la ficha; quien solo
 * reporta (Docente y Estudiante), a «Reportar incidente» con el equipo elegido (17-10-2026).
 */
export function EquipmentScanPage() {
  const { me, base } = useEquipment();
  const { assetId = '' } = useParams();
  const to = me.permissions.includes('equipment.catalog.read')
    ? `${base}/inventario/${assetId}`
    : `${base}/incidentes?${new URLSearchParams({ reportar: assetId })}`;
  return <Navigate replace to={to} />;
}
