import type { ProductDetail } from '@platlab/contracts';
import { Button, IconTile, Quantity, StockLevelBar, cn, formatDecimal, sectionLabel } from '@platlab/ui';
import { ArrowUpFromLine, CalendarClock, CalendarX, ExternalLink, FlaskConical, PackagePlus, PencilLine, RefreshCw, TrendingDown } from 'lucide-react';
import { formatAgo } from '../../app/format';
import { type Allowed, type ReagentsContext, type SheetRequest } from './context';
import { ControlledMark } from './controlled';
import { HazardGlyphs } from './hazards';
import { sdsLabels } from './ingress/safety-fields';
import { InfoPill } from './pills';
import { physicalStateIcon, physicalStateLabel } from './product-parts';
import { useNow } from './use-now';

/**
 * Vidrio de la ficha (ADR 0010, «Ventanas como ReactiLab»): blanco al 70 % sobre el fondo del módulo,
 * desenfocado y con borde blanco translúcido. Sin `backdrop-filter`, sólido. Solo la cabecera y el
 * resumen lo llevan; los frascos, translúcidos sin desenfoque, para que el desplazamiento sea fluido.
 */
const glassCard =
  'rounded-[28px] border border-white/70 bg-white/70 shadow-raised backdrop-blur-xl backdrop-saturate-150 not-supports-[backdrop-filter]:bg-surface';

const quietLink =
  'inline-flex min-h-8 items-center gap-1.5 rounded-control px-1.5 text-[13px] font-medium text-action transition-colors hover:bg-action-soft';

/**
 * Cabecera de la ficha: el cuadro del módulo y el nombre; la identidad en pastillas (código,
 * CAS, estado, «Controlado»); los pictogramas; y las acciones, con «Registrar salida» como la primaria
 * y «Ingresar frascos» como pastilla clara. «Editar» y «Actualizar» quedan como enlaces discretos.
 */
