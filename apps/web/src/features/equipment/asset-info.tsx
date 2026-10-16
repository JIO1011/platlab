import type { Asset } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import type { ReactNode } from 'react';
import { formatDate } from '../../app/format';
import { formatMoney, todayIn, usefulLifeText, warrantyText } from './asset-facts';

function Fact({ label, children, muted = false }: { label: string; children: ReactNode; muted?: boolean }) {
  return (
    <div className="grid min-w-0 content-start gap-1">
      <dt className="text-[13px] text-ink-muted">{label}</dt>
      <dd className={cn('break-words text-base font-medium', muted ? 'text-ink-muted' : 'text-ink')}>{children}</dd>
    </div>
  );
}

/**
 * Pestaña «Información»: lo que la ficha sabe de la compra y del uso. Lo que falta se dice («Sin dato»),
 * no se deja en blanco; la garantía y la vida útil se cuentan contra hoy en la zona del espacio, y el
 * valor de reposición se formatea desde su cadena decimal, sin pasar por `number`.
 */
export function AssetInfo({ asset, timeZone }: { asset: Asset; timeZone: string }) {
  const today = todayIn(timeZone);
  return (
    <section aria-label="Información del equipo" className="rounded-card bg-surface p-6 shadow-raised md:p-8">
      <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <Fact label="Proveedor" muted={!asset.supplier}>
          {asset.supplier ?? 'Sin dato'}
        </Fact>
        <Fact label="Compra" muted={!asset.acquiredOn}>
          {asset.acquiredOn ? formatDate(asset.acquiredOn) : 'Sin dato'}
        </Fact>
        <Fact label="Garantía" muted={!asset.warrantyUntil}>
          {warrantyText(asset.warrantyUntil, today)}
          {asset.warrantyUntil ? <span className="block text-[13px] font-normal text-ink-muted">Hasta el {formatDate(asset.warrantyUntil)}</span> : null}
        </Fact>
        <Fact label="Vida útil" muted={!asset.acquiredOn || asset.usefulLifeYears === null}>
          {usefulLifeText(asset.acquiredOn, asset.usefulLifeYears, today)}
          {asset.usefulLifeYears !== null ? (
            <span className="block text-[13px] font-normal text-ink-muted">
              {asset.usefulLifeYears === 1 ? '1 año' : `${asset.usefulLifeYears} años`} desde la compra
            </span>
          ) : null}
        </Fact>
        <Fact label="Valor de reposición" muted={!asset.replacementValue}>
          {asset.replacementValue ? <span className="tabular-nums">{formatMoney(asset.replacementValue)}</span> : 'Sin dato'}
        </Fact>
      </dl>
    </section>
  );
}
