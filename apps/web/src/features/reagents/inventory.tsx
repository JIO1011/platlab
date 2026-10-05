import type { Position, StockedProduct } from '@platlab/contracts';
import { Badge, Button, IconChip, Input, Quantity, Skeleton, StatePanel, cn, formatDecimal, ratioPercent } from '@platlab/ui';
import {
  ArrowRight,
  ArrowUpFromLine,
  Box,
  Building2,
  Calendar,
  CalendarClock,
  CalendarX,
  Check,
  CircleAlert,
  Droplet,
  FlaskConical,
  History,
  Layers,
  MapPin,
  Plus,
  Scale,
  Search,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ActivityRow } from '../../app/activity-row';
import { ModuleMark } from '../../app/module-mark';
import { addDays, formatDate, formatInstantDate, relativeDays } from '../../app/format';
import { useOperations, usePositions, useProduct } from '../../app/queries';
import { QueryErrorState } from '../../app/states';
import { useReagents, type Allowed, type SheetRequest } from './context';
import { purposeOf, responsibleOf } from './operation-text';
import { fefoCandidates } from './sheets';
import { availableOf } from './stock';

const physicalStateLabel: Record<string, string> = { solid: 'Sólido', liquid: 'Líquido', gas: 'Gas' };

/** El icono lo da el estado físico, un dato que ya existe; sin él, el matraz del módulo. */
const physicalStateIcon: Record<string, LucideIcon> = { solid: Box, liquid: Droplet, gas: Wind };

const matches = (product: StockedProduct, query: string) => {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  return [product.name, product.code, product.casNumber ?? ''].some((value) => value.toLowerCase().includes(text));
};

/** Interruptor «mostrar vacíos» de ReactiLab: lo que no tiene saldo se oculta, pero no desaparece. */
function EmptyToggle({ count, shown, onToggle, noun }: { count: number; shown: boolean; onToggle: () => void; noun: string }) {
  if (count === 0) return null;
  return (
    <button
      type="button"
      aria-pressed={shown}
      onClick={onToggle}
      className={cn(
        'inline-flex h-9 items-center rounded-full px-3.5 text-sm font-medium transition-colors',
        shown ? 'bg-action-soft text-action' : 'bg-surface-sunken text-ink-muted hover:text-ink',
      )}
    >
      {shown ? 'Ocultar' : 'Mostrar'} {noun} ({count})
    </button>
  );
}

/** Filtros de caducidad (ADR 0012, 05-10-2026), en la URL: los indicadores del Resumen abren aquí. */
const expiryFilters = {
  vencidos: { label: 'Vencidos', has: (product: StockedProduct) => product.expiredContainers > 0 },
  'por-vencer': { label: 'Por vencer', has: (product: StockedProduct) => product.expiringContainers > 0 },
} as const;
type ExpiryFilter = keyof typeof expiryFilters;
const isExpiryFilter = (value: string | null): value is ExpiryFilter => value !== null && value in expiryFilters;

/** Píldora de filtro: se muestra si hay algo que filtrar o si ya está activa, para poder quitarla. */
function FilterPill({ label, count, active, onToggle }: { label: string; count: number; active: boolean; onToggle: () => void }) {
  if (count === 0 && !active) return null;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors',
        active ? 'bg-action-soft text-action' : 'bg-surface-sunken text-ink-muted hover:text-ink',
      )}
    >
      {label}
      <span className="tabular-nums">({count})</span>
    </button>
  );
}

/**
 * Inventario, primer nivel (ADR 0012): un reactivo por tarjeta con su total, sus frascos con saldo
 * y sus avisos de caducidad. Toda la tarjeta abre su ficha, el segundo nivel.
 */
