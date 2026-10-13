import type { Position } from '@platlab/contracts';
import { Badge, Button, Quantity, cn, formatDecimal, ratioPercent } from '@platlab/ui';
import { ArrowUpFromLine, Building2, Calendar, Check, MapPin, QrCode as QrIcon } from 'lucide-react';
import { formatGrams, gramsPerUnit, weightFigures } from './weight';
import { type ReactNode } from 'react';
import { addDays, formatDate, formatInstantDate, relativeDays } from '../../app/format';
import { type Allowed, type SheetRequest } from './context';
import { availableOf } from './stock';

/**
 * Caducidad sin confirmar: lo único que pide un aviso propio. Con fecha, ya la dicen el recuadro
 * «Vence en…» y su estado (01 §6.1); no se repite en una etiqueta.
 */
function ExpiryBadge({ expiresOn }: { expiresOn: string | null }) {
  if (expiresOn !== null) return null;
  return (
    <Badge tone="warning" className="gap-1 text-[11px]">
      <Calendar className="size-3" aria-hidden />
      Caducidad sin confirmar
    </Badge>
  );
}

/** Recuadro de dato de un frasco: etiqueta pequeña y valor, como los de la tarjeta de ReactiLab. */
function Tile({ label, children, tone = 'neutral', title }: { label: string; children: ReactNode; tone?: 'neutral' | 'accent' | 'danger' | 'warning'; title?: string }) {
  return (
    <div
      title={title}
      className={cn(
        'min-w-0 rounded-control px-2 py-1.5 text-center',
        tone === 'accent' && 'bg-action-soft text-action',
        tone === 'danger' && 'bg-danger-soft text-danger',
        tone === 'warning' && 'bg-warning-soft text-warning',
        tone === 'neutral' && 'bg-surface-sunken text-ink-muted',
      )}
    >
      <p className="truncate text-[12px] leading-tight">{label}</p>
      <p className={cn('mt-0.5 truncate text-[13px] font-bold tabular-nums', tone === 'neutral' ? 'text-ink' : undefined)}>{children}</p>
    </div>
  );
}

/**
 * Control por peso del frasco (ADR 0015): con tara, Tara · Peso neto · Bruto esperado en g; sin ella,
 * quien ajusta la fija. Los pesos no son cantidades de inventario: son vista previa del servidor.
 */
