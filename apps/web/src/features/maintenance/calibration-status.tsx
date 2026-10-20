import { Button } from '@platlab/ui';
import { Gauge, TriangleAlert } from 'lucide-react';
import { useParams } from 'react-router';
import { todayInZone } from '../../app/format';
import { InfoPill } from '../../app/pills';
import { useWorkspaceMe } from '../../app/queries';
import { calibrationStatus, calibrationText } from './calibration';
import type { DueTone } from './due';
import { DueDot } from './due-view';
import { useAssetMaintenance } from './queries';

/** El semáforo en la pastilla: vigente va neutra con su punto verde; por vencer, ámbar; sin vigencia, roja. */
const pillTone: Record<DueTone, 'neutral' | 'warning' | 'danger'> = { success: 'neutral', neutral: 'neutral', warning: 'warning', danger: 'danger' };

/**
 * Estado de calibración en la cabecera de la ficha (punto `equipment.asset-status`, M-01d, 6.4.8): «Calibrada hasta
 * el…» o «…: no usar». Lo ven quienes entran a Mantenimiento; sin plan de calibración, nada. Mientras carga, nada:
 * la cabecera no salta con un esqueleto. Si no se pudo calcular, lo dice con «Reintentar»: callar sería dar por buena
 * una calibración que no se verificó.
 */
export function CalibrationStatus({ assetId }: { assetId: string }) {
  const { workspaceId = '' } = useParams();
  const me = useWorkspaceMe(workspaceId);
  const maintenance = useAssetMaintenance(workspaceId, assetId);
  if (maintenance.isError) {
    return (
      <>
        <InfoPill tone="warning" className="font-semibold">
          <TriangleAlert aria-hidden />
          No se pudo verificar la calibración
        </InfoPill>
        <Button variant="ghost" size="sm" className="h-[44px] sm:h-8" onClick={() => void maintenance.refetch()}>
          Reintentar
        </Button>
      </>
    );
  }
  if (!me.data || !maintenance.data) return null;
  const today = todayInZone(me.data.workspace.timeZone, Date.now());
  const status = calibrationStatus(maintenance.data.plans, today);
  if (!status) return null;
  const { text, tone } = calibrationText(status, today);
  return (
    <InfoPill tone={pillTone[tone]} className="font-semibold">
      {tone === 'success' ? <DueDot tone="success" /> : <Gauge aria-hidden />}
      {text}
    </InfoPill>
  );
}
