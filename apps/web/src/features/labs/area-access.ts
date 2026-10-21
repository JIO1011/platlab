import { useParams } from 'react-router';
import { useWorkspaceMe } from '../../app/queries';
import { canOperateModule } from '../../app/module-access';

/**
 * Lo que Laboratorios sabe de la persona cuando pinta dentro de Áreas (ADR 0020), fuera de su propia app y de su
 * contexto: el espacio sale de la ruta y los permisos, de /me. Administra quien tiene `labs.space.manage` y el módulo
 * admite cambios (sin modo consulta); mientras /me no llega, `me` es `undefined`.
 */
export function useLabsAccess() {
  const { workspaceId = '' } = useParams();
  const me = useWorkspaceMe(workspaceId).data;
  return { workspaceId, me, canManage: canOperateModule(me, 'labs') && (me?.permissions.includes('labs.space.manage') ?? false) };
}
