import { Button, Skeleton, StatePanel } from '@platlab/ui';
import { CircleAlert, Compass, Lock, PackageX, WifiOff } from 'lucide-react';
import { Link } from 'react-router';
import { isApiError } from './api';

export function PageLoading() {
  return (
    <div className="mx-auto grid max-w-5xl gap-4 px-6 py-10" role="status" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="mt-4 h-40 w-full" />
    </div>
  );
}

export function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center">
      <StatePanel
        icon={Compass}
        title="Esta página no existe"
        description="Puede que el enlace esté incompleto o que la página haya cambiado de lugar."
        action={
          <Link to="/espacios" className="text-sm font-medium text-action underline">
            Ir al Inicio
          </Link>
        }
      />
    </main>
  );
}

/**
 * Estado de una consulta fallida según su código: «sin permiso» y «módulo no disponible» son
 * situaciones distintas y se explican por separado (primer incremento, «Interfaz mínima»).
 */
export function QueryErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (isApiError(error, 'ACCESS_DENIED')) {
    return (
      <StatePanel
        icon={Lock}
        title="Sin permiso"
        description="Tu rol en este espacio no incluye esta sección. Si la necesitas, pídesela a quien administra el espacio."
      />
    );
  }
  if (isApiError(error, 'MODULE_UNAVAILABLE')) {
    return (
      <StatePanel
        icon={PackageX}
        title="Módulo no disponible"
        description="Este espacio no tiene este módulo habilitado. Los módulos se habilitan por contrato con el Equipo PlatLab."
      />
    );
  }
  if (isApiError(error, 'NETWORK')) {
    return (
      <StatePanel
        icon={WifiOff}
        tone="warning"
        title="Sin conexión"
        description="No pudimos comunicarnos con PlatLab. Revisa tu red."
        action={<Button onClick={onRetry}>Reintentar</Button>}
      />
    );
  }
  return (
    <StatePanel
      icon={CircleAlert}
      tone="danger"
      title="No pudimos cargar esta información"
      description="Ocurrió un error inesperado. Vuelve a intentarlo en unos segundos."
      action={<Button onClick={onRetry}>Reintentar</Button>}
    />
  );
}
