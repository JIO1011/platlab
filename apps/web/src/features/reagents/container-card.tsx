import type { Position } from '@platlab/contracts';
import { Band, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, HelpTip, Quantity, StockLevelBar, cn, formatDecimal, ratioPercent } from '@platlab/ui';
import { ArrowUpFromLine, CalendarClock, CalendarDays, CalendarX, Check, Ellipsis, MapPin, QrCode as QrIcon, Scale, Star, TriangleAlert } from 'lucide-react';
import { formatGrams, gramsPerUnit, weightFigures } from './weight';
import { type ComponentProps, type CSSProperties } from 'react';
import { formatDate, formatShortDate, relativeDays } from '../../app/format';
import { type Allowed, type SheetRequest } from './context';
import { ContainerLabel, type LabelProduct } from './labels';
import { availableOf, expiryOf } from './stock';

/**
 * Fila de estado de la tarjeta (ADR 0015): siempre mide h-5, aunque esté vacía, para que el código de todas
 * las tarjetas caiga a la misma altura. A la izquierda el estado, en mayúsculas pequeñas con icono y color
 * («Usar primero», «Vencido», «Apartado»); a la derecha la marca, en gris y truncada.
 */
function StatusRow({ recommended, expired, reserved, brand }: { recommended: boolean; expired: boolean; reserved: boolean; brand: string | null }) {
  const status = 'inline-flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase leading-none tracking-wider';
  return (
    <div className="flex h-5 items-center justify-between gap-2">
      <div className="flex shrink-0 items-center gap-2.5">
        {recommended ? (
          <span className={cn(status, 'text-success')}>
            <Star className="size-3 fill-current" aria-hidden />
            Usar primero
            <span className="sr-only"> (vence antes: conviene usarlo primero)</span>
          </span>
        ) : null}
        {expired ? (
          <span className={cn(status, 'text-danger')}>
            <TriangleAlert className="size-3" aria-hidden />
            Vencido
          </span>
        ) : null}
        {reserved ? <span className={cn(status, 'text-warning')}>Apartado</span> : null}
      </div>
      {brand ? (
        <span title={brand} className="min-w-0 truncate text-[12px] text-ink-subtle">
          {brand}
        </span>
      ) : null}
    </div>
  );
}

/** Gramos de la tarjeta, sin el «,0» de los pesos enteros («3.109 g»): la ficha ocupa menos y la nube se lee igual. */
const shortGrams = (grams: string) => formatGrams(grams).replace(',0 g', ' g');

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
 * El peso bruto que debe marcar la balanza (tara + contenido), solo con tara. La nube trae tara y neto; con
 * permiso de ajustar, además «Comprobar con balanza», que abre la hoja Ajustar ya en «Por peso». Los pesos no
 * son cantidades de inventario: son vista previa del servidor.
 */
function WeightChip({ figures, canCheck, onCheck }: { figures: NonNullable<ReturnType<typeof weightFigures>>; canCheck: boolean; onCheck: () => void }) {
  const gross = shortGrams(figures.expectedGross);
  return (
    <HelpTip
      hover
      label={`Peso bruto esperado ${gross}`}
      trigger={
        <>
          <Scale className="size-3.5 shrink-0" aria-hidden />
          {gross}
        </>
      }
      className={chipClass('neutral')}
    >
      {(close) => (
        <div className="grid gap-1.5">
          <p className="font-semibold">Lo que debe marcar la balanza</p>
          <p className="tabular-nums text-white/80">
            Tara {shortGrams(figures.tare)} · Neto {shortGrams(figures.net)}
          </p>
          {canCheck ? (
            <button
              type="button"
              onClick={() => {
                close();
                onCheck();
              }}
              className="mt-1 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-semibold text-ink transition-colors hover:bg-action-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white max-sm:h-10"
            >
              <Scale className="size-3.5" aria-hidden />
              Comprobar con balanza
            </button>
          ) : null}
        </div>
      )}
    </HelpTip>
  );
}

/**
 * La ubicación completa: el camino desde la sede (`path`) unido por « › », sin truncar y envolviendo si hace
 * falta. El último nivel, en el color del texto; los anteriores, en gris. Sin camino, el nombre de la ubicación.
 */
