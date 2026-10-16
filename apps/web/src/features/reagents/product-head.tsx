import type { ProductDetail } from '@platlab/contracts';
import { Button, IconTile, Quantity, StockLevelBar, Tooltip, cn, formatDecimal } from '@platlab/ui';
import { ArrowUpFromLine, CalendarCheck, CalendarClock, CalendarX, FlaskConical, Package, PackagePlus, PencilLine, QrCode, ScanLine, TrendingDown } from 'lucide-react';
import { formatDate } from '../../app/format';
import { type Allowed, type ReagentsContext, type SheetRequest } from './context';
import { ControlledMark } from './controlled';
import { HazardGlyphs } from './hazards';
import { InfoPill } from '../../app/pills';
import { physicalStateIcon, physicalStateLabel } from './product-parts';
import { SdsReference } from './sds';
import { glassCard, iconAction, primaryAction } from '../../app/glass';
import { RefreshButton } from '../../app/refresh-button';
import { RowLabel, SummaryCard } from '../../app/summary-card';

/** El id de «Etiquetas QR»: la ficha le devuelve el foco al cerrar el modo. */
export const labelsButtonId = 'etiquetas-qr';

/**
 * Cabecera de la ficha: el cuadro del módulo y el nombre, con el lápiz «Editar ficha» a su lado (solo icono, con
 * `catalog.manage`) y ⟳ «Actualizar» (`RefreshButton`); la identidad en pastillas (código, CAS, estado, «Controlado»); los pictogramas; y las acciones,
 * con «Registrar salida» como la primaria y, debajo, una fila de tres botones redondos solo icono, con tooltip: «Ingresar frascos», «Etiquetas QR»
 * (gira las tarjetas de los frascos) y «Escanear» (abre la hoja del lector). «Ajustar» ya no está aquí: vive en la ficha ⚖ de cada frasco (ADR 0015,
 * 14-10-2026).
 */
export function ProductHeader({
  product,
  allowed,
  canIssue,
  freshness,
  labels,
  onAction,
}: {
  product: ProductDetail;
  allowed: Allowed;
  canIssue: boolean;
  freshness: ReagentsContext['freshness'];
  /** El modo de etiquetas vive en la página (las tarjetas giran allí); el botón solo lo activa. */
  labels: { active: boolean; onToggle: () => void };
  onAction: (request: SheetRequest) => void;
}) {
  const state = product.physicalState ?? undefined;
  const StateIcon = (state && physicalStateIcon[state]) || FlaskConical;
  const showIssue = allowed.issue && canIssue;
  const showLabels = product.containersWithStock > 0;
  return (
    <div className={cn(glassCard, 'p-5 md:p-6')}>
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
              <RefreshButton freshness={freshness} />
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
              <SdsReference kind={product.sdsKind} url={product.sdsFileUrl ?? product.sdsUrl} />
              {product.density ? <span className="tabular-nums">Densidad {formatDecimal(product.density)} g/mL</span> : null}
            </div>
          </div>
        </div>
        <div className="grid shrink-0 gap-3 lg:w-64">
          {showIssue ? (
            <Button
              variant="primary"
              className={primaryAction}
              onClick={() => onAction({ kind: 'issue', productId: product.id })}
            >
              <ArrowUpFromLine aria-hidden />
              {allowed.approve ? 'Registrar salida' : 'Solicitar salida'}
            </Button>
          ) : null}
          {/* Tres botones solo icono: cada uno dice su nombre con `aria-label` y lo muestra en un tooltip. */}
          <div className="flex flex-wrap gap-2">
            {allowed.receipt ? (
              <Tooltip label="Ingresar frascos">
                <Button size="icon" className={iconAction} aria-label="Ingresar frascos" onClick={() => onAction({ kind: 'ingress', productId: product.id })}>
                  <PackagePlus aria-hidden />
                </Button>
              </Tooltip>
            ) : null}
            {showLabels ? (
              <Tooltip label="Etiquetas QR">
                <Button id={labelsButtonId} size="icon" className={iconAction} aria-label="Etiquetas QR" aria-pressed={labels.active} onClick={labels.onToggle}>
                  <QrCode aria-hidden />
                </Button>
              </Tooltip>
            ) : null}
            {/* Lee la etiqueta QR de otro frasco: abre la misma hoja que la cabecera de la sección (14-10-2026). */}
            <Tooltip label="Escanear">
              <Button size="icon" className={iconAction} aria-label="Escanear" onClick={() => onAction({ kind: 'scan' })}>
                <ScanLine aria-hidden />
              </Button>
            </Tooltip>
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
