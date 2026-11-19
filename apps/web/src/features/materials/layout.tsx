import { useShell } from '../../app/app-shell';
import { ModuleOutlet, useModuleApp } from '../../app/module-app';
import type { MaterialsContext } from './context';
import { materialsPath } from './path';
import { useMaterialsKey } from './queries';

/**
 * La app de Materiales (ADR 0025): el contenedor común de sus secciones y lo que comparten (espacio, permisos y
 * «Actualizar»). Docente y Estudiante no entran: el servidor no les da sus secciones.
 */
export function MaterialsLayout() {
  const { workspaceId, me } = useShell();
  const app = useModuleApp(
    'materials',
    useMaterialsKey(workspaceId),
    'Materiales está en modo consulta: puedes ver las existencias y los préstamos, pero no registrar cambios.',
  );
  const allowed = (permission: string) => app.canOperate && me.permissions.includes(permission);
  return (
    <ModuleOutlet
      context={
        {
          ...app,
          base: materialsPath(me.modules, workspaceId),
          canManage: allowed('materials.catalog.manage'),
          canReceive: allowed('materials.receipt.create'),
          canIssue: allowed('materials.issue.create'),
          canAdjust: allowed('materials.adjustment.create'),
          canLend: allowed('materials.loan.create'),
          // Devolver resuelve un pendiente: la admisión lo permite aun con el módulo en modo consulta (ADR 0009).
          canReturn: me.permissions.includes('materials.loan.return'),
        } satisfies MaterialsContext
      }
    />
  );
}
