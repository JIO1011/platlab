import type { Position, StockedProduct } from '@platlab/contracts';
import { Badge, Button, IconChip, Input, Quantity, Skeleton, StatePanel, cn, ratioPercent } from '@platlab/ui';
import {
  ArrowUpFromLine,
  Box,
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
import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ActivityRow } from '../../app/activity-row';
import { formatDate } from '../../app/format';
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
          <Skeleton key={key} className="h-52 rounded-card" />
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
 * Tarjeta de catálogo (ADR 0010, 04-10-2026): chip de icono, rótulo y CAS, nombre, y abajo la cifra
 * principal en el acento del módulo con su píldora. El color es el del módulo; un reactivo sin
 * existencias pasa a neutro y ámbar, que son estados y se dicen también con texto.
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
      {/* Marca de agua, como en ReactiLab: decorativa y casi invisible. */}
      <FlaskConical
        className="pointer-events-none absolute -bottom-5 -right-5 size-32 text-surface-sunken transition-[color,transform] duration-500 group-hover:text-action-soft motion-safe:group-hover:scale-110"
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        <IconChip icon={(state && physicalStateIcon[state]) || FlaskConical} tone={empty ? 'neutral' : 'accent'} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
            <span>{(state && physicalStateLabel[state]) ?? 'Reactivo'}</span>
            {product.casNumber ? (
              <span className="ml-auto font-medium normal-case tracking-normal tabular-nums">CAS {product.casNumber}</span>
            ) : null}
          </p>
          <h2 className="mt-1 text-lg font-bold leading-snug text-ink transition-colors group-hover:text-action">{product.name}</h2>
          <p className="mt-0.5 text-[13px] text-ink-muted">{product.code}</p>
          {/* Avisos de caducidad con texto (ADR 0012, 05-10-2026): rojo lo vencido, ámbar lo próximo. */}
          {product.expiredContainers || product.expiringContainers ? (
            <p className="mt-2 flex flex-wrap gap-1.5">
              {product.expiredContainers ? (
                <Badge tone="danger" className="gap-1">
                  <CalendarX className="size-3.5" aria-hidden />
                  {product.expiredContainers === 1 ? '1 vencido' : `${product.expiredContainers} vencidos`}
                </Badge>
              ) : null}
              {product.expiringContainers ? (
                <Badge tone="warning" className="gap-1">
                  <CalendarClock className="size-3.5" aria-hidden />
                  {product.expiringContainers} por vencer
                </Badge>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
      <div className="relative mt-auto border-t border-line pt-4">
        {/* La píldora comparte fila con «Total»: la cifra siempre tiene su propia línea y todas las
            tarjetas tienen la misma estructura, sea cual sea el ancho del número. */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Total</p>
          <Badge tone={empty ? 'warning' : 'info'} className="gap-1.5 whitespace-nowrap px-2.5 py-1 text-[13px]">
            {empty ? <CircleAlert className="size-4" aria-hidden /> : <Layers className="size-4" aria-hidden />}
            {empty ? 'Sin existencias' : frascos}
          </Badge>
        </div>
        <Quantity
          value={product.balance}
          unit={product.baseUnit}
          // Un saldo muy largo baja la unidad a otra línea en lugar de salirse de la tarjeta.
          className={cn('mt-1.5 block whitespace-normal text-3xl font-bold tracking-tight', empty ? 'text-ink-subtle' : 'text-action')}
        />
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
  if (expiresOn === null) return <Badge tone="warning">{icon}Caducidad sin confirmar</Badge>;
  if (expiresOn < today) return <Badge tone="danger">{icon}Venció el {formatDate(expiresOn)}</Badge>;
  return <Badge>{icon}Caduca {formatDate(expiresOn)}</Badge>;
}

/**
 * Un frasco en la ficha (ADR 0012), con el aspecto de la tarjeta de frasco de ReactiLab: etiquetas
 * en píldoras con icono (ubicación, caducidad), código y saldo grande en el acento, barra de lo que
 * queda y acciones compactas. El borde cuenta el estado: verde el que conviene usar primero (FEFO),
 * rojo el vencido, ámbar el vacío; todos con su texto. La barra mide el % restante con aritmética exacta.
 */
function ContainerCard({
  position,
  today,
  allowed,
  recommended,
  onAction,
}: {
  position: Position;
  today: string;
  allowed: Allowed;
  recommended: boolean;
  onAction: (request: SheetRequest) => void;
}) {
  const initial = position.container?.initialQuantity ?? null;
  const percent = initial ? ratioPercent(position.balance, initial) : null;
  const empty = position.balance === '0';
  const expired = position.lot.expiresOn !== null && position.lot.expiresOn < today;
  // Lo apartado por solicitudes no se puede sacar (ADR 0012); con todo apartado, no hay «Salida».
  const reserved = position.reserved !== '0';
  const available = availableOf(position);
  // Con saldo pero menos del 1 %, se dice y se ve: un frasco casi vacío no es un frasco vacío.
  const percentText = percent === 0 && !empty ? '<1 %' : `${percent ?? 0} %`;
  const condition = conditionLabel[position.lot.condition];
  return (
    <article
      className={cn(
        'group relative flex h-full flex-col rounded-card p-5 shadow-raised transition-[transform,box-shadow] duration-200 ease-out-expo hover:shadow-float motion-safe:hover:-translate-y-0.5',
        recommended
          ? 'bg-surface ring-2 ring-success/40'
          : expired
            ? 'bg-danger-soft/40 ring-1 ring-danger/30'
            : empty
              ? 'bg-warning-soft/40 ring-1 ring-warning/40'
              : 'bg-surface',
      )}
    >
      {recommended ? (
        <span className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-0.5 text-xs font-bold text-on-action shadow-sm">
          <Check className="size-3" aria-hidden />
          FEFO
          <span className="sr-only"> (vence antes: conviene usarlo primero)</span>
        </span>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        <Badge className="gap-1.5 py-1">
          <MapPin className="size-3" aria-hidden />
          {position.location.name} · {position.location.code}
        </Badge>
        <ExpiryBadge expiresOn={position.lot.expiresOn} today={today} />
        {condition ? <Badge tone={condition.tone}>{condition.text}</Badge> : null}
        {reserved ? (
          <Badge tone="info">
            <Quantity value={position.reserved} unit={position.unit} /> apartados
          </Badge>
        ) : null}
      </div>
      {/* El código es la identidad de la etiqueta: nunca se parte; si no cabe, el saldo baja. */}
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="whitespace-nowrap text-lg font-bold tabular-nums leading-tight text-ink">
          {position.container?.code ?? position.lot.code}
        </h3>
        <Quantity
          value={position.balance}
          unit={position.unit}
          className={cn('text-2xl font-black tracking-tight', empty ? 'text-warning' : 'text-action')}
        />
      </div>
      {percent !== null && initial ? (
        <div className="mt-4">
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
          <p className="mt-1.5 flex justify-between text-xs text-ink-muted">
            <span>
              Entró con <Quantity value={initial} unit={position.unit} />
            </span>
            <span className="font-semibold tabular-nums">{percentText}</span>
          </p>
        </div>
      ) : null}
      {(allowed.issue && available !== '0') || allowed.adjustment ? (
        <div className="mt-auto pt-5">
          <div className="flex gap-2 border-t border-line pt-4">
            {allowed.issue && available !== '0' ? (
              // Acento en tono suave: la única primaria de la ficha es la de la cabecera.
              <Button
                size="sm"
                className="flex-1 border-action/30 font-bold text-action hover:bg-action-soft max-lg:h-11"
                onClick={() => onAction({ kind: 'issue', positionId: position.id })}
              >
                <ArrowUpFromLine aria-hidden />
                Salida
              </Button>
            ) : null}
            {allowed.adjustment ? (
              <Button
                size="sm"
                aria-label="Ajustar"
                title="Ajustar existencias"
                className="px-2.5 text-ink-muted hover:border-warning/40 hover:bg-warning-soft hover:text-warning max-lg:h-11 max-lg:px-3.5"
                onClick={() => onAction({ kind: 'adjustment', positionId: position.id })}
              >
                <Scale aria-hidden />
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function ReagentsProductPage() {
  const { productId = '' } = useParams();
  const { workspaceId, me, allowed, openSheet } = useReagents();
  const product = useProduct(workspaceId, productId);
  const positions = usePositions(workspaceId, productId);
  const history = useOperations(workspaceId, { productId });
  const [showEmpty, setShowEmpty] = useState(false);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: me.workspace.timeZone }).format(new Date());
  const containers = useMemo(() => positions.data?.pages.flatMap((page) => page.items) ?? [], [positions.data]);
  const emptyCount = containers.filter((position) => position.balance === '0').length;
  const visible = containers.filter((position) => showEmpty || position.balance !== '0');
  const entries = history.data?.pages.flatMap((page) => page.items).slice(0, 10) ?? [];

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
  const facts = [
    { label: 'Código', value: product.data.code },
    { label: 'CAS', value: product.data.casNumber ?? 'Sin CAS' },
    { label: 'Estado físico', value: state ? physicalStateLabel[state] : 'Sin indicar' },
  ];
  // El frasco que conviene usar primero: la misma sugerencia FEFO que preselecciona la hoja de salida.
  const recommendedId = fefoCandidates(containers, productId, today)[0]?.id;

  return (
    <div className="grid gap-6">
      <section
        aria-label="Resumen del reactivo"
        className="relative overflow-hidden rounded-card bg-surface p-6 shadow-raised md:p-8"
      >
        {/* Marca de agua, como en la tarjeta de ReactiLab: decorativa y casi invisible. */}
        <FlaskConical className="pointer-events-none absolute -bottom-8 -right-6 size-44 text-surface-sunken" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="flex items-center gap-4">
            <IconChip
              icon={(state && physicalStateIcon[state]) || FlaskConical}
              tone={noStock ? 'neutral' : 'accent'}
              className="size-14 rounded-2xl [&>svg]:size-7"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Existencia</p>
              <Quantity
                value={product.data.balance}
                unit={product.data.baseUnit}
                className={cn('mt-1 block text-4xl font-black tracking-tight', noStock ? 'text-ink-subtle' : 'text-action')}
              />
            </div>
          </div>
          <Badge tone={noStock ? 'warning' : 'info'} className="gap-1.5 px-3 py-1.5 text-[13px]">
            {noStock ? <CircleAlert className="size-4" aria-hidden /> : <Layers className="size-4" aria-hidden />}
            {noStock
              ? 'Sin existencias'
              : product.data.containersWithStock === 1
                ? '1 frasco con saldo'
                : `${product.data.containersWithStock} frascos con saldo`}
          </Badge>
        </div>
        <dl className="relative mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
          {facts.map((fact) => (
            <div key={fact.label} className="inline-flex min-w-0 items-center gap-2 rounded-full bg-surface-sunken px-3.5 py-1.5 text-sm">
              <dt className="text-ink-muted">{fact.label}</dt>
              <dd className="truncate font-semibold tabular-nums text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
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
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-4">
            {visible.map((position) => (
              <li key={position.id}>
                <ContainerCard
                  position={position}
                  today={today}
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
      </section>
    </div>
  );
}
