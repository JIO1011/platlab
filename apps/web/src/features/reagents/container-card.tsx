import type { Position } from '@platlab/contracts';
import { Band, Button, Quantity, StockLevelBar, cn, formatDecimal, ratioPercent } from '@platlab/ui';
import { ArrowUpFromLine, Calendar, Check, MapPin, QrCode as QrIcon, Scale } from 'lucide-react';
import { formatGrams, gramsPerUnit, weightFigures } from './weight';
import { type ComponentProps, type CSSProperties } from 'react';
import { addDays, formatDate, relativeDays } from '../../app/format';
import { type Allowed, type SheetRequest } from './context';
import { ContainerLabel, type LabelProduct } from './labels';
import { InfoPill } from './pills';
import { availableOf } from './stock';

/**
 * Control por peso del frasco (ADR 0015): con tara, una línea «Tara · Neto · Bruto» en g y «Cambiar tara»;
 * sin ella, quien ajusta la fija. Los pesos no son cantidades de inventario: son vista previa del servidor.
 */
function WeightRow({ position, canSet, onAction }: { position: Position; canSet: boolean; onAction: (request: SheetRequest) => void }) {
  const figures = weightFigures(position);
  // Solo se pesan g, kg, mL y L (en volumen, con densidad: la pide la hoja).
  const weighable = gramsPerUnit(position.unit, '1') !== null && position.container !== null;
  const setTare = () => onAction({ kind: 'tare', position });
  if (figures) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px]">
        <Scale className="size-4 shrink-0 text-ink-muted" aria-hidden />
        {/* Tres datos en una línea; si no caben, envuelven por dato y no por palabra. */}
        <dl className="flex flex-wrap gap-x-2.5 gap-y-0.5 tabular-nums">
          {(
            [
              ['Tara', figures.tare],
              ['Neto', figures.net],
              ['Bruto', figures.expectedGross],
            ] as const
          ).map(([label, grams]) => (
            <div key={label} className="flex gap-1 whitespace-nowrap">
              <dt className="text-ink-muted">{label}</dt>
              <dd className="font-bold text-ink">{formatGrams(grams)}</dd>
            </div>
          ))}
        </dl>
        {canSet ? (
          <button type="button" onClick={setTare} className="-mx-1 min-h-[44px] rounded-[6px] px-1 font-medium text-action hover:text-action-hover sm:min-h-0">
            Cambiar tara
          </button>
        ) : null}
      </div>
    );
  }
  if (!canSet || !weighable) return null;
  return (
    <button
      type="button"
      onClick={setTare}
      className="-mx-1 inline-flex min-h-[44px] items-center gap-1.5 self-start rounded-[6px] px-1 text-left text-[13px] font-medium text-action hover:text-action-hover sm:min-h-0 sm:py-0.5"
    >
      <Scale className="size-4" aria-hidden />
      Fijar tara
    </button>
  );
}