export function ReagentsInventoryPage() {
  const { base, allowed, products, productList, openSheet } = useReagents();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [showEmpty, setShowEmpty] = useState(false);
  const expiryParam = params.get('caducidad');
  const expiry = isExpiryFilter(expiryParam) ? expiryParam : null;
  const emptyCount = productList.filter((product) => product.balance === '0').length;
  const visible = productList.filter(
    (product) =>
      matches(product, query) &&
      (expiry ? expiryFilters[expiry].has(product) : showEmpty || product.balance !== '0'),
  );
  const toggleExpiry = (filter: ExpiryFilter) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (expiry === filter) next.delete('caducidad');
        else next.set('caducidad', filter);
        return next;
      },
      { replace: true },
    );

  if (products.isPending) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-4" role="status" aria-busy="true" aria-label="Cargando">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-44 rounded-card" />
        ))}
      </div>
    );
  }
  if (productList.length === 0) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <StatePanel
          icon={FlaskConical}
          title="Aún no hay reactivos"
          description={
            allowed.product
              ? 'Crea el primer reactivo del catálogo; después registra sus frascos con un ingreso.'
              : 'Cuando alguien con permiso cree reactivos en el catálogo, aparecerán aquí.'
          }
          action={
            allowed.product ? (
              <Button variant="primary" onClick={() => openSheet({ kind: 'product' })}>
                <Plus aria-hidden />
                Nuevo reactivo
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <Input
            type="search"
            aria-label="Buscar reactivo por nombre, código o CAS"
            placeholder="Buscar por nombre, código o CAS"
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(expiryFilters) as ExpiryFilter[]).map((filter) => (
            <FilterPill
              key={filter}
              label={expiryFilters[filter].label}
              count={productList.filter(expiryFilters[filter].has).length}
              active={expiry === filter}
              onToggle={() => toggleExpiry(filter)}
            />
          ))}
          {expiry ? null : (
            <EmptyToggle count={emptyCount} shown={showEmpty} onToggle={() => setShowEmpty(!showEmpty)} noun="sin existencias" />
          )}
        </div>
        {/* Cuántos se ven, para leer el efecto de la búsqueda y los filtros de un vistazo. */}
        <p className="text-sm text-ink-muted sm:ml-auto" aria-live="polite">
          {visible.length === 1 ? '1 reactivo' : `${visible.length} reactivos`}
        </p>
      </div>
      {visible.length === 0 ? (
        <p className="rounded-panel bg-surface px-4 py-8 text-center text-sm text-ink-muted shadow-raised">
          {query.trim()
            ? `Ningún reactivo coincide con «${query}».`
            : expiry === 'vencidos'
              ? 'Ningún reactivo tiene frascos vencidos con saldo.'
              : 'Ningún reactivo tiene frascos por vencer en los próximos 30 días.'}
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-4">
          {visible.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} to={`${base}/inventario/${product.id}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Tarjeta de catálogo (ADR 0010, 04-10-2026; réplica de la de ReactiLab el 05-10-2026): fila de
 * rótulo (estado físico) y CAS en monoespaciado, el nombre, una línea y «Total» con la cantidad a
 * la izquierda y, a la derecha, la píldora de frascos. Los avisos de caducidad van a la derecha de
 * «Total» y los de existencias sustituyen a la píldora; todo con texto. Lleva el
 * icono del estado físico y el matraz del módulo de marca de agua.
 */
function ProductCard({ product, to }: { product: StockedProduct; to: string }) {
  const empty = product.balance === '0';
  const state = product.physicalState ?? undefined;
  const frascos = product.containersWithStock === 1 ? '1 frasco' : `${product.containersWithStock} frascos`;
  return (
    <Link
      to={to}
      className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-card bg-surface p-6 shadow-raised transition-[transform,box-shadow] duration-200 ease-out-expo hover:shadow-float motion-safe:hover:-translate-y-1"
    >
      {/* Marca de agua: decorativa y casi invisible. */}
      <ModuleMark
        code="reagents"
        className="pointer-events-none absolute -bottom-5 -right-3 size-32 rotate-12 text-surface-sunken transition-[color,transform] duration-500 group-hover:text-action-soft motion-safe:group-hover:scale-110"
      />
      <div className="relative flex items-start gap-3">
        <IconChip icon={(state && physicalStateIcon[state]) || FlaskConical} tone={empty ? 'neutral' : 'accent'} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
            <span>{(state && physicalStateLabel[state]) ?? 'Reactivo'}</span>
            {product.casNumber ? (
              <span className="ml-auto font-mono text-[12px] font-medium normal-case tracking-normal tabular-nums text-ink-subtle">
                CAS: {product.casNumber}
              </span>
            ) : null}
          </p>
          <h2 className="mt-1 text-balance text-xl font-bold leading-snug text-ink transition-colors group-hover:text-action">{product.name}</h2>
        </div>
      </div>
      <div className="relative mt-auto border-t border-line pt-4">
        {/* Fila de «Total»: a la derecha, los avisos de caducidad, que no cambian el alto de la tarjeta. */}
        <div className="flex min-h-6 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Total</p>
          <div className="flex flex-wrap justify-end gap-1.5">
            {product.expiredContainers ? (
              <Badge tone="danger" className="gap-1 whitespace-nowrap">
                <CalendarX className="size-3.5" aria-hidden />
                {product.expiredContainers === 1 ? '1 vencido' : `${product.expiredContainers} vencidos`}
              </Badge>
            ) : null}
            {product.expiringContainers ? (
              <Badge tone="warning" className="gap-1 whitespace-nowrap">
                <CalendarClock className="size-3.5" aria-hidden />
                {product.expiringContainers} por vencer
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="mt-1 flex items-end justify-between gap-3">
          <Quantity
            value={product.balance}
            unit={product.baseUnit}
            // Un saldo muy largo baja la unidad a otra línea en lugar de salirse de la tarjeta.
            className={cn('block min-w-0 whitespace-normal text-3xl font-bold tracking-tight', empty ? 'text-ink-subtle' : 'text-action')}
          />
          {empty ? (
            <Badge tone="warning" className="shrink-0 gap-1.5 whitespace-nowrap px-2.5 py-1 text-[13px]">
              <CircleAlert className="size-4" aria-hidden />
              Sin existencias
            </Badge>
          ) : (
            <Badge className="shrink-0 gap-1.5 whitespace-nowrap px-2.5 py-1 text-[13px] font-semibold text-ink">
              <Layers className="size-4" aria-hidden />
              {frascos}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}

const conditionLabel: Record<Position['lot']['condition'], { text: string; tone: 'warning' | 'danger' } | null> = {
  enabled: null,
  quarantine: { text: 'Lote en cuarentena', tone: 'warning' },
  blocked: { text: 'Lote bloqueado', tone: 'danger' },
  discarded: { text: 'Lote descartado', tone: 'danger' },
};

/** Caducidad con texto, nunca solo con color: vencido, fecha o «sin confirmar» (01 §6.1). */
function ExpiryBadge({ expiresOn, today }: { expiresOn: string | null; today: string }) {
  const icon = <Calendar className="size-3" aria-hidden />;
  if (expiresOn === null) return <Badge tone="warning" className="gap-1 text-[11px]">{icon}Caducidad sin confirmar</Badge>;
  if (expiresOn < today) return <Badge tone="danger" className="gap-1 text-[11px]">{icon}Venció {formatDate(expiresOn)}</Badge>;
  return <Badge className="gap-1 text-[11px]">{icon}Caduca {formatDate(expiresOn)}</Badge>;
}

/** Recuadro de dato de un frasco: etiqueta pequeña y valor, como los de la tarjeta de ReactiLab. */
function Tile({ label, children, tone = 'neutral' }: { label: string; children: ReactNode; tone?: 'neutral' | 'accent' | 'danger' | 'warning' }) {
  return (
    <div
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
 * Un frasco en la ficha (ADR 0012; réplica de la tarjeta de frasco de ReactiLab, 05-10-2026): arriba
 * las etiquetas de proveedor, ubicación y caducidad; el código y el saldo grandes; la barra de lo que
 * queda con la cantidad inicial; recuadros con el lote, el lote del proveedor, el ingreso y cuándo
 * vence (y lo apartado, si lo hay); y las acciones. El borde cuenta el estado, siempre con texto:
 * verde el que conviene usar primero (FEFO), rojo el vencido, ámbar el vacío. La barra mide el %
 * restante con aritmética exacta.
 */
function ContainerCard({
  position,
  today,
  timeZone,
  allowed,
  recommended,
  onAction,
}: {
  position: Position;
  today: string;
  timeZone: string;
  allowed: Allowed;
  recommended: boolean;
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
  const condition = conditionLabel[position.lot.condition];
  const { supplierName, supplierLot } = position.lot;
  const soon = expiresOn !== null && !expired && expiresOn <= addDays(today, 30);
  return (
    <article
      className={cn(
        // Siempre blanca; el color solo cuenta un estado y siempre con texto (ADR 0010).
        'group relative flex h-full flex-col gap-3 rounded-card bg-surface p-4 shadow-raised transition-[transform,box-shadow] duration-200 ease-out-expo hover:shadow-float motion-safe:hover:-translate-y-0.5',
        recommended && 'ring-2 ring-success/50',
        !recommended && expired && 'ring-1 ring-danger/40',
      )}
    >
      {recommended ? (
        <span className="absolute -top-3 right-4 inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-0.5 text-xs font-bold text-on-action shadow-sm">
          <Check className="size-3" aria-hidden />
          FEFO
          <span className="sr-only"> (vence antes: conviene usarlo primero)</span>
        </span>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {supplierName ? (
          <Badge className="gap-1 text-[12px]">
            <Building2 className="size-3" aria-hidden />
            {supplierName}
          </Badge>
        ) : null}
        <Badge className="gap-1 text-[12px]">
          <MapPin className="size-3" aria-hidden />
          {position.location.name}
        </Badge>
        <ExpiryBadge expiresOn={expiresOn} today={today} />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          {/* El código es la identidad de la etiqueta: nunca se parte; si no cabe, el saldo baja. */}
          <h3 className="whitespace-nowrap text-lg font-bold tabular-nums leading-tight text-ink">
            {position.container?.code ?? position.lot.code}
          </h3>
          {condition ? (
            <Badge tone={condition.tone} className="mt-1.5 text-[12px]">
              {condition.text}
            </Badge>
          ) : null}
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
        {supplierLot ? <Tile label="Lote del proveedor">{supplierLot}</Tile> : null}
        {position.container ? <Tile label="Ingresó">{formatInstantDate(position.container.receivedAt, timeZone)}</Tile> : null}
        {expiresOn ? (
          <Tile label={expired ? 'Venció' : 'Vence'} tone={expired ? 'danger' : soon ? 'warning' : 'neutral'}>
            {relativeDays(expiresOn, today)}
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
      {(allowed.issue && available !== '0') || allowed.adjustment ? (
        <div className="mt-auto flex gap-2 border-t border-line pt-3">
          {allowed.issue && available !== '0' ? (
            // Relleno solo el frasco que conviene usar primero: la acción primaria de la ficha es una.
            <Button
              size="sm"
              variant={recommended ? 'primary' : 'secondary'}
              className={cn('h-10 flex-1 font-bold', !recommended && 'border-action/30 text-action hover:bg-action-soft')}
              onClick={() => onAction({ kind: 'issue', positionId: position.id })}
            >
              <ArrowUpFromLine aria-hidden />
              {/* Quien no aprueba pide la salida: la tarjeta no promete una acción inmediata (ADR 0012). */}
              {allowed.approve ? 'Salida' : 'Solicitar salida'}
            </Button>
          ) : null}
          {allowed.adjustment ? (
            <Button
              size="sm"
              aria-label="Ajustar"
              title="Ajustar existencias"
              className="h-10 px-3 text-ink-muted hover:bg-surface-sunken hover:text-ink"
              onClick={() => onAction({ kind: 'adjustment', positionId: position.id })}
            >
              <Scale aria-hidden />
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function ReagentsProductPage() {
  const { productId = '' } = useParams();
  const { workspaceId, me, base, allowed, openSheet } = useReagents();
  const product = useProduct(workspaceId, productId);
  const positions = usePositions(workspaceId, productId);
  const history = useOperations(workspaceId, { productId });
  const [showEmpty, setShowEmpty] = useState(false);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: me.workspace.timeZone }).format(new Date());
  const containers = useMemo(() => positions.data?.pages.flatMap((page) => page.items) ?? [], [positions.data]);
  const emptyCount = containers.filter((position) => position.balance === '0').length;
  const visible = containers.filter((position) => showEmpty || position.balance !== '0');
  const allEntries = history.data?.pages.flatMap((page) => page.items) ?? [];
  const entries = allEntries.slice(0, 10);
  // Se muestran los 10 más recientes; si hay más, se dice y se enlaza a todos los movimientos.
  const hasMoreHistory = allEntries.length > 10 || history.hasNextPage;

  if (product.isPending) {
    return (
      <div className="grid gap-4" role="status" aria-busy="true" aria-label="Cargando">
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-44 rounded-card" />
      </div>
    );
  }
  if (product.isError) {
    return (
      <QueryErrorState error={product.error} onRetry={() => void product.refetch()} />
    );
  }

  const state = product.data.physicalState ?? undefined;
  const noStock = product.data.balance === '0';
  const StateIcon = (state && physicalStateIcon[state]) || FlaskConical;
  // El frasco que conviene usar primero: la misma sugerencia FEFO que preselecciona la hoja de salida.
  const recommendedId = fefoCandidates(containers, productId, today)[0]?.id;

  return (
    <div className="grid gap-6">
      <section aria-label="Datos del reactivo" className="grid gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {product.data.casNumber ? (
            <span className="rounded-control border border-line bg-surface px-2.5 py-1 font-mono text-sm tabular-nums text-ink-muted">
              CAS: {product.data.casNumber}
            </span>
          ) : null}
          <Badge className="gap-1.5 px-3 py-1 text-sm">
            <StateIcon className="size-4" aria-hidden />
            {state ? physicalStateLabel[state] : 'Estado sin indicar'}
          </Badge>
          <Badge className="px-3 py-1 text-sm tabular-nums">Código {product.data.code}</Badge>
          {product.data.expiredContainers ? (
            <Badge tone="danger" className="gap-1.5 px-3 py-1 text-sm">
              <CalendarX className="size-4" aria-hidden />
              {product.data.expiredContainers === 1 ? '1 frasco vencido' : `${product.data.expiredContainers} frascos vencidos`}
            </Badge>
          ) : null}
          {product.data.expiringContainers ? (
            <Badge tone="warning" className="gap-1.5 px-3 py-1 text-sm">
              <CalendarClock className="size-4" aria-hidden />
              {product.data.expiringContainers === 1 ? '1 frasco por vencer' : `${product.data.expiringContainers} frascos por vencer`}
            </Badge>
          ) : null}
        </div>
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Existencia</span>
          <Quantity
            value={product.data.balance}
            unit={product.data.baseUnit}
            className={cn('text-3xl font-bold tracking-tight', noStock ? 'text-ink-subtle' : 'text-action')}
          />
          <span className="text-sm text-ink-muted">
            {noStock
              ? 'Sin existencias'
              : product.data.containersWithStock === 1
                ? 'en 1 frasco con saldo'
                : `en ${product.data.containersWithStock} frascos con saldo`}
          </span>
        </p>
      </section>

      <section aria-labelledby="frascos" className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="frascos" className="text-xl font-bold text-ink">
            Frascos
          </h2>
          <EmptyToggle count={emptyCount} shown={showEmpty} onToggle={() => setShowEmpty(!showEmpty)} noun="vacíos" />
        </div>
        {positions.isPending ? (
          <Skeleton className="h-44 rounded-card" />
        ) : positions.isError ? (
          <QueryErrorState error={positions.error} onRetry={() => void positions.refetch()} />
        ) : visible.length === 0 ? (
          <p className="rounded-panel bg-surface px-4 py-8 text-center text-sm text-ink-muted shadow-raised">
            {containers.length === 0 ? 'Este reactivo aún no tiene frascos. Regístralos con un ingreso.' : 'Todos sus frascos están vacíos.'}
          </p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4">
            {visible.map((position) => (
              <li key={position.id}>
                <ContainerCard
                  position={position}
                  today={today}
                  timeZone={me.workspace.timeZone}
                  allowed={allowed}
                  recommended={position.id === recommendedId}
                  onAction={openSheet}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="historial-reactivo" className="rounded-card bg-surface p-6 shadow-raised md:p-8">
        <h2 id="historial-reactivo" className="text-xl font-bold text-ink">
          Historial del reactivo
        </h2>
        {history.isPending ? (
          <Skeleton className="mt-4 h-24" />
        ) : history.isError ? (
          <QueryErrorState error={history.error} onRetry={() => void history.refetch()} />
        ) : entries.length === 0 ? (
          <StatePanel icon={History} title="Sin movimientos" description="Cada ingreso, salida o ajuste quedará aquí con su responsable." />
        ) : (
          // Línea de tiempo, como en el Resumen: el hilo pasa por detrás de los círculos de icono.
          <ul className="relative mt-5 space-y-6 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-0.5 before:bg-line">
            {entries.map((operation) => (
              <li key={operation.entryId}>
                <ActivityRow
                  type={operation.type}
                  title={operation.container?.code ?? operation.lot.code}
                  detail={[operation.location.code, purposeOf(operation)].filter(Boolean).join(' · ')}
                  quantity={operation.quantity}
                  unit={operation.unit}
                  occurredAt={operation.effectiveAt}
                  actor={responsibleOf(operation)}
                  timeZone={me.workspace.timeZone}
                />
              </li>
            ))}
          </ul>
        )}
        {hasMoreHistory ? (
          <Link
            to={`${base}/movimientos`}
            className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-action transition-colors hover:text-action-hover"
          >
            Ver todos los movimientos
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </section>
    </div>
  );
}