function Place({ path, name }: { path: string[]; name: string }) {
  const levels = path.length > 0 ? path : [name];
  return (
    <p className="flex items-start gap-1.5 text-[13px] leading-snug">
      <MapPin className="mt-0.5 size-3.5 shrink-0 text-ink-muted" aria-hidden />
      <span className="min-w-0 [overflow-wrap:anywhere]">
        {levels.map((level, index) => (
          <span key={`${index}-${level}`}>
            {index > 0 ? (
              <span aria-hidden className="text-ink-subtle">
                {' › '}
              </span>
            ) : null}
            <span className={index === levels.length - 1 ? 'font-medium text-ink' : 'text-ink-muted'}>{level}</span>
          </span>
        ))}
      </span>
    </p>
  );
}

/**
 * Un frasco en la ficha (ADR 0012; ADR 0010, «Ventanas como ReactiLab»): translúcido sin desenfoque
 * (`bg-white/80`, borde suave, radio de 24 px) y compacto: caben tres por fila junto al resumen lateral.
 * Se lee en el orden en que se identifica un frasco: la fila de estado (h-5; «Usar primero», «Vencido» o
 * «Apartado» y, a la derecha, la marca); el código mono en negrita de 15 px; el saldo de 26 px con su unidad y
 * el % a la derecha, y la barra por nivel; la ubicación completa con su ruta; dos fichas, la caducidad corta
 * (ámbar o roja según el estado) y, con tara, el peso bruto esperado, cada una con su nube; y, tras una línea
 * de borde a borde, «Salida» y un menú «Más acciones» con Trasladar, Ajustar y la tara. El color solo cuenta
 * un estado y siempre con texto.
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
  labels,
  onAction,
}: {
  position: Position;
  today: string;
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
  const canIssue = allowed.issue && available !== '0';
  // Se traslada el frasco entero; con salidas pendientes, primero se resuelven (ADR 0012, entrega 4).
  const canTransfer = allowed.transfer && !empty && !reserved;
  const { brand } = position.lot;
  const code = position.container?.code ?? position.lot.code;
  const figures = weightFigures(position);
  // Solo se pesan g, kg, mL y L (en volumen, con densidad: la pide la hoja).
  const weighable = gramsPerUnit(position.unit, '1') !== null && position.container !== null;
  const canTare = allowed.adjustment && (figures !== null || weighable);
  const flipped = labels?.flipped === true;
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
        {scanned ? (
          <span className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full bg-action px-2.5 py-0.5 text-xs font-bold text-on-action shadow-sm">
            <QrIcon className="size-3" aria-hidden />
            Desde su etiqueta
          </span>
        ) : null}
        <div className="-mb-1 grid gap-1">
          <StatusRow recommended={recommended} expired={expired} reserved={reserved} brand={brand} />
          {/* El código es la identidad de la etiqueta: si no cabe, se corta con puntos y el título lo dice entero. */}
          <h3 title={code} className="truncate font-mono text-[15px] font-bold leading-tight tabular-nums text-ink">
            {code}
          </h3>
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
            <WeightChip figures={figures} canCheck={allowed.adjustment} onCheck={() => onAction({ kind: 'adjustment', positionId: position.id, mode: 'weight' })} />
          ) : null}
        </div>
        {canIssue || canTransfer || allowed.adjustment ? (
          // Banda inferior de borde a borde: «Salida» es la primaria; lo demás, en el menú «Más acciones».
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
            {canTransfer || allowed.adjustment ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" aria-label={`Más acciones de ${code}`} className="size-10 rounded-xl">
                    <Ellipsis aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canTransfer ? <DropdownMenuItem onSelect={() => onAction({ kind: 'transfer', position })}>Trasladar</DropdownMenuItem> : null}
                  {allowed.adjustment ? (
                    <DropdownMenuItem onSelect={() => onAction({ kind: 'adjustment', positionId: position.id })}>Ajustar</DropdownMenuItem>
                  ) : null}
                  {canTare ? (
                    <DropdownMenuItem onSelect={() => onAction({ kind: 'tare', position })}>{figures ? 'Cambiar tara' : 'Fijar tara'}</DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
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
