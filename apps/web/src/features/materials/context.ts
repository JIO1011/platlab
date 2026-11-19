import { useOutletContext } from 'react-router';
import type { ModuleContext } from '../../app/module-app';

/** Lo que las secciones de la app de Materiales comparten: el espacio, la persona, la ruta base y lo que el rol puede hacer. */
export interface MaterialsContext extends ModuleContext {
  /** `/e/:espacio/materiales`, sin barra final. */
  base: string;
  /** Registra materiales y fija su mínimo (`materials.catalog.manage`, Administrador). */
  canManage: boolean;
  /** «Ingresar» existencias (`materials.receipt.create`). */
  canReceive: boolean;
  /** «Dar salida» (`materials.issue.create`). */
  canIssue: boolean;
  /** «Ajustar» el saldo con motivo (`materials.adjustment.create`, Administrador). */
  canAdjust: boolean;
  /** «Nuevo préstamo» (`materials.loan.create`). */
  canLend: boolean;
  /** «Registrar devolución» (`materials.loan.return`). */
  canReturn: boolean;
  /** Bajar el Excel del libro (`materials.report.export`, Administrador): es una consulta, también en modo consulta. */
  canReport: boolean;
}

export const useMaterials = () => useOutletContext<MaterialsContext>();