export function ProductHeader({
  product,
  allowed,
  canIssue,
  freshness,
  onAction,
}: {
  product: ProductDetail;
  allowed: Allowed;
  canIssue: boolean;
  freshness: ReagentsContext['freshness'];
  onAction: (request: SheetRequest) => void;
}) {
  const now = useNow(15_000);
  const state = product.physicalState ?? undefined;
  const StateIcon = (state && physicalStateIcon[state]) || FlaskConical;
  const showIssue = allowed.issue && canIssue;
  return (
    <div className={cn(glassCard, 'p-5 md:p-6')}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="flex min-w-0 items-start gap-4">
          <IconTile icon={FlaskConical} size="lg" />
          <div className="grid min-w-0 gap-3">
            <h1 className="text-display text-balance break-words leading-tight text-ink">{product.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <InfoPill mono>
                <span className="sr-only">Código </span>
                {product.code}
              </InfoPill>
              {product.casNumber ? <InfoPill mono>CAS {product.casNumber}</InfoPill> : null}
              <InfoPill>
                <StateIcon aria-hidden />
                {state ? physicalStateLabel[state] : 'Estado sin indicar'}
              </InfoPill>
              {product.controlled ? (
                <InfoPill tone="accent">
                  <ControlledMark withText className="gap-1.5 font-semibold [&>svg]:size-3.5" />
                </InfoPill>
              ) : null}
            </div>
            {/* Seguridad (ADR 0015): pictogramas, ficha de seguridad y densidad, como los registra el catálogo. */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-muted">
              {product.hazards.length > 0 ? <HazardGlyphs ids={product.hazards} large /> : <span>Sin pictogramas</span>}
              {product.sdsKind === 'digital' && product.sdsUrl ? (
                <a
                  href={product.sdsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-action hover:text-action-hover"
                >
                  Ficha de seguridad
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              ) : (
                <span>{product.sdsKind ? `Ficha de seguridad: ${sdsLabels[product.sdsKind].toLowerCase()}` : 'Ficha de seguridad sin indicar'}</span>
              )}
              {product.density ? <span className="tabular-nums">Densidad {formatDecimal(product.density)} g/mL</span> : null}
            </div>
            <p className="-ml-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[13px] text-ink-muted">
              <span className="px-1.5">{freshness.updatedAt > 0 ? `Actualizado ${formatAgo(freshness.updatedAt, now)}` : 'Cargando…'}</span>
              <button type="button" className={quietLink} onClick={freshness.refresh}>
                <RefreshCw className="size-3.5" aria-hidden />
                {freshness.refreshing ? 'Actualizando…' : 'Actualizar'}
              </button>
              {allowed.product ? (
                <button type="button" className={quietLink} onClick={() => onAction({ kind: 'product', product })}>
                  <PencilLine className="size-3.5" aria-hidden />
                  Editar
                </button>
              ) : null}
            </p>
          </div>
        </div>
        {showIssue || allowed.receipt ? (
          <div className="grid shrink-0 gap-2.5 sm:grid-cols-2 lg:w-60 lg:grid-cols-1">
            {showIssue ? (
              <Button
                variant="primary"
                className="h-14 rounded-2xl bg-linear-to-r from-action to-action-deep px-6 text-base font-bold shadow-lg shadow-action/25 hover:from-action-hover hover:to-action-deep [&_svg]:size-5"
                onClick={() => onAction({ kind: 'issue', productId: product.id })}
              >
                <ArrowUpFromLine aria-hidden />
                {allowed.approve ? 'Registrar salida' : 'Solicitar salida'}
              </Button>
            ) : null}
            {allowed.receipt ? (
              <Button
                className="h-11 rounded-full border-line-strong bg-white/80 px-5 font-semibold text-action hover:bg-white"
                onClick={() => onAction({ kind: 'ingress', productId: product.id })}
              >
                <PackagePlus aria-hidden />
                Ingresar frascos
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Resumen en una tarjeta de vidrio (ADR 0012, 06-10-2026): Existencia, Mínimo y Caducidad en tres
 * columnas separadas por líneas (en el móvil, filas). La existencia lleva la barra de nivel: el saldo
 * frente a lo inicial de los frascos con saldo, solo cuando todos ya se conocen.
 */
export function ProductSummary({
  product,
  canManage,
  stockPercent,
  onAction,
}: {
  product: ProductDetail;
  canManage: boolean;
  /** Nivel de la existencia frente a lo inicial; `null` si falta algún dato para afirmarlo. */
  stockPercent: number | null;
  onAction: (request: SheetRequest) => void;
}) {
  const noStock = product.balance === '0';
  return (
    <dl className={cn(glassCard, 'grid divide-y divide-line overflow-hidden sm:grid-cols-[1.5fr_1fr_1fr] sm:divide-x sm:divide-y-0')}>
      <div className="grid content-start gap-1.5 p-5">
        <dt className={sectionLabel}>Existencia</dt>
        <dd>
          <Quantity
            value={product.balance}
            unit={product.baseUnit}
            className={cn('text-4xl font-bold tracking-tight', noStock ? 'text-ink-subtle' : 'text-action')}
          />
        </dd>
        <dd className="text-sm text-ink-muted">
          {noStock
            ? 'Sin existencias'
            : product.containersWithStock === 1
              ? 'en 1 frasco con saldo'
              : `en ${product.containersWithStock} frascos con saldo`}
        </dd>
        {stockPercent !== null && !noStock ? (
          <dd className="mt-1 grid gap-1">
            <StockLevelBar
              percent={stockPercent}
              hasStock
              label={`Nivel de la existencia: ${stockPercent} % de lo inicial`}
            />
            <span className="text-xs text-ink-muted">
              <span className="font-semibold tabular-nums">{stockPercent} %</span> de lo inicial de esos frascos
            </span>
          </dd>
        ) : null}
      </div>
      {/* Mínimo para todo el espacio (ADR 0012, 05-10-2026): lo fija quien administra el catálogo. */}
      <div className="grid content-start gap-1.5 p-5">
        <dt className={sectionLabel}>Mínimo</dt>
        <dd className="text-xl font-bold leading-tight text-ink">
          {product.minimum ? <Quantity value={product.minimum} unit={product.baseUnit} /> : <span className="text-ink-muted">Sin fijar</span>}
        </dd>
        {product.belowMinimum ? (
          <dd className="flex items-center gap-1.5 text-sm font-semibold text-warning">
            <TrendingDown className="size-4" aria-hidden />
            Bajo mínimo
          </dd>
        ) : null}
        {canManage ? (
          <dd>
            <button
              type="button"
              className="-ml-1 inline-flex min-h-8 items-center rounded-control px-1 text-sm font-medium text-action hover:text-action-hover"
              onClick={() => onAction({ kind: 'minimum', productId: product.id })}
            >
              {product.minimum ? 'Cambiar mínimo' : 'Fijar mínimo'}
            </button>
          </dd>
        ) : null}
      </div>
      <div className="grid content-start gap-1.5 p-5">
        {/* Solo afirma lo que se cuenta: un frasco sin caducidad confirmada lo dice en su tarjeta. */}
        <dt className={sectionLabel}>Caducidad</dt>
        {product.expiredContainers || product.expiringContainers ? (
          <>
            {product.expiredContainers ? (
              <dd className="flex items-center gap-1.5 text-base font-bold leading-tight text-danger">
                <CalendarX className="size-4 shrink-0" aria-hidden />
                {product.expiredContainers === 1 ? '1 frasco vencido' : `${product.expiredContainers} frascos vencidos`}
              </dd>
            ) : null}
            {product.expiringContainers ? (
              <dd className="flex items-center gap-1.5 text-base font-bold leading-tight text-warning">
                <CalendarClock className="size-4 shrink-0" aria-hidden />
                {product.expiringContainers === 1 ? '1 frasco por vencer' : `${product.expiringContainers} frascos por vencer`}
              </dd>
            ) : null}
          </>
        ) : (
          <dd className="text-base font-semibold leading-tight text-ink-muted">Sin vencidos ni por vencer</dd>
        )}
      </div>
    </dl>
  );
}
