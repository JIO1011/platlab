import type { Position } from '@platlab/contracts';
import { Band, Button, HelpTip, Quantity, StockLevelBar, cn, formatDecimal, ratioPercent } from '@platlab/ui';
import { ArrowLeftRight, ArrowUpFromLine, CalendarClock, CalendarDays, CalendarX, Check, FlaskConical, MapPin, QrCode as QrIcon, Scale, Star, TriangleAlert } from 'lucide-react';
import { formatGrams, gramsPerUnit, weightFigures } from './weight';
import { type ComponentProps, type CSSProperties } from 'react';
import { formatDate, formatDateTime, formatShortDate, relativeDays } from '../../app/format';
import { ModuleMark } from '../../app/module-mark';
import { type Allowed, type SheetRequest } from './context';
import { ContainerLabel, type LabelProduct } from './labels';
import { physicalStateIcon } from './product-parts';
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
 * El código del frasco, un botón que abre la nube «Detalles del frasco»: cuándo y quién lo ingresó, la cantidad inicial con su unidad y, si la tiene, la densidad; con tara, también la tara y el neto. Si no cabe, se corta con puntos.
 */
function CodeButton({ position, code, timeZone }: { position: Position; code: string; timeZone: string }) {
  const { container, unit } = position;
  const by = container?.receivedBy?.displayName ?? null;
  const figures = weightFigures(position);
  const term = 'text-[12px] text-white/70';
  return (
    <HelpTip
      hover
      label={`Detalles del frasco ${code}`}
      trigger={code}
      className="block min-w-0 max-w-full shrink truncate rounded-sm text-center font-mono text-[17px] font-bold leading-tight tabular-nums text-ink transition-colors hover:text-action aria-expanded:text-action"
    >
      <p className="mb-2 font-semibold">Detalles del frasco</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
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

/** Ficha pequeña de la tarjeta: insignia de relleno suave, como las del nivel 1, que abre su nube (`HelpTip`). El tono dice el estado y el texto lo repite. */
const chipClass = (tone: 'neutral' | 'warning' | 'danger') =>
  cn(
    'inline-flex h-6 max-w-full items-center gap-1 whitespace-nowrap rounded-full px-2 text-[11px] font-medium leading-none tabular-nums transition-colors duration-150 max-sm:h-9 max-sm:text-[13px]',
    tone === 'neutral' && 'bg-surface-sunken text-ink-muted hover:bg-line hover:text-ink aria-expanded:bg-line aria-expanded:text-ink',
    tone === 'warning' && 'bg-warning-soft text-warning',
    tone === 'danger' && 'bg-danger-soft text-danger',
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
            <CalendarDays className="size-3 shrink-0" aria-hidden />
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
          <Icon className="size-3 shrink-0" aria-hidden />
          {short}
        </>
      }
      className={chipClass(state === 'expired' ? 'danger' : state === 'soon' ? 'warning' : 'neutral')}
    >
      {state === 'expired' ? 'Venció' : 'Vence'} el {formatDate(expiresOn)} · {relativeDays(expiresOn, today)}
    </HelpTip>
  );
}

/** Botón de la nube oscura (`HelpTip`): relleno blanco, para la acción que el globo ofrece. */
const tipAction =
  'inline-flex h-8 items-center justify-center rounded-lg bg-white px-3 text-[13px] font-semibold text-ink transition-colors hover:bg-action-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white max-sm:h-10';
/** Enlace de la nube oscura: la salida alternativa, subrayada y sin relleno. */
const tipLink =
  'inline-flex h-8 items-center justify-self-start rounded-sm text-[13px] font-medium text-white underline underline-offset-4 decoration-white/50 transition-colors hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white max-sm:h-10';

/**
 * La ficha ⚖ de todos los frascos para quien ajusta (ADR 0015, 14-10-2026). Con tara, «Debe pesar N g» (tara +
 * contenido): su nube dice cómo comprobarlo y trae «Corregir con la balanza» (Ajustar en modo balanza) y el
 * enlace «Escribir la cantidad» (Ajustar en modo cantidad). Sin tara, «Sin pesar» (gris, borde punteado): la nube
 * dice que el frasco no tiene peso de referencia y trae «Pesar ahora» (Ajustar con la balanza por activar) y el
 * mismo enlace. Sin permiso de ajuste, solo la ficha con tara, como información. Los pesos no son cantidades de
 * inventario: son vista previa del servidor.
 */
