import { SectionHeader as ModuleSectionHeader, type SectionHeaderProps } from '../../app/section-header';
import { useEquipment } from './context';

/** Cabecera de una sección de Equipos: la común de la app, con el estado de Equipos y su aviso de modo consulta. */
export function SectionHeader(props: SectionHeaderProps) {
  const { canOperate, freshness } = useEquipment();
  return (
    <ModuleSectionHeader
      {...props}
      canOperate={canOperate}
      freshness={freshness}
      readOnlyNotice="Equipos está en modo consulta: puedes ver el inventario, pero no registrar cambios."
    />
  );
}
