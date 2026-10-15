import type { ProductDetail } from '@platlab/contracts';
import type { ReactNode } from 'react';
import { Button, IconTile, Quantity, StockLevelBar, cn, formatDecimal } from '@platlab/ui';
import { ArrowUpFromLine, CalendarCheck, CalendarClock, CalendarX, ExternalLink, FlaskConical, Package, PackagePlus, PencilLine, QrCode, RefreshCw, ScanLine, TrendingDown, type LucideIcon } from 'lucide-react';
import { createPortal } from 'react-dom';
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
 * el resumen es un panel blanco y los frascos, translúcidos sin desenfoque, para que el desplazamiento
 * sea fluido.
 */
const glassCard =
  'rounded-[28px] border border-white/70 bg-white/70 shadow-raised backdrop-blur-xl backdrop-saturate-150 not-supports-[backdrop-filter]:bg-surface';

/** Pastilla clara de las acciones secundarias de la cabecera: icono y texto, 36 px; marcada, relleno suave. */
const pillAction =
  'h-9 rounded-full border-line-strong bg-white/80 px-3.5 text-[13px] font-semibold text-action hover:bg-white aria-pressed:border-action/40 aria-pressed:bg-action-soft [&_svg]:size-4';

/** El id de «Etiquetas QR»: la ficha le devuelve el foco al cerrar el modo. */
export const labelsButtonId = 'etiquetas-qr';

/**
 * «Actualizado hace N min» y ⟳ (ADR 0015, 14-10-2026): gris de 12 px en la barra superior del shell, junto a la miga
 * de pan, y solo mientras la ficha está en pantalla. Se dibuja en el hueco del shell (`slot`) con un portal; hasta
 * que el hueco existe, no se dibuja. La frescura es la que ya da el contexto: lo más antiguo de lo que la ficha muestra.
 */
function FreshnessBar({ freshness, slot }: { freshness: ReagentsContext['freshness']; slot: HTMLElement | null }) {
  const now = useNow(15_000);
  if (!slot) return null;
  return createPortal(
    <div className="flex min-w-0 items-center gap-0.5 text-xs text-ink-muted md:ml-3 md:border-l md:border-line md:pl-3">
      <span className="truncate tabular-nums">
        {freshness.refreshing ? 'Actualizando…' : freshness.updatedAt > 0 ? `Actualizado ${formatAgo(freshness.updatedAt, now)}` : 'Cargando…'}
      </span>
      <button
        type="button"
        aria-label="Actualizar"
        title="Actualizar"
        aria-busy={freshness.refreshing || undefined}
        onClick={freshness.refresh}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-action-soft hover:text-action focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action max-sm:size-10"
      >
        <RefreshCw className={cn('size-3.5', freshness.refreshing && 'motion-safe:animate-spin')} aria-hidden />
      </button>
    </div>,
    slot,
  );
}

/**
 * Cabecera de la ficha: el cuadro del módulo y el nombre, con el lápiz «Editar ficha» a su lado (solo icono, con
 * `catalog.manage`); la identidad en pastillas (código, CAS, estado, «Controlado»); los pictogramas; y las acciones,
 * con «Registrar salida» como la primaria y, debajo, una fila de pastillas claras: «Ingresar frascos», «Etiquetas QR»
 * (gira las tarjetas de los frascos) y «Escanear» (abre la hoja del lector de la cabecera de la sección). «Ajustar» ya no está aquí: vive en la ficha ⚖ de cada frasco (ADR 0015,
 * 14-10-2026). «Actualizado hace…» y ⟳ van en la barra superior de la página (`FreshnessBar`).
 */