function WeightChip({
  figures,
  adjust,
}: {
  figures: ReturnType<typeof weightFigures>;
  /** Quien puede ajustar: abre Ajustar en el modo que se pida. `null` si no puede. */
  adjust: ((mode: 'weight' | 'quantity') => void) | null;
}) {
  const gross = figures ? shortGrams(figures.expectedGross) : null;
  return (
    <HelpTip
      hover
      label={gross ? `Debe pesar ${gross}` : 'Sin pesar'}
      trigger={
        <>
          <Scale className="size-3 shrink-0" aria-hidden />
          {gross ? `Debe pesar ${gross}` : 'Sin pesar'}
        </>
      }
      className={cn(chipClass('neutral'), !gross && 'border border-dashed border-line-strong bg-transparent')}
    >
      {(close) => {
        const run = (mode: 'weight' | 'quantity') => () => {
          close();
          adjust?.(mode);
        };
        return (
          <div className="grid gap-2">
            {gross ? (
              <p>
                Pon el frasco cerrado en la balanza: debería marcar <span className="font-semibold tabular-nums">{gross}</span>. ¿Marca otra cosa?
              </p>
            ) : (
              <p>Este frasco no tiene peso de referencia. Pésalo una vez para comprobarlo con la balanza.</p>
            )}
            {adjust ? (
              <>
                <button type="button" onClick={run('weight')} className={tipAction}>
                  {gross ? 'Corregir con la balanza' : 'Pesar ahora'}
                </button>
                <button type="button" onClick={run('quantity')} className={tipLink}>
                  Escribir la cantidad
                </button>
              </>
            ) : null}
          </div>
        );
      }}
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
      <p title={full} className="flex min-w-0 items-center justify-center gap-1.5 text-[13px] font-medium leading-5 text-ink">
        <MapPin className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
        <span className="truncate">{room}</span>
      </p>
      <p title={rest.length > 0 ? full : undefined} className="h-4 truncate text-center text-[12px] leading-4 text-ink-muted">
        {rest.join(' · ')}
      </p>
    </div>
  );
}

/**
 * Un frasco en la ficha (ADR 0012; ADR 0010, «Ventanas como ReactiLab»): el mismo lenguaje que la tarjeta del
 * reactivo en el Inventario (14-10-2026): radio de 20 px, `bg-surface`, `p-4`, el matraz del módulo de marca
 * de agua y todo el contenido centrado. Caben tres por fila junto al resumen lateral. Los estados son
 * insignias sobre el borde superior («Usar primero», «Vencido», «Apartado», «Cuarentena», «Restringido»).
 * De arriba abajo: el código mono en negrita de 17 px, un botón que abre «Detalles del frasco», con el icono
 * del estado físico del reactivo en línea a su izquierda; una línea gris con la marca y el área; tras una línea, «Saldo» y la
 * cantidad de 22 px con su unidad y el %, y la barra por nivel a todo el ancho; la ubicación en dos líneas (la
 * sala y, en gris, el resto del camino); una fila de fichas, la caducidad corta (ámbar o roja según el estado)
 * y la ficha ⚖ («Debe pesar N g» con tara; «Sin pesar» sin ella, solo para quien ajusta), cada una con su nube; y, tras una línea de borde a borde, «Salida»,
 * «Ajustar» y «Trasladar». El color solo cuenta un estado y siempre con texto.
 *
 * Con el modo de etiquetas el artículo gira 180° y muestra su reverso: la etiqueta impresa, y la tarjeta
 * entera es una casilla para elegirla (unos 300 ms, escalonado; con movimiento reducido, un fundido).
 */
