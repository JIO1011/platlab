import { containerResponse, type Position, type StockedProduct } from '@platlab/contracts';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router';
import { api } from '../../app/api';
import { formatDate } from '../../app/format';
import { labelUrl, readLabelCode } from '../../app/label-link';
import { LabelFrame } from '../../app/labels/label-frame';
import { LabelSheet } from '../../app/labels/label-sheet';
import { parseIds } from '../../app/labels/selection';
import { useAllItems } from '../../app/labels/use-all-items';
import { usePositions, useProduct } from './queries';
import { NotFound, PageLoading, QueryErrorState } from '../../app/states';
import { useReagents } from './context';

/** Enlace del QR de un frasco: corto (`/q/…`), para que el QR se lea bien impreso (ADR 0012, entrega 4). */
export function containerUrl(workspaceId: string, containerId: string): string {
  return labelUrl('frasco', workspaceId, containerId);
}

/**
 * Destino del QR: resuelve el reactivo del frasco en su espacio (con la sesión y la membresía de
 * quien lo abre) y lleva a su ficha con ese frasco resaltado.
 */
export function FrascoLinkPage() {
  const { code = '' } = useParams();
  const target = readLabelCode(code);
  const container = useQuery({
    queryKey: ['frasco-link', code],
    queryFn: () =>
      api(`/workspaces/${target?.workspaceId ?? ''}/reagents/containers/${target?.id ?? ''}`, { schema: containerResponse }),
    enabled: target !== null,
    retry: false,
  });
  if (!target) return <NotFound />;
  if (container.isPending) return <PageLoading />;
  if (container.isError) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <QueryErrorState error={container.error} onRetry={() => void container.refetch()} />
      </main>
    );
  }
  return (
    <Navigate
      replace
      to={`/e/${target.workspaceId}/reactivos/inventario/${container.data.productId}/frascos/${target.id}`}
    />
  );
}

/** Del reactivo, la etiqueta solo usa el nombre y el CAS: sirve tanto el del inventario como el de la ficha. */
export type LabelProduct = Pick<StockedProduct, 'name' | 'casNumber'>;

/**
 * Etiqueta de un frasco, en el marco común de las etiquetas QR: primero lo que no puede faltar (código y
 * caducidad) y después el reactivo en una línea y el CAS.
 */
export function ContainerLabel({ position, product, url }: { position: Position; product: LabelProduct; url: string }) {
  const code = position.container?.code ?? position.lot.code;
  return (
    <LabelFrame url={url} qrLabel={`Código QR del frasco ${code}`}>
      {/* El código es la identidad del frasco: nunca se corta; uno muy largo pasa de línea. */}
      <p className="break-all font-mono text-[9pt] font-bold leading-tight tabular-nums">{code}</p>
      <p className="mt-[0.5mm] text-[7.5pt] font-semibold">
        {position.lot.expiresOn ? `Caduca ${formatDate(position.lot.expiresOn)}` : 'Caducidad sin confirmar'}
      </p>
      <p className="mt-[1mm] line-clamp-1 text-[8.5pt] font-semibold">{product.name}</p>
      {product.casNumber ? <p className="text-[7.5pt]">CAS {product.casNumber}</p> : null}
    </LabelFrame>
  );
}

/**
 * Etiquetas de un reactivo (ADR 0012, entrega 4): una por frasco con saldo, todas elegidas salvo que
 * se llegue con `?frascos=` (por ejemplo, tras un ingreso).
 */
export function ReagentsLabelsPage() {
  const { productId = '' } = useParams();
  const { workspaceId, base } = useReagents();
  const [params] = useSearchParams();
  const product = useProduct(workspaceId, productId);
  const positions = usePositions(workspaceId, productId);
  const all = useAllItems(positions);
  const items = useMemo(
    () =>
      product.data
        ? all.items.flatMap((position) =>
            position.container && position.balance !== '0'
              ? [
                  {
                    id: position.container.id,
                    code: position.container.code,
                    label: <ContainerLabel position={position} product={product.data} url={containerUrl(workspaceId, position.container.id)} />,
                  },
                ]
              : [],
          )
        : [],
    [all.items, product.data, workspaceId],
  );

  if (product.isError) return <QueryErrorState error={product.error} onRetry={() => void product.refetch()} />;
  if (positions.isError) return <QueryErrorState error={positions.error} onRetry={() => void positions.refetch()} />;

  return (
    <LabelSheet
      items={items}
      loading={product.isPending || all.loading}
      preselected={parseIds(params.get('frascos'))}
      back={{ to: `${base}/inventario/${productId}`, label: 'Volver a la ficha' }}
      hint="Para hojas A4 adhesivas de 3 × 8 (63,5 × 33,9 mm). El QR abre el frasco en PlatLab con la cámara del móvil."
      empty="Este reactivo no tiene frascos con saldo."
    />
  );
}
