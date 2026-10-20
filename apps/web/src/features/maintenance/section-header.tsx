import { SectionHeader as ModuleSectionHeader, type SectionHeaderProps } from '../../app/section-header';
import { useMaintenance } from './context';

/** Cabecera de una sección de Mantenimiento: la común de la app, con el estado de Mantenimiento y su aviso de modo consulta. */
export function SectionHeader(props: SectionHeaderProps) {
  const { canOperate, freshness } = useMaintenance();
  return (
    <ModuleSectionHeader
      {...props}
      canOperate={canOperate}
      freshness={freshness}
      readOnlyNotice="Mantenimiento está en modo consulta: puedes ver lo que hay por hacer, el historial y los planes, pero no registrar cambios."
    />
  );
}