/**
 * Un frasco en la ficha (ADR 0012; ADR 0010, «Ventanas como ReactiLab»): translúcido sin desenfoque
 * (`bg-white/80`, borde suave, radio de 24 px). De arriba abajo: el código mono en negrita con su estado
 * (FEFO, vencido, apartado) a la derecha; una línea gris con la ubicación y la marca; el saldo grande con
 * el porcentaje, la barra por nivel y la cantidad inicial; la caducidad exacta (ámbar o rojo según el
 * estado); la línea de pesos; y, tras una línea de borde a borde, las acciones. El color solo cuenta un
 * estado y siempre con texto.
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
  const expired = expiresOn !== null && expiresOn < today;
  // Lo apartado por solicitudes no se puede sacar (ADR 0012); con todo apartado, no hay «Salida».
  const reserved = position.reserved !== '0';
  const available = availableOf(position);
  // Con saldo pero menos del 1 %, se dice y se ve: un frasco casi vacío no es un frasco vacío.
  const percentText = percent === 0 && !empty ? '<1 %' : `${percent ?? 0} %`;
  const canIssue = allowed.issue && available !== '0';
  // Se traslada el frasco entero; con salidas pendientes, primero se resuelven (ADR 0012, entrega 4).
  const canTransfer = allowed.transfer && !empty && !reserved;
  const { brand } = position.lot;
  const soon = expiresOn !== null && !expired && expiresOn <= addDays(today, 30);
  const code = position.container?.code ?? position.lot.code;
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
          'group relative flex h-full flex-col gap-3.5 rounded-3xl border border-white/80 bg-white/80 p-5 shadow-raised [backface-visibility:hidden] transition-[translate,box-shadow] duration-200 ease-out-expo hover:shadow-float motion-safe:hover:-translate-y-0.5',
          'motion-reduce:transition-opacity motion-reduce:duration-300 motion-reduce:[transition-delay:var(--flip-delay)]',
          flipped && 'motion-reduce:opacity-0',
          scanned && 'ring-2 ring-action',
          !scanned && recommended && 'ring-2 ring-success/50',
          !scanned && !recommended && expired && 'ring-1 ring-danger/40',
        )}
      >
        {scanned ? (
          <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-action px-2.5 py-0.5 text-xs font-bold text-on-action shadow-sm">
            <QrIcon className="size-3" aria-hidden />
            Desde su etiqueta
          </span>
        ) : null}
        <div className="flex items-start justify-between gap-2">
          {/* El código es la identidad de la etiqueta: nunca se parte. */}
          <h3 className="whitespace-nowrap font-mono text-lg font-bold leading-tight tabular-nums text-ink">{code}</h3>
          <div className="flex flex-wrap justify-end gap-1.5">
            {recommended ? (
              <span className="inline-flex min-h-6 items-center gap-1 rounded-full bg-success px-2.5 text-xs font-bold text-on-action">
                <Check className="size-3" aria-hidden />
                FEFO
                <span className="sr-only"> (vence antes: conviene usarlo primero)</span>
              </span>
            ) : null}
            {expired ? (
              <InfoPill tone="danger" className="min-h-6 px-2.5 text-xs font-bold">
                Vencido
              </InfoPill>
            ) : null}
            {reserved ? (
              <InfoPill tone="accent" className="min-h-6 px-2.5 text-xs font-bold">
                Apartado
              </InfoPill>
            ) : null}
          </div>
        </div>
        <p className="flex min-w-0 items-center gap-1.5 text-sm text-ink-muted">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{brand ? `${position.location.name} · ${brand}` : position.location.name}</span>
        </p>
        <div className="grid gap-2">
          <p className="flex items-baseline justify-between gap-2">
            <span className="flex items-baseline gap-2">
              <span className={cn('text-4xl font-bold leading-none tracking-tight tabular-nums', empty ? 'text-ink-subtle' : 'text-action')}>
                {formatDecimal(position.balance)}
              </span>
              <span className="text-base text-ink-muted">{position.unit}</span>
            </span>
            {percent !== null && initial ? <span className="text-sm font-semibold tabular-nums text-ink-muted">{percentText}</span> : null}
          </p>
          {percent !== null && initial ? (
            <>
              <StockLevelBar
                percent={percent}
                hasStock={!empty}
                label={`Queda ${percentText === '<1 %' ? 'menos del 1 %' : `el ${percentText}`} de lo que entró`}
              />
              <p className="text-[13px] text-ink-muted">
                de <Quantity value={initial} unit={position.unit} unitClassName="text-inherit" />
              </p>
            </>
          ) : null}
          {reserved ? (
            <p className="text-[13px] text-ink-muted">
              Apartado <Quantity value={position.reserved} unit={position.unit} className="font-bold text-ink" unitClassName="text-inherit" /> · Disponible{' '}
              <Quantity value={available} unit={position.unit} className="font-bold text-ink" unitClassName="text-inherit" />
            </p>
          ) : null}
        </div>
        {/* El lote interno ya es el prefijo del código del frasco: no se repite. */}
        <p
          className={cn(
            'flex items-center gap-1.5 text-sm font-medium',
            expired ? 'text-danger' : soon || expiresOn === null ? 'text-warning' : 'text-ink-muted',
          )}
        >
          <Calendar className="size-4 shrink-0" aria-hidden />
          {expiresOn ? (
            <span>
              {expired ? 'Venció' : 'Vence'} {formatDate(expiresOn)} · {relativeDays(expiresOn, today)}
            </span>
          ) : (
            <span>Caducidad sin indicar</span>
          )}
        </p>
        <WeightRow position={position} canSet={allowed.adjustment} onAction={onAction} />
        {canIssue || canTransfer || allowed.adjustment ? (
          // Banda inferior de borde a borde: «Salida» es la primaria; «Trasladar» y «Ajustar», texto.
          <Band ruled className="-mx-5 -mb-1 mt-auto flex flex-wrap items-center gap-1.5 px-5 pt-4">
            {canIssue ? (
              // Relleno solo el frasco que conviene usar primero: la acción primaria de la ficha es una.
              <Button
                size="sm"
                variant={recommended ? 'primary' : 'secondary'}
                className={cn('h-10 min-w-[6.5rem] flex-1 rounded-xl font-bold', !recommended && 'border-action/30 bg-white/70 text-action hover:bg-action-soft')}
                onClick={() => onAction({ kind: 'issue', positionId: position.id })}
              >
                <ArrowUpFromLine aria-hidden />
                {/* Quien no aprueba pide la salida: la tarjeta no promete una acción inmediata (ADR 0012). */}
                {allowed.approve ? 'Salida' : 'Solicitar salida'}
              </Button>
            ) : null}
            {canTransfer ? (
              <Button
                size="sm"
                variant="ghost"
                title="Trasladar el frasco a otra ubicación"
                className="h-10 rounded-xl px-2.5"
                onClick={() => onAction({ kind: 'transfer', position })}
              >
                Trasladar
              </Button>
            ) : null}
            {allowed.adjustment ? (
              <Button
                size="sm"
                variant="ghost"
                title="Ajustar existencias"
                className="h-10 rounded-xl px-2.5"
                onClick={() => onAction({ kind: 'adjustment', positionId: position.id })}
              >
                Ajustar
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
