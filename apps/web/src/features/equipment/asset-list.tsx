import type { Asset } from '@platlab/contracts';
import { IconChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@platlab/ui';
import { MapPin, Microscope, Tag, User } from 'lucide-react';
import { Link } from 'react-router';
import { assetMeta, placeLines } from './asset-text';
import { ConditionBadge } from './condition-badge';

const noResponsible = 'Sin responsable';

/**
 * Miniatura del equipo, siempre de 40 px para que las filas no salten: su foto (`alt` vacío, el nombre ya
 * está en la fila) o, sin foto, un IconChip con el microscopio.
 */
export function AssetThumb({ asset }: { asset: { photoUrl: string | null } }) {
  return asset.photoUrl ? (
    <img
      src={asset.photoUrl}
      alt=""
      loading="lazy"
      decoding="async"
      className="size-10 shrink-0 rounded-control border border-line bg-surface-sunken object-cover"
    />
  ) : (
    <IconChip icon={Microscope} tone="neutral" />
  );
}

/** La ubicación como una dirección: la sala en el color del texto y, debajo, los niveles siguientes en gris. */
function Place({ location }: { location: Asset['location'] }) {
  const place = placeLines(location);
  return (
    <div title={place.full} className="min-w-0 max-w-[14rem]">
      <p className="truncate text-ink">{place.room}</p>
      {place.rest ? <p className="truncate text-[13px] text-ink-muted">{place.rest}</p> : null}
    </div>
  );
}

/**
 * Inventario en tabla (ADR 0019), dentro de una tarjeta. La fila entera abre la ficha: el nombre es el
 * enlace y se extiende sobre la fila. Tipo y Responsable salen a su propia columna cuando la tarjeta
 * mide lo bastante (con el panel de filtros abierto no cabe) y, si no, bajan a una línea del equipo.
 */
export function AssetTable({ assets, base }: { assets: Asset[]; base: string }) {
  return (
    <div className="@container overflow-hidden rounded-card bg-surface shadow-raised">
      <Table>
        <TableHead>
          <tr>
            <TableHeader className="px-3 pl-5">Código</TableHeader>
            <TableHeader className="px-3">Equipo</TableHeader>
            <TableHeader className="hidden px-3 @3xl:table-cell">Tipo</TableHeader>
            <TableHeader className="px-3">Ubicación</TableHeader>
            <TableHeader className="hidden px-3 @3xl:table-cell">Responsable</TableHeader>
            <TableHeader className="px-3 pr-5">Condición</TableHeader>
          </tr>
        </TableHead>
        <TableBody>
          {assets.map((asset) => {
            const meta = assetMeta(asset);
            return (
              <TableRow
                key={asset.id}
                className="relative has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-action"
              >
                <TableCell className="whitespace-nowrap px-3 pl-5 align-top font-mono text-[13px] tabular-nums text-ink-muted">
                  {asset.code}
                </TableCell>
                <TableCell className="min-w-[14rem] max-w-[26rem] px-3 align-top">
                  <div className="flex items-start gap-3">
                    <AssetThumb asset={asset} />
                    <div className="min-w-0">
                      <Link
                        to={`${base}/inventario/${asset.id}`}
                        className="break-words font-semibold text-ink after:absolute after:inset-0 focus-visible:outline-none"
                      >
                        {asset.name}
                      </Link>
                      {meta ? <p className="break-words text-[13px] text-ink-muted">{meta}</p> : null}
                      <p className="text-[13px] text-ink-muted @3xl:hidden">
                        {asset.type.name}
                        {asset.responsible ? ` · ${asset.responsible.name}` : ''}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden px-3 align-top @3xl:table-cell">{asset.type.name}</TableCell>
                <TableCell className="px-3 align-top">
                  <Place location={asset.location} />
                </TableCell>
                <TableCell className="hidden px-3 align-top @3xl:table-cell">
                  {asset.responsible ? (
                    asset.responsible.name
                  ) : (
                    <span className="text-ink-muted">{noResponsible}</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap px-3 pr-5 align-top">
                  <ConditionBadge condition={asset.condition} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/** En pantallas estrechas, cada equipo es una tarjeta apilada que abre su ficha. */
export function AssetCards({ assets, base }: { assets: Asset[]; base: string }) {
  return (
    <ul className="grid gap-3">
      {assets.map((asset) => {
        const meta = assetMeta(asset);
        const place = placeLines(asset.location);
        return (
          <li key={asset.id}>
            <Link
              to={`${base}/inventario/${asset.id}`}
              className="group block rounded-card bg-surface p-4 shadow-raised transition-[transform,box-shadow] duration-200 ease-out-expo hover:shadow-float motion-safe:hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-3">
                <AssetThumb asset={asset} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[13px] tabular-nums text-ink-muted">{asset.code}</span>
                    <ConditionBadge condition={asset.condition} className="shrink-0 whitespace-nowrap" />
                  </div>
                  <p className="mt-1.5 break-words text-[15px] font-bold leading-snug text-ink transition-colors group-hover:text-action">
                    {asset.name}
                  </p>
                  {meta ? <p className="mt-0.5 break-words text-[13px] text-ink-muted">{meta}</p> : null}
                </div>
              </div>
              <div className="mt-3 grid gap-1.5 border-t border-line pt-3 text-[13px] text-ink-muted">
                <p title={place.full} className="flex min-w-0 items-start gap-2">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-ink">{place.room}</span>
                    {place.rest ? <span className="block truncate">{place.rest}</span> : null}
                  </span>
                </p>
                <p className="flex min-w-0 items-center gap-2">
                  <Tag className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{asset.type.name}</span>
                </p>
                <p className="flex min-w-0 items-center gap-2">
                  <User className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{asset.responsible?.name ?? noResponsible}</span>
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
