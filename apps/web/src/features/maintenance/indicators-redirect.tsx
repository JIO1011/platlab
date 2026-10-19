import { Navigate, useLocation } from 'react-router';
import { useMaintenance } from './context';

/**
 * El enlace viejo `/indicadores` (ADR 0021): la sección se fundió en el Resumen, la portada. Conserva `#reemplazo`
 * para que el aviso «Evaluar reemplazo» siga a un clic.
 */
export function IndicatorsRedirect() {
  const { base } = useMaintenance();
  const { hash } = useLocation();
  return <Navigate replace to={{ pathname: base, hash }} />;
}
