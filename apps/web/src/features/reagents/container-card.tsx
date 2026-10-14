import type { Position } from '@platlab/contracts';
import { Band, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Quantity, StockLevelBar, cn, formatDecimal, ratioPercent } from '@platlab/ui';
import { ArrowUpFromLine, Calendar, Check, Ellipsis, MapPin, QrCode as QrIcon, Scale } from 'lucide-react';
import { formatGrams, gramsPerUnit, weightFigures } from './weight';
import { type ComponentProps, type CSSProperties } from 'react';
import { addDays, formatDate, relativeDays } from '../../app/format';
import { type Allowed, type SheetRequest } from './context';
import { ContainerLabel, type LabelProduct } from './labels';
import { InfoPill } from './pills';
import { availableOf } from './stock';

/**
 * Pesos del frasco (ADR 0015): con tara, una línea «Tara · Neto · Bruto» en g. Fijarla o cambiarla está en el
 * menú «Más acciones» de la tarjeta. Los pesos no son cantidades de inventario: son vista previa del servidor.
 */
function WeightRow({ figures }: { figures: NonNullable<ReturnType<typeof weightFigures>> }) {
  return (
    <div className="flex items-start gap-1.5 text-[12px]">
      <Scale className="mt-0.5 size-3.5 shrink-0 text-ink-muted" aria-hidden />
      {/* Tres datos; si no caben, envuelven por dato y no por palabra. */}
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
    </div>
  );
}

/**
 * Un frasco en la ficha (ADR 0012; ADR 0010, «Ventanas como ReactiLab»): translúcido sin desenfoque
 * (`bg-white/80`, borde suave, radio de 24 px) y compacto: caben tres por fila junto al resumen lateral.
 * El estado (FEFO, vencido, apartado) es una insignia sobre el borde, arriba a la derecha. De arriba abajo:
 * el código mono en negrita; una línea gris con la ubicación y la marca; el saldo con la barra por nivel y
 * «de N · X %»; la caducidad exacta (ámbar o rojo según el estado); la línea de pesos; y, tras una línea de
 * borde a borde, «Salida» y un menú «Más acciones» con Trasladar, Ajustar y la tara. El color solo cuenta
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
        {recommended || expired || reserved ? (
          // Insignias de estado sobre el borde, arriba a la derecha.
          <div className="absolute -top-3 right-3 flex justify-end gap-1">
            {recommended ? (
              <span className="inline-flex min-h-6 items-center gap-1 rounded-full bg-success px-2.5 text-xs font-bold text-on-action shadow-sm">
                <Check className="size-3" aria-hidden />
                FEFO
                <span className="sr-only"> (vence antes: conviene usarlo primero)</span>
              </span>
            ) : null}
            {expired ? (
              <InfoPill tone="danger" className="min-h-6 px-2.5 text-xs font-bold shadow-sm">
                Vencido
              </InfoPill>
            ) : null}
            {reserved ? (
              <InfoPill tone="accent" className="min-h-6 px-2.5 text-xs font-bold shadow-sm">
                Apartado
              </InfoPill>
            ) : null}
          </div>
        ) : null}
        {/* El código es la identidad de la etiqueta: se trunca con su título antes que partirse. */}
        <h3 title={code} className="truncate font-mono text-sm font-bold leading-tight tabular-nums text-ink">
          {code}
        </h3>
        <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-ink-muted" title={brand ? `${position.location.name} · ${brand}` : position.location.name}>
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{brand ? `${position.location.name} · ${brand}` : position.location.name}</span>
        </p>
        <div className="grid gap-1.5">
          <p className="flex items-baseline gap-1.5">
            <span className={cn('text-[26px] font-bold leading-none tracking-tight tabular-nums', empty ? 'text-ink-subtle' : 'text-action')}>
              {formatDecimal(position.balance)}
            </span>
            <span className="text-sm text-ink-muted">{position.unit}</span>
          </p>
          {percent !== null && initial ? (
            <>
              <StockLevelBar
                percent={percent}
                hasStock={!empty}
                className="h-1.5"
                label={`Queda ${percentText === '<1 %' ? 'menos del 1 %' : `el ${percentText}`} de lo que entró`}
              />
              <p className="text-[12px] text-ink-muted">
                de <Quantity value={initial} unit={position.unit} unitClassName="text-inherit" /> · <span className="font-semibold tabular-nums">{percentText}</span>
              </p>
            </>
          ) : null}
          {reserved ? (
            <p className="text-[12px] text-ink-muted">
              Apartado <Quantity value={position.reserved} unit={position.unit} className="font-bold text-ink" unitClassName="text-inherit" /> · Disponible{' '}
              <Quantity value={available} unit={position.unit} className="font-bold text-ink" unitClassName="text-inherit" />
            </p>
          ) : null}
        </div>
        {/* El lote interno ya es el prefijo del código del frasco: no se repite. */}
        <p
          className={cn(
            'flex items-start gap-1.5 text-[13px] font-medium',
            expired ? 'text-danger' : soon || expiresOn === null ? 'text-warning' : 'text-ink-muted',
          )}
        >
          <Calendar className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {expiresOn ? (
            <span>
              {expired ? 'Venció' : 'Vence'} {formatDate(expiresOn)} · {relativeDays(expiresOn, today)}
            </span>
          ) : (
            <span>Caducidad sin indicar</span>
          )}
        </p>
        {figures ? <WeightRow figures={figures} /> : null}
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
