import { Button } from '@platlab/ui';
import { Suspense, lazy, useState } from 'react';
import { useParams } from 'react-router';
import { useWorkspaceMe } from '../../app/queries';

/** La hoja de registro se descarga al abrirla: la hoja del incidente no carga el formulario. */
const RecordSheet = lazy(async () => ({ default: (await import('./record-sheet')).RecordSheet }));

/**
 * * «Registrar en Mantenimiento» en la hoja de un incidente por atender (M-01b): abre «Registrar mantenimiento» con el
 * equipo y el incidente elegidos, para anotar costo, proveedor y certificado y solucionarlo en el mismo paso.
 */
export function RepairAction({ faultId, assetId }: { faultId: string; assetId: string }) {
  const { workspaceId = '' } = useParams();
  const me = useWorkspaceMe(workspaceId);
  // `n` monta la hoja de nuevo en cada apertura: formulario limpio y clave idempotente nueva.
  const [sheet, setSheet] = useState<{ n: number; open: boolean } | null>(null);
  const canRecord = me.data?.modules.find((entry) => entry.code === 'maintenance')?.access.includes('new_operation') ?? false;
  if (!me.data || !canRecord) return null;
  return (
    <>
      <Button className="h-12 w-full rounded-2xl" onClick={() => setSheet({ n: (sheet?.n ?? 0) + 1, open: true })}>
        Registrar en Mantenimiento
      </Button>
      {sheet ? (
        <Suspense fallback={null}>
          <RecordSheet
            key={sheet.n}
            workspaceId={workspaceId}
            me={me.data}
            open={sheet.open}
            onOpenChange={(open) => setSheet({ ...sheet, open })}
            assetId={assetId}
            faultId={faultId}
          />
        </Suspense>
      ) : null}
    </>
  );
}
