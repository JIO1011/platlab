import type { Position } from '@platlab/contracts';
import { Band, Button, HelpTip, Quantity, StockLevelBar, cn, formatDecimal, ratioPercent } from '@platlab/ui';
import { ArrowLeftRight, ArrowUpFromLine, CalendarClock, CalendarDays, CalendarX, Check, MapPin, QrCode as QrIcon, Scale, SlidersHorizontal, Star, TriangleAlert } from 'lucide-react';
import { formatGrams, weightFigures } from './weight';
import { type ComponentProps, type CSSProperties } from 'react';
import { formatDate, formatDateTime, formatShortDate, relativeDays } from '../../app/format';
import { type Allowed, type SheetRequest } from './context';
import { ContainerLabel, type LabelProduct } from './labels';
import { availableOf, expiryOf } from './stock';

/**
 * Estados del frasco como insignias sobre el borde superior de la tarjeta (ADR 0015), en fila si coinciden:
 * «Usar primero» (éxito), «Vencido» y «Restringido» (peligro), «Apartado» y «Cuarentena» (aviso). Llevan
 * relleno sólido con texto claro; el color cuenta el estado y el texto lo dice. Con `scanned`, la primera es
 * «Desde su etiqueta». Si no caben en una línea, las siguientes suben por encima del borde.
 */
function StatusBadges({
  scanned,
  recommended,
  expired,
  reserved,
  disposition,
}: {
  scanned: boolean;
  recommended: boolean;
  expired: boolean;
  reserved: boolean;
  disposition: Position['disposition'];
}) {
  const badge = 'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-bold leading-none text-on-action shadow-sm';
  if (!scanned && !recommended && !expired && !reserved && disposition === 'usable') return null;
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-full flex translate-y-3 flex-wrap-reverse gap-1">
      {scanned ? (
        <span className={cn(badge, 'bg-action')}>
          <QrIcon className="size-3" aria-hidden />
          Desde su etiqueta
        </span>
      ) : null}
      {recommended ? (
        <span className={cn(badge, 'bg-success')}>
          <Star className="size-3 fill-current" aria-hidden />
          Usar primero
          <span className="sr-only"> (vence antes: conviene usarlo primero)</span>
        </span>
      ) : null}
      {expired ? (
        <span className={cn(badge, 'bg-danger')}>
          <TriangleAlert className="size-3" aria-hidden />
          Vencido
        </span>
      ) : null}
      {reserved ? <span className={cn(badge, 'bg-warning')}>Apartado</span> : null}
      {disposition === 'quarantine' ? <span className={cn(badge, 'bg-warning')}>Cuarentena</span> : null}
      {disposition === 'restricted' ? <span className={cn(badge, 'bg-danger')}>Restringido</span> : null}
    </div>
  );
}

/** Gramos de la tarjeta, sin el «,0» de los pesos enteros («3.109 g»): la ficha ocupa menos y la nube se lee igual. */
const shortGrams = (grams: string) => formatGrams(grams).replace(',0 g', ' g');

/**
 * El código del frasco, un botón que abre la nube «Detalles del frasco»: el lote interno, cuándo y quién lo
 * ingresó, la cantidad inicial con su unidad y, si la tiene, la densidad; con tara, también la tara y el neto. Si no cabe, se corta con puntos.
 */
