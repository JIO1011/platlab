import type { Asset } from '@platlab/contracts';
import { useParams, useSearchParams } from 'react-router';
import { WithBack } from '../../app/back-button';
import { LabelFrame } from '../../app/labels/label-frame';
import { LabelSheet } from '../../app/labels/label-sheet';
import { useAllItems } from '../../app/labels/use-all-items';
import { useShellTrail } from '../../app/shell-trail';
import { QueryErrorState } from '../../app/states';
import { assetLabelUrl } from './asset-link';
import { assetQueryFrom, conditionsOf, emptyAssetQuery } from './asset-filters';
import { pickedBySearch } from './label-selection';
import { useEquipment } from './context';
import { useAreas, useAssets } from './queries';

/**
 * Etiqueta de un equipo, en el marco común de las etiquetas QR: el código (la identidad, nunca se corta), el
 * nombre en hasta dos líneas, la serie si la tiene y, al pie, para qué sirve el QR.
 */
export function EquipmentLabel({ asset, url }: { asset: Pick<Asset, 'code' | 'name' | 'serialNumber'>; url: string }) {
  return (
    <LabelFrame url={url} qrLabel={`Código QR del equipo ${asset.code}`}>
      <p className="break-all font-mono text-[9pt] font-bold leading-tight tabular-nums">{asset.code}</p>
      <p className="mt-[0.5mm] line-clamp-2 break-words text-[8.5pt] font-semibold">{asset.name}</p>
      {asset.serialNumber ? <p className="break-all text-[7.5pt]">Serie {asset.serialNumber}</p> : null}
      <p className="mt-[1.5mm] text-[7pt]">Escanea para reportar una falla</p>
    </LabelFrame>
  );
}

/**
 * Etiquetas QR de los equipos de un área (ADR 0019, E-01d), la vista de impresión del modo etiquetas: trae las
 * unidades del área con el estado (o los activos) y la búsqueda que llegan en la URL, en todas las páginas, y
 * muestra solo las que cumplen la elección (`tipos`, `excluir`, `equipos`), todas elegidas; sin elección, todas.
 * Las migas de la barra suman el área.
 */
export function EquipmentLabelsPage() {
  const { areaId = '' } = useParams();
  const { workspaceId, base } = useEquipment();
  const [params] = useSearchParams();
  const areas = useAreas(workspaceId);
  const query = assetQueryFrom(params);
  const assets = useAssets(workspaceId, {
    ...emptyAssetQuery,
    q: query.q,
    conditions: query.conditions.length > 0 ? query.conditions : conditionsOf(null),
    locations: [areaId],
  });
  const all = useAllItems(assets);
  const area = areas.data?.items.find((entry) => entry.id === areaId);
  const picked = pickedBySearch(params);
  useShellTrail(area ? [{ label: area.name, to: `${base}/inventario/area/${areaId}` }, { label: 'Etiquetas' }] : []);
  const items = all.items
    .filter((asset) => !picked || picked(asset))
    .map((asset) => ({
      id: asset.id,
      code: asset.code,
      label: <EquipmentLabel asset={asset} url={assetLabelUrl(workspaceId, asset.id)} />,
    }));

  if (assets.isError) return <QueryErrorState error={assets.error} onRetry={() => void assets.refetch()} />;

  return (
    <WithBack parent={`${base}/inventario/area/${areaId}`}>
      <LabelSheet
        items={items}
        loading={all.loading}
        preselected={null}
        hint={`${area ? `Equipos de ${area.name}. ` : ''}Para hojas A4 adhesivas de 3 × 8 (63,5 × 33,9 mm). El QR abre el equipo en PlatLab con la cámara del móvil.`}
        empty="No hay equipos para estas etiquetas."
      />
    </WithBack>
  );
}
