import type { ProductDetail } from '@platlab/contracts';
import { Button, IconTile, Quantity, StockLevelBar, cn, formatDecimal, sectionLabel } from '@platlab/ui';
import { ArrowRight, ArrowUpFromLine, CalendarCheck, CalendarClock, CalendarX, ExternalLink, FlaskConical, Package, PackagePlus, PencilLine, RefreshCw, TrendingDown, type LucideIcon } from 'lucide-react';
import { formatAgo, formatDate } from '../../app/format';
import { type Allowed, type ReagentsContext, type SheetRequest } from './context';
import { ControlledMark } from './controlled';
import { HazardGlyphs } from './hazards';
import { sdsLabels } from './ingress/safety-fields';
import { InfoPill } from './pills';
import { physicalStateIcon, physicalStateLabel } from './product-parts';
import { useNow } from './use-now';

/**
 * Vidrio de la ficha (ADR 0010, «Ventanas como ReactiLab»): blanco al 70 % sobre el fondo del módulo,
 * desenfocado y con borde blanco translúcido. Sin `backdrop-filter`, sólido. Solo la cabecera lo lleva;
 * el resumen son tarjetas blancas y los frascos, translúcidos sin desenfoque, para que el desplazamiento
 * sea fluido.
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

/** Las fechas de caducidad de los frascos con saldo, tal como las conoce la ficha. */
export type ExpiryDates = {
  /** La próxima por llegar (hoy o después). */
  upcoming: string | null;
  /** La más antigua ya vencida. */
  oldestExpired: string | null;
};

const summaryCard = 'grid content-start gap-2 rounded-3xl border border-white/80 bg-surface p-5 shadow-raised';

/**
 * Rótulo de una tarjeta del resumen: el icono pequeño de color suave y el nombre. El propio `dt`
 * los agrupa: dentro de un `dl`, un `dt` no puede ir envuelto en otro elemento (axe).
 */
function CardLabel({ children, icon, tone = 'soft' }: { children: string; icon: LucideIcon; tone?: 'soft' | 'success' | 'warning' | 'danger' }) {
  return (
    <dt className="mb-1 flex items-center gap-2.5">
      <IconTile icon={icon} size="sm" tone={tone} />
      <span className={sectionLabel}>{children}</span>
    </dt>
  );
}

/**
 * Resumen en tres tarjetas blancas (ADR 0010, «Ventanas como ReactiLab»): Existencia, Mínimo y
 * Caducidad; en el móvil, una por fila. La existencia lleva la barra de nivel (el saldo frente a lo
 * inicial de los frascos con saldo, solo cuando todos ya se conocen); la caducidad dice su estado con
 * texto y color, y la próxima fecha exacta cuando la ficha conoce todos los frascos.
 */
export function ProductSummary({
  product,
  canManage,
  stockPercent,
  expiry,
  onAction,
}: {
  product: ProductDetail;
  canManage: boolean;
  /** Nivel de la existencia frente a lo inicial; `null` si falta algún dato para afirmarlo. */
  stockPercent: number | null;
  /** Fechas de los frascos; `null` si faltan frascos por cargar y no se puede afirmar la próxima. */
  expiry: ExpiryDates | null;
  onAction: (request: SheetRequest) => void;
}) {
  const noStock = product.balance === '0';
  const expired = product.expiredContainers;
  const expiring = product.expiringContainers;
  const state = expired ? 'Vencidos' : expiring ? 'Por vencer' : 'Al día';
  const stateTone = expired ? 'danger' : expiring ? 'warning' : 'success';
  const stateColor = expired ? 'text-danger' : expiring ? 'text-warning' : 'text-success';
  const nextDate = expiry?.upcoming
    ? `Próxima: ${formatDate(expiry.upcoming)}`
    : expiry?.oldestExpired
      ? `Venció: ${formatDate(expiry.oldestExpired)}`
      : null;
  return (
    <dl className="grid gap-4 md:grid-cols-3">
      <div className={summaryCard}>
        <CardLabel icon={Package}>Existencia</CardLabel>
        <dd>
          <Quantity
            value={product.balance}
            unit={product.baseUnit}
            className={cn('text-4xl font-bold leading-none tracking-tight', noStock ? 'text-ink-subtle' : 'text-action')}
          />
        </dd>
        {stockPercent !== null && !noStock ? (
          <dd className="mt-1">
            <StockLevelBar percent={stockPercent} hasStock label={`Nivel de la existencia: ${stockPercent} % de lo inicial`} />
          </dd>
        ) : null}
        <dd className="flex justify-between gap-2 text-sm text-ink-muted">
          <span>
            {noStock
              ? 'Sin existencias'
              : product.containersWithStock === 1
                ? 'en 1 frasco'
                : `en ${product.containersWithStock} frascos`}
          </span>
          {stockPercent !== null && !noStock ? <span className="font-semibold tabular-nums">{stockPercent} %</span> : null}
        </dd>
      </div>
      {/* Mínimo para todo el espacio (ADR 0012, 05-10-2026): lo fija quien administra el catálogo. */}
      <div className={summaryCard}>
        <CardLabel icon={TrendingDown} tone={product.belowMinimum ? 'warning' : 'soft'}>
          Mínimo
        </CardLabel>
        <dd className="text-3xl font-bold leading-none tracking-tight text-ink">
          {product.minimum ? (
            <Quantity value={product.minimum} unit={product.baseUnit} />
          ) : (
            <span className="text-2xl text-ink-muted">Sin fijar</span>
          )}
        </dd>
        {product.belowMinimum ? (
          <dd className="flex items-center gap-1.5 text-sm font-semibold text-warning">
            <TrendingDown className="size-4" aria-hidden />
            Bajo mínimo
          </dd>
        ) : null}
        {canManage ? (
          <dd className="mt-auto pt-1">
            <button
              type="button"
              className="-ml-1 inline-flex min-h-8 items-center gap-1 rounded-control px-1 text-sm font-medium text-action hover:text-action-hover"
              onClick={() => onAction({ kind: 'minimum', productId: product.id })}
            >
              {product.minimum ? 'Cambiar mínimo' : 'Fijar mínimo'}
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </dd>
        ) : null}
      </div>
      {/* Solo afirma lo que se cuenta: un frasco sin caducidad confirmada lo dice en su tarjeta. */}
      <div className={summaryCard}>
        <CardLabel icon={expired ? CalendarX : expiring ? CalendarClock : CalendarCheck} tone={stateTone}>
          Caducidad
        </CardLabel>
        <dd className={cn('text-3xl font-bold leading-none tracking-tight', stateColor)}>{state}</dd>
        {expired || expiring ? (
          <dd className="grid gap-0.5 text-sm text-ink-muted">
            {expired ? <span>{expired === 1 ? '1 frasco vencido' : `${expired} frascos vencidos`}</span> : null}
            {expiring ? <span>{expiring === 1 ? '1 frasco por vencer' : `${expiring} frascos por vencer`}</span> : null}
          </dd>
        ) : (
          <dd className="text-sm text-ink-muted">Sin vencidos ni por vencer</dd>
        )}
        {nextDate ? <dd className="text-sm font-semibold tabular-nums text-ink">{nextDate}</dd> : null}
      </div>
    </dl>
  );
}