function WeightRow({ position, canSet, onAction }: { position: Position; canSet: boolean; onAction: (request: SheetRequest) => void }) {
  const figures = weightFigures(position);
  // Solo se pesan g, kg, mL y L (en volumen, con densidad: la pide la hoja).
  const weighable = gramsPerUnit(position.unit, '1') !== null && position.container !== null;
  const setTare = () => onAction({ kind: 'tare', position });
  if (figures) {
    return (
      <div className="grid gap-1">
        {/* Tres datos en una línea; si no caben, envuelven por dato y no por palabra. */}
        <dl className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[12px] tabular-nums">
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
          <button type="button" onClick={setTare} className="-mx-1 min-h-[44px] justify-self-start rounded-[6px] px-1 text-[13px] font-medium text-action hover:text-action-hover sm:min-h-0">
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
      className="-mx-1 inline-flex min-h-[44px] items-center self-start rounded-[6px] px-1 text-left text-[13px] text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-action hover:decoration-action sm:min-h-0 sm:py-0.5"
    >
      Fijar tara para controlar con la balanza
    </button>
  );
}

/**
 * Un frasco en la ficha (ADR 0012; réplica de la tarjeta de frasco de ReactiLab, 05-10-2026): arriba
 * las etiquetas de proveedor, ubicación y caducidad; el código y el saldo grandes; la barra de lo que
 * queda con la cantidad inicial; recuadros con el lote, el lote del proveedor, el ingreso y cuándo
 * vence (y lo apartado, si lo hay); y las acciones. El borde cuenta el estado, siempre con texto:
 * verde el que conviene usar primero (FEFO), rojo el vencido, ámbar el vacío. La barra mide el %
 * restante con aritmética exacta.
 */
export function ContainerCard({
  position,
  today,
  timeZone,
  allowed,
  recommended,
  scanned = false,
  onAction,
}: {
  position: Position;
  today: string;
  timeZone: string;
  allowed: Allowed;
  recommended: boolean;
  /** Se llegó a la ficha desde la etiqueta QR de este frasco (ADR 0012, entrega 4). */
  scanned?: boolean;
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
  return (
    <article
      id={position.container ? `frasco-${position.container.id}` : undefined}
      aria-current={scanned ? 'true' : undefined}
      className={cn(
        // Siempre blanca; el color solo cuenta un estado y siempre con texto (ADR 0010).
        'group relative flex h-full flex-col gap-3 rounded-card bg-surface p-4 shadow-raised transition-[transform,box-shadow] duration-200 ease-out-expo hover:shadow-float motion-safe:hover:-translate-y-0.5',
        scanned && 'scroll-mt-24 ring-2 ring-action',
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
      {recommended ? (
        <span className="absolute -top-3 right-4 inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-0.5 text-xs font-bold text-on-action shadow-sm">
          <Check className="size-3" aria-hidden />
          FEFO
          <span className="sr-only"> (vence antes: conviene usarlo primero)</span>
        </span>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {brand ? (
          <Badge className="gap-1 text-[12px]">
            <Building2 className="size-3" aria-hidden />
            {brand}
          </Badge>
        ) : null}
        <Badge className="gap-1 text-[12px]">
          <MapPin className="size-3" aria-hidden />
          {position.location.name}
        </Badge>
        <ExpiryBadge expiresOn={expiresOn} />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          {/* El código es la identidad de la etiqueta: nunca se parte; si no cabe, el saldo baja. */}
          <h3 className="whitespace-nowrap text-lg font-bold tabular-nums leading-tight text-ink">
            {position.container?.code ?? position.lot.code}
          </h3>
        </div>
        <p className="ml-auto shrink-0 text-right">
          <span
            className={cn(
              'block text-3xl font-bold leading-none tracking-tight tabular-nums',
              empty ? 'text-ink-subtle' : 'text-action',
            )}
          >
            {formatDecimal(position.balance)}
          </span>
          <span className="mt-0.5 block text-xs text-ink-muted">{position.unit}</span>
        </p>
      </div>
      {percent !== null && initial ? (
        <div>
          <div
            className="h-2 overflow-hidden rounded-full bg-surface-sunken"
            role="img"
            aria-label={`Queda ${percentText === '<1 %' ? 'menos del 1 %' : `el ${percentText}`} de lo que entró`}
          >
            <div
              className={cn('h-full rounded-full', percent <= 20 ? 'bg-warning' : 'bg-action')}
              style={{ width: percent === 0 && !empty ? '4px' : `${percent}%` }}
            />
          </div>
          <p className="mt-1 flex justify-between text-[12px] text-ink-muted">
            <span>
              Inicial: <Quantity value={initial} unit={position.unit} />
            </span>
            <span className="font-semibold tabular-nums">{percentText}</span>
          </p>
        </div>
      ) : null}
      {/* El lote interno ya es el prefijo del código del frasco: no se repite en un recuadro. Dos
          columnas; si los recuadros son impares, el último ocupa la fila para no dejar un hueco. */}
      <div className="grid grid-cols-2 gap-1.5 [&>*:last-child:nth-child(odd)]:col-span-2">
        {position.container ? <Tile label="Ingresó">{formatInstantDate(position.container.receivedAt, timeZone)}</Tile> : null}
        {expiresOn ? (
          <Tile label={expired ? 'Venció' : 'Vence'} tone={expired ? 'danger' : soon ? 'warning' : 'neutral'} title={formatDate(expiresOn)}>
            {relativeDays(expiresOn, today)}
            <span className="sr-only"> ({formatDate(expiresOn)})</span>
          </Tile>
        ) : null}
        {reserved ? (
          <>
            <Tile label="Apartado" tone="accent">
              <Quantity value={position.reserved} unit={position.unit} unitClassName="text-inherit" />
            </Tile>
            <Tile label="Disponible">
              <Quantity value={available} unit={position.unit} unitClassName="text-inherit" />
            </Tile>
          </>
        ) : null}
      </div>
      <WeightRow position={position} canSet={allowed.adjustment} onAction={onAction} />
      {canIssue || canTransfer || allowed.adjustment ? (
        <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-3">
          {canIssue ? (
            // Relleno solo el frasco que conviene usar primero: la acción primaria de la ficha es una.
            <Button
              size="sm"
              variant={recommended ? 'primary' : 'secondary'}
              className={cn('h-10 min-w-[7.5rem] flex-1 font-bold', !recommended && 'border-action/30 text-action hover:bg-action-soft')}
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
              className="h-10 px-2.5"
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
              className="h-10 px-2.5"
              onClick={() => onAction({ kind: 'adjustment', positionId: position.id })}
            >
              Ajustar
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
