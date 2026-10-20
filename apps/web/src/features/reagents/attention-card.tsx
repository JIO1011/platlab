import type { StockedProduct } from '@platlab/contracts';
import { Badge, Quantity, Skeleton, StatePanel } from '@platlab/ui';
import { ArrowRight, CalendarClock, CircleCheck, TrendingDown, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { CodeTag } from '../../app/code-tag';
import { QueryErrorState } from '../../app/states';
import { useReagents } from './context';

/** Cuántos reactivos muestra el Resumen: los primeros que piden atención. */
const LIMIT = 5;

/** Lo más urgente de un reactivo: frascos vencidos, luego bajo mínimo y, al final, frascos por vencer (null: nada). */
const urgency = (product: StockedProduct) =>
  product.expiredContainers > 0 ? 0 : product.belowMinimum ? 1 : product.expiringContainers > 0 ? 2 : null;

/** Medidas de las pastillas, las mismas de la tarjeta del Inventario. */
const pill = 'whitespace-nowrap px-2 py-0.5 text-[11px]';

/** Dice por qué pide atención: los frascos vencidos y por vencer o, si no tiene, su existencia frente al mínimo. */
function Detail({ product }: { product: StockedProduct }) {
  const { expiredContainers, expiringContainers } = product;
  if (expiredContainers === 0 && expiringContainers === 0 && product.minimum !== null) {
    return (
      <>
        Existencia <Quantity value={product.balance} unit={product.baseUnit} className="font-medium text-ink" /> · mínimo{' '}
        <Quantity value={product.minimum} unit={product.baseUnit} />
      </>
    );
  }
  return [
    expiredContainers > 0 ? `${expiredContainers} ${expiredContainers === 1 ? 'frasco vencido' : 'frascos vencidos'}` : null,
    expiringContainers > 0 ? `${expiringContainers} por vencer` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * «Por atender» del Resumen de Reactivos (ADR 0021): los primeros cinco reactivos con frascos vencidos, bajo su mínimo
 * o con frascos por vencer, en ese orden. Cada fila dice cuál es el aviso y lleva a la ficha del reactivo. «Ver
 * inventario» lleva a la lista entera. Sin avisos, lo dice.
 */
export function AttentionCard() {
  const { base, products, productList } = useReagents();
  const items = productList
    .flatMap((product) => {
      const rank = urgency(product);
      return rank === null ? [] : [{ product, rank }];
    })
    .sort((a, b) => a.rank - b.rank)
    .slice(0, LIMIT)
    .map((entry) => entry.product);

  return (
    <article aria-labelledby="por-atender" className="flex min-w-0 flex-col rounded-card bg-surface p-5 shadow-raised sm:p-6">
      <h2 id="por-atender" className="text-lg font-bold text-ink">
        Por atender
      </h2>
      {products.isPending ? (
        <div role="status" aria-busy="true" aria-label="Cargando" className="mt-4 grid gap-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-20 rounded-panel" />
          ))}
        </div>
      ) : products.isError ? (
        <QueryErrorState error={products.error} onRetry={() => void products.refetch()} />
      ) : (
        <>
          {items.length === 0 ? (
            <StatePanel
              icon={CircleCheck}
              title="Todo al día"
              description="Ningún reactivo tiene frascos vencidos o por vencer ni está bajo su mínimo."
              className="py-8"
            />
          ) : (
            // Las filas llegan al borde de la tarjeta: el divisor y el foco ocupan todo el ancho.
            <ul aria-label="Reactivos por atender" className="-mx-5 mt-3 divide-y divide-line sm:-mx-6">
              {items.map((product) => (
                <li
                  key={product.id}
                  className="relative flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-5 py-3.5 transition-colors hover:bg-surface-sunken/40 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-action sm:px-6"
                >
                  <div className="min-w-0 flex-1 basis-44">
                    <p className="flex min-w-0 items-center gap-2 font-semibold text-ink">
                      <Link
                        to={`${base}/inventario/${product.id}`}
                        className="min-w-0 truncate after:absolute after:inset-0 focus-visible:outline-none"
                      >
                        {product.name}
                      </Link>
                      <CodeTag>{product.code}</CodeTag>
                    </p>
                    <p className="mt-0.5 break-words text-[13px] text-ink-muted">
                      <Detail product={product} />
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:justify-end">
                    {product.expiredContainers > 0 ? (
                      <Badge tone="danger" className={pill}>
                        <TriangleAlert className="size-3" aria-hidden />
                        {product.expiredContainers === 1 ? '1 vencido' : `${product.expiredContainers} vencidos`}
                      </Badge>
                    ) : null}
                    {product.belowMinimum ? (
                      <Badge tone="warning" className={pill}>
                        <TrendingDown className="size-3" aria-hidden />
                        Bajo mínimo
                      </Badge>
                    ) : null}
                    {product.expiringContainers > 0 ? (
                      <Badge tone="warning" className={pill}>
                        <CalendarClock className="size-3" aria-hidden />
                        {product.expiringContainers} por vencer
                      </Badge>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link
            to={`${base}/inventario`}
            className="mt-4 inline-flex min-h-11 items-center gap-1 self-start rounded-control text-sm font-medium text-action transition-colors hover:text-action-hover sm:min-h-0"
          >
            Ver inventario
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </>
      )}
    </article>
  );
}