export function ProductHeader({
  product,
  allowed,
  canIssue,
  freshness,
  topbarSlot,
  labels,
  onAction,
}: {
  product: ProductDetail;
  allowed: Allowed;
  canIssue: boolean;
  freshness: ReagentsContext['freshness'];
  /** El hueco de la barra superior donde va «Actualizado hace…». */
  topbarSlot: ReagentsContext['topbarSlot'];
  /** El modo de etiquetas vive en la página (las tarjetas giran allí); la pastilla solo lo activa. */
  labels: { active: boolean; onToggle: () => void };
  onAction: (request: SheetRequest) => void;
}) {
  const state = product.physicalState ?? undefined;
  const StateIcon = (state && physicalStateIcon[state]) || FlaskConical;
  const showIssue = allowed.issue && canIssue;
  const showLabels = product.containersWithStock > 0;
  return (
    <div className={cn(glassCard, 'p-5 md:p-6')}>
      <FreshnessBar freshness={freshness} slot={topbarSlot} />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="flex min-w-0 items-start gap-4">
          <IconTile icon={FlaskConical} size="lg" />
          <div className="grid min-w-0 gap-3">
            <div className="flex min-w-0 items-start gap-1">
              <h1 className="min-w-0 text-display text-balance break-words leading-tight text-ink">{product.name}</h1>
              {allowed.product ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Editar ficha"
                  title="Editar ficha"
                  className="-my-0.5 size-9 shrink-0 rounded-full text-ink-muted hover:text-action [&_svg]:size-[18px]"
                  onClick={() => onAction({ kind: 'product', product })}
                >
                  <PencilLine aria-hidden />
                </Button>
              ) : null}
            </div>
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
          </div>
        </div>
        <div className="grid shrink-0 gap-3 lg:w-64">
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
          <div className="flex flex-wrap gap-2">
            {allowed.receipt ? (
              <Button className={pillAction} onClick={() => onAction({ kind: 'ingress', productId: product.id })}>
                <PackagePlus aria-hidden />
                Ingresar frascos
              </Button>
            ) : null}
            {showLabels ? (
              <Button id={labelsButtonId} className={pillAction} aria-pressed={labels.active} onClick={labels.onToggle}>
                <QrCode aria-hidden />
                Etiquetas QR
              </Button>
            ) : null}
            {/* Lee la etiqueta QR de otro frasco: abre la misma hoja que la cabecera de la sección (14-10-2026). */}
            <Button className={pillAction} onClick={() => onAction({ kind: 'scan' })}>
              <ScanLine aria-hidden />
                Escanear
              </Button>
            </div>
          </div>
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

/** Color del icono del rótulo: el de su estado, o el tenue cuando no cuenta ninguno. */
const labelIconTone = { soft: 'text-ink-subtle', success: 'text-success', warning: 'text-warning', danger: 'text-danger' } as const;

/**
 * Rótulo de una tarjeta del resumen: icono de 12 px en línea y el nombre en mayúsculas de 10 px. El propio
 * `dt` los agrupa: dentro de un `dl`, un `dt` no puede ir envuelto en otro elemento (axe). En el móvil, el
 * icono va sobre el rótulo para que quepan tres columnas.
 */
function RowLabel({ children, icon: Icon, tone = 'soft' }: { children: string; icon: LucideIcon; tone?: keyof typeof labelIconTone }) {
  return (
    <dt className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase leading-none tracking-wider text-ink-muted max-sm:flex-col max-sm:items-start">
      <Icon className={cn('size-3 shrink-0', labelIconTone[tone])} aria-hidden />
      <span className="min-w-0">{children}</span>
    </dt>
  );
}

/**
 * Una tarjeta pequeña del resumen: separada de las otras (`gap-2` del `dl`), con borde suave y radio de 16 px. El
 * `div` que agrupa `dt` y `dd` es válido dentro de un `dl`.
 */
function SummaryCard({ children }: { children: ReactNode }) {
  return <div className="grid min-w-0 content-start gap-1.5 rounded-2xl border border-line/70 bg-surface p-3 shadow-raised">{children}</div>;
}

const valueClass = 'text-[18px] font-bold leading-tight tracking-tight';
const detailClass = 'text-[11px] leading-snug text-ink-muted max-sm:hidden';

/**
 * Resumen de la ficha (ADR 0010, «Ventanas como ReactiLab»; ADR 0015): tres tarjetas pequeñas y separadas,
 * Existencia, Mínimo y Caducidad, en una columna de 11 rem desde `xl`, una sobre otra; por debajo,
 * como franja de tres columnas bajo la cabecera, y en el móvil sin la línea de detalle (quedan el valor,
 * el estado y el enlace del mínimo). La existencia lleva la barra de nivel (el saldo frente a lo inicial
 * de los frascos con saldo, solo cuando todos ya se conocen); la caducidad dice su estado con texto y
 * color, y la próxima fecha exacta cuando la ficha conoce todos los frascos.
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
    <dl className="grid grid-cols-3 gap-2 xl:grid-cols-1">
      <SummaryCard>
        <RowLabel icon={Package}>Existencia</RowLabel>
        <dd>
          <Quantity
            value={product.balance}
            unit={product.baseUnit}
            className={cn(valueClass, 'block whitespace-normal [overflow-wrap:anywhere]', noStock ? 'text-ink-subtle' : 'text-action')}
            unitClassName="text-[0.8em]"
          />
        </dd>
        {stockPercent !== null && !noStock ? (
          <dd>
            <StockLevelBar percent={stockPercent} hasStock className="h-1" label={`Nivel de la existencia: ${stockPercent} % de lo inicial`} />
          </dd>
        ) : null}
        <dd className={detailClass}>
          {noStock
            ? 'Sin existencias'
            : `${product.containersWithStock === 1 ? '1 frasco' : `${product.containersWithStock} frascos`}${stockPercent !== null ? ` · ${stockPercent} %` : ''}`}
        </dd>
      </SummaryCard>
      {/* Mínimo para todo el espacio (ADR 0012, 05-10-2026): lo fija quien administra el catálogo. */}
      <SummaryCard>
        <RowLabel icon={TrendingDown} tone={product.belowMinimum ? 'warning' : 'soft'}>
          Mínimo
        </RowLabel>
        <dd className={cn(valueClass, 'text-ink [overflow-wrap:anywhere]')}>
          {product.minimum ? <Quantity value={product.minimum} unit={product.baseUnit} className="whitespace-normal" unitClassName="text-[0.8em]" /> : <span className="text-ink-muted">Sin fijar</span>}
        </dd>
        {product.belowMinimum || canManage ? (
          <dd className="flex flex-wrap items-center gap-x-2.5 text-xs leading-snug">
            {product.belowMinimum ? (
              <span className="inline-flex items-center gap-1 font-semibold text-warning">
                <TrendingDown className="size-3" aria-hidden />
                Bajo mínimo
              </span>
            ) : null}
            {canManage ? (
              <button
                type="button"
                aria-label={product.minimum ? 'Cambiar mínimo' : 'Fijar mínimo'}
                className="-ml-1 inline-flex min-h-8 items-center rounded-control px-1 font-medium text-action hover:text-action-hover"
                onClick={() => onAction({ kind: 'minimum', productId: product.id })}
              >
                {product.minimum ? 'Cambiar' : 'Fijar'}
              </button>
            ) : null}
          </dd>
        ) : null}
      </SummaryCard>
      {/* Solo afirma lo que se cuenta: un frasco sin caducidad confirmada lo dice en su tarjeta. */}
      <SummaryCard>
        <RowLabel icon={expired ? CalendarX : expiring ? CalendarClock : CalendarCheck} tone={stateTone}>
          Caducidad
        </RowLabel>
        <dd className={cn(valueClass, stateColor)}>{state}</dd>
        <dd className={cn(detailClass, 'grid gap-0.5')}>
          {expired ? <span>{expired === 1 ? '1 frasco vencido' : `${expired} frascos vencidos`}</span> : null}
          {expiring ? <span>{expiring === 1 ? '1 frasco por vencer' : `${expiring} frascos por vencer`}</span> : null}
          {!expired && !expiring ? <span>Sin vencidos ni por vencer</span> : null}
          {nextDate ? <span className="font-semibold tabular-nums text-ink">{nextDate}</span> : null}
        </dd>
      </SummaryCard>
    </dl>
  );
}
