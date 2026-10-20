import type { Asset } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import type { ReactNode } from 'react';
import { formatDate } from '../../app/format';
import { formatMoney, todayIn, usefulLifeText, warrantyText } from './asset-facts';
import { conservationLabel, placeLines } from './asset-text';
import { ConditionBadge } from './condition-badge';

function Fact({ label, children, detail, muted = false }: { label: string; children: ReactNode; detail?: ReactNode; muted?: boolean }) {
  return (
    <div className="grid min-w-0 content-start gap-0.5">
      <dt className="text-[13px] text-ink-muted">{label}</dt>
      <dd className={cn('break-words text-[15px] leading-snug [overflow-wrap:anywhere]', muted ? 'font-medium text-ink-muted' : 'font-semibold text-ink')}>
        {children}
      </dd>
      {detail ? <dd className="break-words text-[13px] leading-snug text-ink-muted [overflow-wrap:anywhere]">{detail}</dd> : null}
    </div>
  );
}

/**
 * La franja de datos del membrete de la ficha: Estado, Estado físico, Ubicación (la sala y, debajo, los
 * niveles), Responsable, Compra (con el proveedor), Garantía, Vida útil y Valor de reposición. Lo que falta se
 * dice («Sin dato»), no se deja en blanco; la garantía y la vida útil se cuentan contra hoy en la zona del
 * espacio, y el valor de reposición se formatea desde su cadena decimal, sin pasar por `number`.
 */
export function AssetData({ asset, timeZone }: { asset: Asset; timeZone: string }) {
  const today = todayIn(timeZone);
  const place = placeLines(asset.location);
  return (
    <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-line pt-4 sm:grid-cols-3 lg:grid-cols-4">
      <Fact label="Estado">
        <ConditionBadge condition={asset.condition} />
      </Fact>
      <Fact label="Estado físico" muted={!asset.conservation}>
        {asset.conservation ? conservationLabel[asset.conservation] : 'Sin dato'}
      </Fact>
      <Fact label="Ubicación" detail={place.rest || undefined}>
        <span title={place.full}>{place.room}</span>
      </Fact>
      <Fact label="Responsable" muted={!asset.responsible}>
        {asset.responsible?.name ?? 'Sin responsable'}
      </Fact>
      <Fact
        label="Compra"
        muted={!asset.acquiredOn}
        detail={asset.supplier ? `Proveedor: ${asset.supplier}` : undefined}
      >
        {asset.acquiredOn ? formatDate(asset.acquiredOn) : 'Sin dato'}
      </Fact>
      <Fact
        label="Garantía"
        muted={!asset.warrantyUntil}
        detail={asset.warrantyUntil ? `Hasta el ${formatDate(asset.warrantyUntil)}` : undefined}
      >
        {warrantyText(asset.warrantyUntil, today)}
      </Fact>
      <Fact
        label="Vida útil"
        muted={!asset.acquiredOn || asset.usefulLifeYears === null}
        detail={
          asset.usefulLifeYears !== null
            ? `${asset.usefulLifeYears === 1 ? '1 año' : `${asset.usefulLifeYears} años`} desde la compra`
            : undefined
        }
      >
        {usefulLifeText(asset.acquiredOn, asset.usefulLifeYears, today)}
      </Fact>
      <Fact label="Valor de reposición" muted={!asset.replacementValue}>
        {asset.replacementValue ? <span className="tabular-nums">{formatMoney(asset.replacementValue)}</span> : 'Sin dato'}
      </Fact>
    </dl>
  );
}
