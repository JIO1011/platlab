import type { Asset } from '@platlab/contracts';
import { Button, IconTile, Sheet, Tooltip, cn } from '@platlab/ui';
import { Activity, ArrowLeftRight, FileText, Microscope, Pencil, QrCode, TriangleAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { glassCard, iconAction } from '../../app/glass';
import { InfoPill } from '../../app/pills';
import { RefreshButton } from '../../app/refresh-button';
import { AssetData } from './asset-data';
import { assetMeta } from './asset-text';

/** Las hojas que abre la cabecera. */
export type AssetSheet = 'condition' | 'transfer' | 'edit' | 'fault';

/**
 * Membrete de la ficha del equipo, más corto (U-01): la foto del equipo (cuadrada, de
 * 80 a 96 px, entera sobre blanco; al tocarla se abre ampliada en un diálogo) o, sin foto, el cuadro del módulo, y el nombre, con ⟳ «Actualizar»; las pastillas (código en
 * mono, tipo, marca · modelo · serie, alimentación) y, a la derecha, «Cambiar estado» como única acción sólida, «Reportar incidente» en contorno y con su texto (sin
 * el permiso de cambiar el estado, es la primaria) y los botones redondos «Trasladar equipo», «Etiqueta QR», «Hoja de vida» (el documento) y «Editar ficha» (el lápiz), cada uno solo con
 * su permiso; la etiqueta y la hoja de vida, en cambio, las ve quien ve la ficha, también en modo consulta (imprimirlas es consultar); la hoja
 * de vida también con el equipo dado de baja. Debajo, la franja con todos los datos del equipo. Un equipo dado de baja no ofrece ninguna otra acción.
 */
export function AssetHeader({
  asset,
  canChangeCondition,
  canTransfer,
  canEdit,
  canReport,
  freshness,
  labelsTo,
  timeZone,
  onAction,
  onLifeRecord,
  statusLines,
}: {
  asset: Asset;
  canChangeCondition: boolean;
  canTransfer: boolean;
  /** Administra el catálogo: edita la ficha. */
  canEdit: boolean;
  /** Puede reportar un incidente (`equipment.fault.report` y Equipos admite cambios). */
  canReport: boolean;
  freshness: { updatedAt: number; refreshing: boolean; refresh: () => void };
  /** La hoja de etiquetas del área con este equipo elegido. */
  labelsTo: string;
  /** La zona del espacio: la garantía y la vida útil se cuentan contra hoy en ella. */
  timeZone: string;
  onAction: (sheet: AssetSheet) => void;
  /** Abre la Hoja de vida imprimible. */
  onLifeRecord: () => void;
  /** Lo que otros módulos dicen del estado del equipo, junto a sus datos (M-01d: la calibración). */
  statusLines?: ReactNode;
}) {
  const retired = asset.condition === 'retired';
  const showCondition = canChangeCondition && !retired;
  const showTransfer = canTransfer && !retired;
  const showEdit = canEdit && !retired;
  const showFault = canReport && !retired;
  const showLabel = !retired;
  const navigate = useNavigate();
  const meta = assetMeta(asset);
  const [zoomed, setZoomed] = useState(false);
  return (
    <div className={cn(glassCard, 'p-4 md:p-5')}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="flex min-w-0 items-start gap-4">
          {asset.photoUrl ? (
            <>
              <button
                type="button"
                aria-label={`Ampliar la foto de ${asset.name}`}
                onClick={() => setZoomed(true)}
                className="size-20 shrink-0 cursor-zoom-in overflow-hidden rounded-[16px] border border-line bg-surface transition-colors hover:border-line-strong md:size-24"
              >
                <img src={asset.photoUrl} alt="" loading="lazy" decoding="async" className="size-full object-contain p-1.5" />
              </button>
              <Sheet open={zoomed} onOpenChange={setZoomed} title={asset.name} wide>
                <img src={asset.photoUrl} alt={asset.name} decoding="async" className="mx-auto max-h-[70dvh] w-full rounded-control bg-surface object-contain" />
              </Sheet>
            </>
          ) : (
            <IconTile icon={Microscope} size="md" />
          )}
          <div className="grid min-w-0 gap-2">
            <div className="flex min-w-0 items-start gap-1">
              <h1 className="min-w-0 text-display text-balance break-words leading-tight text-ink">{asset.name}</h1>
              <RefreshButton freshness={freshness} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <InfoPill mono>
                <span className="sr-only">Código </span>
                {asset.code}
              </InfoPill>
              <InfoPill>{asset.type.name}</InfoPill>
              {meta ? <InfoPill>{meta}</InfoPill> : null}
              {asset.powerSupply ? <InfoPill>{asset.powerSupply}</InfoPill> : null}
            </div>
            {/* Su propia línea: el estado de otro módulo no se mezcla con los datos fijos; vacía, no deja hueco. */}
            {statusLines ? <div className="flex flex-wrap items-center gap-2 empty:hidden">{statusLines}</div> : null}
          </div>
        </div>
        {/* Una sola acción sólida: «Cambiar estado»; «Reportar incidente» va en contorno, con su texto. Sin permiso de cambiar el estado, la primaria es «Reportar incidente». */}
        <div className="flex flex-wrap items-center gap-2 lg:max-w-[23rem] lg:shrink-0 lg:justify-end">
          {showCondition ? (
            <Button variant="primary" className="h-11 flex-1 px-5 text-sm font-semibold sm:flex-none" onClick={() => onAction('condition')}>
              <Activity aria-hidden />
              Cambiar estado
            </Button>
          ) : null}
          {showFault ? (
            <Button
              variant={showCondition ? 'secondary' : 'primary'}
              className="h-11 flex-1 px-4 text-sm font-semibold sm:flex-none"
              onClick={() => onAction('fault')}
            >
              <TriangleAlert aria-hidden />
              Reportar incidente
            </Button>
          ) : null}
          <div className="flex items-center gap-2">
            {showTransfer ? (
              <Tooltip label="Trasladar equipo">
                <Button size="icon" className={iconAction} aria-label="Trasladar equipo" onClick={() => onAction('transfer')}>
                  <ArrowLeftRight aria-hidden />
                </Button>
              </Tooltip>
            ) : null}
            {showLabel ? (
              <Tooltip label="Etiqueta QR">
                <Button size="icon" className={iconAction} aria-label="Etiqueta QR" onClick={() => void navigate(labelsTo)}>
                  <QrCode aria-hidden />
                </Button>
              </Tooltip>
            ) : null}
            <Tooltip label="Hoja de vida">
              <Button size="icon" className={iconAction} aria-label="Hoja de vida" onClick={onLifeRecord}>
                <FileText aria-hidden />
              </Button>
            </Tooltip>
            {showEdit ? (
              <Tooltip label="Editar ficha">
                <Button size="icon" className={iconAction} aria-label="Editar ficha" onClick={() => onAction('edit')}>
                  <Pencil aria-hidden />
                </Button>
              </Tooltip>
            ) : null}
          </div>
        </div>
      </div>
      <AssetData asset={asset} timeZone={timeZone} />
    </div>
  );
}
