import { useOutletContext } from 'react-router';
import type { ModuleContext } from '../../app/module-app';

/** Lo que las secciones de la app de Laboratorios comparten: el espacio, la persona y lo que el rol puede hacer. */
export interface LabsContext extends ModuleContext {
  /** Habilita, edita y archiva espacios y carga cierres (`labs.space.manage`, Administrador). */
  canManageSpaces: boolean;
  /** Crea, renombra y archiva formatos y publica sus revisiones (`labs.form.manage`, Administrador). */
  canManageForm: boolean;
}

export const useLabs = () => useOutletContext<LabsContext>();