function CodeButton({ position, code, timeZone }: { position: Position; code: string; timeZone: string }) {
  const { container, lot, unit } = position;
  const by = container?.receivedBy?.displayName ?? null;
  const figures = weightFigures(position);
  const term = 'text-[12px] text-white/70';
  return (
    <HelpTip
      hover
      label={`Detalles del frasco ${code}`}
      trigger={code}
      className="block min-w-0 max-w-full shrink truncate rounded-sm text-left font-mono text-[17px] font-bold leading-tight tabular-nums text-ink transition-colors hover:text-action aria-expanded:text-action"
    >
      <p className="mb-2 font-semibold">Detalles del frasco</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div className="col-span-2">
          <dt className={term}>Lote</dt>
          <dd className="font-mono font-medium tabular-nums [overflow-wrap:anywhere]">{lot.code}</dd>
        </div>
        {container ? (
          <>
            <div className="col-span-2">
              <dt className={term}>Ingresó</dt>
              <dd className="font-medium tabular-nums">
                {formatDateTime(container.receivedAt, timeZone)}
                {by ? <span className="block font-normal text-white/80">por {by}</span> : null}
              </dd>
            </div>
            <div className={container.density ? undefined : 'col-span-2'}>
              <dt className={term}>Cantidad inicial</dt>
              <dd className="font-medium tabular-nums">
                {formatDecimal(container.initialQuantity)} {unit}
              </dd>
            </div>
            {container.density ? (
              <div>
                <dt className={term}>Densidad</dt>
                <dd className="font-medium tabular-nums">{formatDecimal(container.density)} g/mL</dd>
              </div>
            ) : null}
            {figures ? (
              <>
                <div>
                  <dt className={term}>Tara</dt>
                  <dd className="font-medium tabular-nums">{shortGrams(figures.tare)}</dd>
                </div>
                <div>
                  <dt className={term}>Neto</dt>
                  <dd className="font-medium tabular-nums">{shortGrams(figures.net)}</dd>
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </dl>
    </HelpTip>
  );
}

/** Ficha pequeña de la tarjeta: píldora de borde suave que abre su nube (`HelpTip`). El tono dice el estado y el texto lo repite. */
const chipClass = (tone: 'neutral' | 'warning' | 'danger') =>
  cn(
    'inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2 text-[12px] font-medium leading-none tabular-nums transition-colors duration-150 max-sm:h-9 max-sm:text-[13px]',
    tone === 'neutral' && 'border-line bg-white/70 text-ink-muted hover:bg-white hover:text-ink aria-expanded:bg-white aria-expanded:text-ink',
    tone === 'warning' && 'border-warning/30 bg-warning-soft text-warning',
    tone === 'danger' && 'border-danger/30 bg-danger-soft text-danger',
  );

/**
 * La caducidad en una ficha: fecha corta `dd/mm/aaaa`, neutra; en ámbar a menos de 30 días (el criterio del
 * resumen y del filtro «Por vencer»), en rojo vencida, «Sin caducidad» si no la tiene. La nube dice la fecha
 * larga y cuánto falta.
 */
function ExpiryChip({ expiresOn, today }: { expiresOn: string | null; today: string }) {
  const state = expiryOf(expiresOn, today);
  if (expiresOn === null) {
    return (
      <HelpTip
        hover
        label="Sin caducidad registrada"
        trigger={
          <>
            <CalendarDays className="size-3.5 shrink-0" aria-hidden />
            Sin caducidad
          </>
        }
        className={chipClass('neutral')}
      >
        Este frasco no tiene fecha de caducidad registrada.
      </HelpTip>
    );
  }
  const Icon = state === 'expired' ? CalendarX : state === 'soon' ? CalendarClock : CalendarDays;
  const short = formatShortDate(expiresOn);
  return (
    <HelpTip
      hover
      label={`Caducidad ${short}${state === 'expired' ? ', vencido' : state === 'soon' ? ', vence pronto' : ''}`}
      trigger={
        <>
          <Icon className="size-3.5 shrink-0" aria-hidden />
          {short}
        </>
      }
      className={chipClass(state === 'expired' ? 'danger' : state === 'soon' ? 'warning' : 'neutral')}
    >
      {state === 'expired' ? 'Venció' : 'Vence'} el {formatDate(expiresOn)} · {relativeDays(expiresOn, today)}
    </HelpTip>
  );
}

/**
 * La ficha ⚖, solo con tara (ADR 0015, «Ajuste del mismo día»): el peso bruto que debe marcar la balanza
 * (tara + contenido). Su nube dice cómo comprobarlo y, para quien ajusta, ofrece «Corregir con la balanza»,
 * que abre Ajustar en modo balanza. Los pesos no son cantidades de inventario: son vista previa del servidor.
 */
function WeightChip({ figures, onCorrect }: { figures: NonNullable<ReturnType<typeof weightFigures>>; onCorrect: (() => void) | null }) {
  const gross = shortGrams(figures.expectedGross);
  return (
    <HelpTip
      hover
      label={`Debe pesar ${gross}`}
      trigger={
        <>
          <Scale className="size-3.5 shrink-0" aria-hidden />
          Debe pesar {gross}
        </>
      }
      className={chipClass('neutral')}
    >
      {(close) => (
        <div className="grid gap-2">
          <p>
            Pon el frasco cerrado en la balanza: debería marcar <span className="font-semibold tabular-nums">{gross}</span>. ¿Marca otra cosa?
          </p>
          {onCorrect ? (
            <button
              type="button"
              onClick={() => {
                close();
                onCorrect();
              }}
              className="inline-flex h-8 items-center justify-center rounded-lg bg-white px-3 text-[13px] font-semibold text-ink transition-colors hover:bg-action-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white max-sm:h-10"
            >
              Corregir con la balanza
            </button>
          ) : null}
        </div>
      )}
    </HelpTip>
  );
}

/**
 * La ubicación como una dirección, en dos líneas de altura fija (las tarjetas de una fila se alinean): con el
 * pin, la sala (el primer nivel del camino) en el color del texto; debajo, en gris, los niveles siguientes
 * unidos por « · ». Con un solo nivel, la segunda línea queda vacía. Cada línea se corta con puntos y su título
 * dice la ruta completa. Sin camino, el nombre de la ubicación.
 */
function Place({ path, name }: { path: string[]; name: string }) {
  const levels = path.length > 0 ? path : [name];
  const [room, ...rest] = levels;
  const full = levels.join(' › ');
  return (
    <div className="grid gap-0.5">
      <p title={full} className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium leading-5 text-ink">
        <MapPin className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
        <span className="truncate">{room}</span>
      </p>
      <p title={rest.length > 0 ? full : undefined} className="h-4 truncate pl-5 text-[12px] leading-4 text-ink-muted">
        {rest.join(' · ')}
      </p>
    </div>
  );
}

/**
 * Un frasco en la ficha (ADR 0012; ADR 0010, «Ventanas como ReactiLab»): translúcido sin desenfoque
 * (`bg-white/80`, borde suave, radio de 24 px) y compacto: caben tres por fila junto al resumen lateral.
 * Los estados son insignias sobre el borde superior («Usar primero», «Vencido», «Apartado», «Cuarentena»,
 * «Restringido»). De arriba abajo: el código mono en negrita de 17 px, un botón que abre «Detalles del
 * frasco»; una línea gris con la marca y el área; el saldo de 26 px con su unidad y el % a la derecha, y la
 * barra por nivel; la ubicación en dos líneas (la sala y, en gris, el resto del camino); dos fichas, la
 * caducidad corta (ámbar o roja según el estado) y, con tara, «Debe pesar N g», cada una con su nube; y, tras
 * una línea de borde a borde, «Salida», «Ajustar» y «Trasladar». El color solo cuenta un estado y siempre
 * con texto.
 *
 * Con el modo de etiquetas el artículo gira 180° y muestra su reverso: la etiqueta impresa, y la tarjeta
 * entera es una casilla para elegirla (unos 300 ms, escalonado; con movimiento reducido, un fundido).
 */
export function ContainerCard({
  position,
  today,
  allowed,
  recommended,
  scanned = false,
  timeZone,
  labels,
  onAction,
}: {
  position: Position;
  today: string;
  /** Zona del espacio: la fecha de ingreso de «Detalles del frasco» se escribe en ella. */
  timeZone: string;
  allowed: Allowed;
  recommended: boolean;
  /** Se llegó a la ficha desde la etiqueta QR de este frasco (ADR 0012, entrega 4). */
  scanned?: boolean;
  /** Modo de etiquetas: `flipped` muestra el reverso; el reverso se monta solo tras usarlo una vez. */
  labels?: { product: LabelProduct; url: string; flipped: boolean; picked: boolean; order: number; onPick: () => void } | undefined;
  onAction: (request: SheetRequest) => void;
}) {
  const initial = position.container?.initialQuantity ?? null;
  const percent = initial ? ratioPercent(position.balance, initial) : null;
  const empty = position.balance === '0';
  const { expiresOn } = position.lot;
  const expired = expiryOf(expiresOn, today) === 'expired';
  // Lo apartado por solicitudes no se puede sacar (ADR 0012); con todo apartado, no hay «Salida».
  const reserved = position.reserved !== '0';
  const available = availableOf(position);
  // Con saldo pero menos del 1 %, se dice y se ve: un frasco casi vacío no es un frasco vacío.
  const percentText = percent === 0 && !empty ? '<1 %' : `${percent ?? 0} %`;
  // Un frasco en cuarentena o restringido no sale (ADR 0012); la API también lo rechaza.
  const canIssue = allowed.issue && available !== '0' && position.disposition === 'usable';
  // Se traslada el frasco entero; con salidas pendientes, primero se resuelven (ADR 0012, entrega 4).
  const canTransfer = allowed.transfer && !empty && !reserved;
  const origin = [position.lot.brand, position.lot.area].filter(Boolean).join(' · ');
  const code = position.container?.code ?? position.lot.code;
  const figures = weightFigures(position);
  const flipped = labels?.flipped === true;
  // «Ajustar» abre una sola ventana; el frasco decide el método (balanza si tiene tara, cantidad si no).
  const canAdjust = allowed.adjustment;
  return (
    <article
      id={position.container ? `frasco-${position.container.id}` : undefined}
      aria-current={scanned ? 'true' : undefined}
      style={{ '--flip-delay': `${Math.min(labels?.order ?? 0, 12) * 40}ms` } as CSSProperties}
      className={cn(
        // El giro: 300 ms con la curva de salida del sistema. Con movimiento reducido no hay giro: las caras se funden.
        'relative h-full [transform-style:preserve-3d] [transform:perspective(1100px)_rotateY(0deg)] [transition-delay:var(--flip-delay)] motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out-expo',
        flipped && '[transform:perspective(1100px)_rotateY(180deg)]',
        'motion-reduce:[transform:none] motion-reduce:[transform-style:flat]',
        scanned && 'scroll-mt-24',
      )}
    >
      <div
        inert={flipped}
        aria-hidden={flipped || undefined}
        className={cn(
          // Translúcido y sin desenfoque; el color solo cuenta un estado y siempre con texto (ADR 0010).
          'group relative flex h-full flex-col gap-3 rounded-3xl border border-white/80 bg-white/80 p-4 shadow-raised [backface-visibility:hidden] transition-[translate,box-shadow] duration-200 ease-out-expo hover:shadow-float motion-safe:hover:-translate-y-0.5',
          'motion-reduce:transition-opacity motion-reduce:duration-300 motion-reduce:[transition-delay:var(--flip-delay)]',
          flipped && 'motion-reduce:opacity-0',
          scanned && 'ring-2 ring-action',
          !scanned && recommended && 'ring-2 ring-success/50',
          !scanned && !recommended && expired && 'ring-1 ring-danger/40',
        )}
      >
        <StatusBadges scanned={scanned} recommended={recommended} expired={expired} reserved={reserved} disposition={position.disposition} />
        <div className="-mb-1 grid gap-0.5">
          {/* El código es la identidad de la etiqueta: si no cabe, se corta con puntos y el título lo dice entero. */}
          <h3 title={code} className="flex min-w-0">
            <CodeButton position={position} code={code} timeZone={timeZone} />
          </h3>
          {/* Siempre mide una línea: el saldo de todas las tarjetas de una fila cae a la misma altura. */}
          <p title={origin || undefined} className="h-4 truncate text-[12px] leading-4 text-ink-subtle">
            {origin}
          </p>
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="flex min-w-0 items-baseline gap-1.5">
              <span className={cn('text-[26px] font-bold leading-none tracking-tight tabular-nums', empty ? 'text-ink-subtle' : 'text-action')}>
                {formatDecimal(position.balance)}
              </span>
              <span className="text-sm text-ink-muted">{position.unit}</span>
            </p>
            {percent !== null && initial ? <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-muted">{percentText}</span> : null}
          </div>
          {percent !== null && initial ? (
            <StockLevelBar
              percent={percent}
              hasStock={!empty}
              className="h-1.5"
              label={`Queda ${percentText === '<1 %' ? 'menos del 1 %' : `el ${percentText}`} de lo que entró`}
            />
          ) : null}
          {reserved ? (
            <p className="text-[12px] text-ink-muted">
              Apartado <Quantity value={position.reserved} unit={position.unit} className="font-bold text-ink" unitClassName="text-inherit" /> · Disponible{' '}
              <Quantity value={available} unit={position.unit} className="font-bold text-ink" unitClassName="text-inherit" />
            </p>
          ) : null}
        </div>
        <Place path={position.location.path} name={position.location.name} />
        {/* El lote interno ya es el prefijo del código del frasco: no se repite. */}
        <div className="flex flex-wrap gap-1.5">
          <ExpiryChip expiresOn={expiresOn} today={today} />
          {figures ? (
            <WeightChip
              figures={figures}
              onCorrect={canAdjust ? () => onAction({ kind: 'adjustment', positionId: position.id, mode: 'weight' }) : null}
            />
          ) : null}
        </div>
        {canIssue || canAdjust || canTransfer ? (
          // Banda inferior de borde a borde: «Salida» es la primaria; «Ajustar» y «Trasladar» son botones propios.
          <Band ruled className="-mx-4 -mb-1 mt-auto flex items-center gap-1.5 px-4 pt-3">
            {canIssue ? (
              // Relleno solo el frasco que conviene usar primero: la acción primaria de la ficha es una.
              <Button
                size="sm"
                variant={recommended ? 'primary' : 'secondary'}
                className={cn('h-10 min-w-0 flex-1 rounded-xl px-2.5 font-bold', !recommended && 'border-action/30 bg-white/70 text-action hover:bg-action-soft')}
                onClick={() => onAction({ kind: 'issue', positionId: position.id })}
              >
                <ArrowUpFromLine aria-hidden />
                {/* Quien no aprueba pide la salida: la tarjeta no promete una acción inmediata (ADR 0012). */}
                {allowed.approve ? 'Salida' : 'Solicitar salida'}
              </Button>
            ) : null}
            {canAdjust ? (
              <Button
                size="sm"
                variant="secondary"
                className={cn('h-10 shrink-0 rounded-xl border-line-strong bg-white/70 px-2.5 font-semibold text-ink-muted hover:bg-white hover:text-ink', !canIssue && 'ml-auto')}
                onClick={() => onAction({ kind: 'adjustment', positionId: position.id })}
              >
                <SlidersHorizontal aria-hidden />
                Ajustar
              </Button>
            ) : null}
            {canTransfer ? (
              <Button
                size="icon"
                variant="secondary"
                aria-label={`Trasladar ${code}`}
                title="Trasladar"
                className={cn('size-10 rounded-xl border-line-strong bg-white/70 text-ink-muted hover:bg-white hover:text-ink', !canIssue && !canAdjust && 'ml-auto')}
                onClick={() => onAction({ kind: 'transfer', position })}
              >
                <ArrowLeftRight aria-hidden />
              </Button>
            ) : null}
          </Band>
        ) : null}
      </div>
      {labels ? <LabelFace code={code} position={position} labels={labels} /> : null}
    </article>
  );
}

/**
 * Reverso del frasco: la etiqueta impresa (la misma de la hoja A4) y, en toda la tarjeta, una casilla para
 * elegirla. La marca y «Se imprime» / «No se imprime» dicen el estado con texto, no solo con el anillo.
 */
function LabelFace({ code, position, labels }: { code: string; position: Position; labels: NonNullable<ComponentProps<typeof ContainerCard>['labels']> }) {
  const { flipped, picked, product, url, onPick } = labels;
  return (
    <div
      role="checkbox"
      aria-checked={picked}
      aria-label={`Etiqueta del frasco ${code}`}
      tabIndex={flipped ? 0 : -1}
      inert={!flipped}
      aria-hidden={!flipped || undefined}
      onClick={onPick}
      onKeyDown={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          onPick();
        }
      }}
      className={cn(
        'absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border bg-white p-4 shadow-raised [backface-visibility:hidden] [transform:rotateY(180deg)] transition-shadow duration-200 hover:shadow-float',
        'motion-reduce:opacity-0 motion-reduce:transition-opacity motion-reduce:duration-300 motion-reduce:[transform:none] motion-reduce:[transition-delay:var(--flip-delay)]',
        flipped && 'motion-reduce:opacity-100',
        picked ? 'border-action ring-2 ring-action' : 'border-white/80',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute right-4 top-4 inline-flex size-6 items-center justify-center rounded-md border-2 transition-colors',
          picked ? 'border-action bg-action text-on-action' : 'border-line-strong bg-white',
        )}
      >
        {picked ? <Check className="size-4" strokeWidth={3} /> : null}
      </span>
      <ContainerLabel position={position} product={product} url={url} />
      <p className={cn('text-sm font-semibold', picked ? 'text-action' : 'text-ink-muted')}>{picked ? 'Se imprime' : 'No se imprime'}</p>
    </div>
  );
}
