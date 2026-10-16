import type { Asset } from '@platlab/contracts';
import { Button, IconTile, Tooltip, cn } from '@platlab/ui';
import { Activity, ArrowLeftRight, Microscope, Pencil, TriangleAlert, UserRound, MapPin } from 'lucide-react';
import { glassCard, iconAction, primaryAction } from '../../app/glass';
import { InfoPill } from '../../app/pills';
import { RefreshButton } from '../../app/refresh-button';
import { RowLabel, SummaryCard } from '../../app/summary-card';
import { assetMeta, conservationLabel, placeLines } from './asset-text';
import { ConditionBadge } from './condition-badge';

/** Las hojas que abre la cabecera. */
export type AssetSheet = 'condition' | 'transfer' | 'edit' | 'fault';

/**
 * Cabecera de la ficha del equipo, como la del reactivo: la foto del equipo (cuadrada, de 72 a 96 px) o, sin
 * foto, el cuadro del módulo, y el nombre, con ⟳ «Actualizar»;
 * las pastillas (código en mono, tipo, marca · modelo · serie, alimentación) y, a la derecha, «Cambiar
 * condición» como primaria y los botones redondos «Trasladar equipo», «Reportar falla» y «Editar ficha» (el lápiz), cada uno solo
 * con su permiso. Un equipo dado de baja no ofrece ninguna acción.
 */
export function AssetHeader({
  asset,
  canChangeCondition,
  canTransfer,
  canEdit,
  canReport,
  freshness,
  onAction,
}: {
  asset: Asset;
  canChangeCondition: boolean;
  canTransfer: boolean;
  /** Administra el catálogo: edita la ficha. */
  canEdit: boolean;
  /** Puede reportar una falla (`equipment.fault.report` y Equipos admite cambios). */
  canReport: boolean;
  freshness: { updatedAt: number; refreshing: boolean; refresh: () => void };
  onAction: (sheet: AssetSheet) => void;
}) {
  const retired = asset.condition === 'retired';
  const showCondition = canChangeCondition && !retired;
  const showTransfer = canTransfer && !retired;
  const showEdit = canEdit && !retired;
  const showFault = canReport && !retired;
  const meta = assetMeta(asset);
  return (
    <div className={cn(glassCard, 'p-5 md:p-6')}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="flex min-w-0 items-start gap-4">
          {asset.photoUrl ? (
            <img
              src={asset.photoUrl}
              alt={asset.name}
              loading="lazy"
              decoding="async"
              className="size-[72px] shrink-0 rounded-[18px] border border-line bg-surface-sunken object-cover md:size-24"
            />
          ) : (
            <IconTile icon={Microscope} size="lg" />
          )}
          <div className="grid min-w-0 gap-3">
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
          </div>
        </div>
        {showCondition || showTransfer || showEdit || showFault ? (
          <div className="grid shrink-0 gap-3 lg:w-64">
            {showCondition ? (
              <Button variant="primary" className={primaryAction} onClick={() => onAction('condition')}>
                <Activity aria-hidden />
                Cambiar condición
              </Button>
            ) : null}
            {showTransfer || showEdit || showFault ? (
              <div className="flex flex-wrap gap-2">
                {showTransfer ? (
                  <Tooltip label="Trasladar equipo">
                    <Button size="icon" className={iconAction} aria-label="Trasladar equipo" onClick={() => onAction('transfer')}>
                      <ArrowLeftRight aria-hidden />
                    </Button>
                  </Tooltip>
                ) : null}
                {showFault ? (
                  <Tooltip label="Reportar falla">
                    <Button size="icon" className={iconAction} aria-label="Reportar falla" onClick={() => onAction('fault')}>
                      <TriangleAlert aria-hidden />
                    </Button>
                  </Tooltip>
                ) : null}
                {showEdit ? (
                  <Tooltip label="Editar ficha">
                    <Button size="icon" className={iconAction} aria-label="Editar ficha" onClick={() => onAction('edit')}>
                      <Pencil aria-hidden />
                    </Button>
                  </Tooltip>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const valueClass = 'text-[18px] font-bold leading-tight tracking-tight';
const detailClass = 'text-[13px] leading-snug text-ink-muted';

const conditionIconTone = { operational: 'success', restricted: 'warning', faulted: 'danger', retired: 'soft' } as const;

/**
 * Resumen de la ficha en tres cuadros pequeños y separados: Condición (la insignia con su texto y la
 * conservación), Ubicación (como una dirección: la sala y, debajo, los niveles) y Responsable. Desde `xl`
 * van apilados en una columna de 11 rem; por debajo, tres columnas desde `sm` y una sola en el móvil,
 * donde los nombres largos no caben en un tercio del ancho.
 */
export function AssetSummary({ asset }: { asset: Asset }) {
  const place = placeLines(asset.location);
  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
      <SummaryCard>
        <RowLabel icon={Activity} tone={conditionIconTone[asset.condition]}>
          Condición
        </RowLabel>
        <dd>
          <ConditionBadge condition={asset.condition} />
        </dd>
        <dd className={detailClass}>Conservación: {asset.conservation ? conservationLabel[asset.conservation] : 'Sin dato'}</dd>
      </SummaryCard>
      <SummaryCard>
        <RowLabel icon={MapPin}>Ubicación</RowLabel>
        <dd title={place.full} className={cn(valueClass, 'text-ink [overflow-wrap:anywhere]')}>
          {place.room}
        </dd>
        {place.rest ? <dd className={cn(detailClass, '[overflow-wrap:anywhere]')}>{place.rest}</dd> : null}
      </SummaryCard>
      <SummaryCard>
        <RowLabel icon={UserRound}>Responsable</RowLabel>
        <dd className={cn(valueClass, '[overflow-wrap:anywhere]', asset.responsible ? 'text-ink' : 'font-semibold text-ink-muted')}>
          {asset.responsible?.name ?? 'Sin responsable'}
        </dd>
      </SummaryCard>
    </dl>
  );
}