export function ContainerCard({
  position,
  physicalState,
  today,
  allowed,
  recommended,
  scanned = false,
  timeZone,
  labels,
  onAction,
}: {
  position: Position;
  /** Estado físico del reactivo: su icono va junto al código. */
  physicalState?: string | null | undefined;
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
  const StateIcon = (physicalState && physicalStateIcon[physicalState]) || FlaskConical;
  // La ficha ⚖ (ADR 0015, 14-10-2026): con tara la ve todo el mundo; sin tara («Sin pesar»), solo quien ajusta, y
  // solo si el frasco se puede pesar (g, kg, mL o L) y tiene saldo. Ajustar abre con el frasco y el modo elegidos.
  const adjust = allowed.adjustment ? (mode: 'weight' | 'quantity') => onAction({ kind: 'adjustment', positionId: position.id, mode }) : null;
  const weighable = position.container !== null && gramsPerUnit(position.unit, '1') !== null;
  const showWeight = figures !== null || (adjust !== null && weighable && !empty);
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
          // El lenguaje de la tarjeta del Inventario; el color solo cuenta un estado y siempre con texto (ADR 0010).
          'group relative flex h-full flex-col gap-2.5 rounded-[20px] bg-surface p-4 shadow-raised [backface-visibility:hidden] transition-[translate,box-shadow] duration-200 ease-out-expo hover:shadow-float motion-safe:hover:-translate-y-1',
          'motion-reduce:transition-opacity motion-reduce:duration-300 motion-reduce:[transition-delay:var(--flip-delay)]',
          flipped && 'motion-reduce:opacity-0',
          scanned && 'ring-2 ring-action',
          !scanned && recommended && 'ring-2 ring-success/50',
          !scanned && !recommended && expired && 'ring-1 ring-danger/40',
        )}
      >
        <StatusBadges scanned={scanned} recommended={recommended} expired={expired} reserved={reserved} disposition={position.disposition} />
        {/* Marca de agua: decorativa y casi invisible. Su propio recorte, para que los estados salgan por el borde. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[20px]">
          <ModuleMark
            code="reagents"
            className="absolute -bottom-4 -right-3 size-24 rotate-12 text-surface-sunken transition-[color,transform] duration-500 group-hover:text-action-soft motion-safe:group-hover:scale-110"
          />
        </div>
        <div className="relative grid gap-1 text-center">
          {/* El estado físico va en línea, a la izquierda del código (misma fila, centrada). El código es la identidad de la etiqueta: si no cabe, se corta con puntos y el título lo dice entero. */}
          <h3 title={code} className="flex min-w-0 items-center justify-center gap-2">
            <StateIcon aria-hidden className={cn('size-5 shrink-0', empty ? 'text-ink-subtle' : 'text-action')} />
            <CodeButton position={position} code={code} timeZone={timeZone} />
          </h3>
          {/* Siempre mide una línea: el saldo de todas las tarjetas de una fila cae a la misma altura. */}
          <p title={origin || undefined} className="h-4 truncate text-[12px] leading-4 text-ink-muted">
            {origin}
          </p>
        </div>
        <div className="relative grid gap-2 border-t border-line pt-2.5">
          {/* Saldo al centro, como «Total» del Inventario: rótulo, cantidad con su unidad y el %, y la barra a todo el ancho. */}
          <div className="grid min-w-0 justify-items-center gap-1">
            <p className="text-[11px] font-semibold uppercase leading-5 tracking-wide text-ink-muted">Saldo</p>
            <p className="flex min-w-0 flex-wrap items-baseline justify-center gap-x-2">
              <Quantity
                value={position.balance}
                unit={position.unit}
                className={cn('block min-w-0 whitespace-normal text-[22px] font-bold leading-tight tracking-tight [overflow-wrap:anywhere]', empty ? 'text-ink-subtle' : 'text-action')}
                unitClassName="text-[0.7em]"
              />
              {percent !== null && initial ? <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-muted">{percentText}</span> : null}
            </p>
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
            <p className="text-center text-[12px] text-ink-muted">
              Apartado <Quantity value={position.reserved} unit={position.unit} className="font-bold text-ink" unitClassName="text-inherit" /> · Disponible{' '}
              <Quantity value={available} unit={position.unit} className="font-bold text-ink" unitClassName="text-inherit" />
            </p>
          ) : null}
        </div>
        <div className="relative">
          <Place path={position.location.path} name={position.location.name} />
        </div>
        <div className="relative flex flex-wrap justify-center gap-1">
          <ExpiryChip expiresOn={expiresOn} today={today} />
          {showWeight ? <WeightChip figures={figures} adjust={adjust} /> : null}
        </div>
        {canIssue || canTransfer ? (
          // Banda inferior de borde a borde: «Salida» es la primaria y «⇄» traslada. «Ajustar» vive en la ficha ⚖.
          <Band ruled className="relative -mx-4 -mb-1 mt-auto flex items-center gap-1.5 px-4 pt-3">
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
            {canTransfer ? (
              <Button
                size="icon"
                variant="secondary"
                aria-label={`Trasladar ${code}`}
                title="Trasladar"
                className={cn('size-10 rounded-xl border-line-strong bg-white/70 text-ink-muted hover:bg-white hover:text-ink', !canIssue && 'ml-auto')}
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
        'absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[20px] border bg-white p-4 shadow-raised [backface-visibility:hidden] [transform:rotateY(180deg)] transition-shadow duration-200 hover:shadow-float',
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
