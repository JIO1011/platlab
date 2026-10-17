import type { Asset, AssetAvailability, AssetCondition } from '@platlab/contracts';
export { conditionLabel, conservationLabel } from '@platlab/contracts';

/** El tono de cada estado del equipo: «Dado de baja» es definitivo y no alarma, por eso neutro. */
export const conditionTone: Record<AssetCondition, 'success' | 'warning' | 'danger' | 'neutral'> = {
  operational: 'success',
  restricted: 'warning',
  faulted: 'danger',
  retired: 'neutral',
};

/** La disponibilidad del equipo, calculada por el servidor: se dice con texto. */
export const availabilityLabel: Record<AssetAvailability, string> = {
  available: 'Disponible',
  unavailable: 'No disponible',
};

/** «Sin responsable»: el valor `none` del filtro Responsable (E-01c) y el texto de quien no lo tiene. */
export const NO_RESPONSIBLE = 'none';
export const noResponsibleLabel = 'Sin responsable';

/** «marca · modelo · serie»: lo que identifica al equipo bajo su nombre; lo que falta, no se escribe. */
export function assetMeta(asset: Pick<Asset, 'brand' | 'model' | 'serialNumber'>): string {
  return [asset.brand, asset.model, asset.serialNumber ? `Serie ${asset.serialNumber}` : null].filter(Boolean).join(' · ');
}

/**
 * La ubicación como una dirección: la sala (primer nivel del camino) y, debajo, los niveles siguientes
 * unidos por « · ». Sin camino, el nombre de la ubicación.
 */
export function placeLines(location: Pick<Asset['location'], 'name' | 'path'>): { room: string; rest: string; full: string } {
  const levels = location.path.length > 0 ? location.path : [location.name];
  const [room = location.name, ...rest] = levels;
  return { room, rest: rest.join(' · '), full: levels.join(' › ') };
}

/** El lugar dentro de un área: los niveles que siguen a su nombre en el camino; vacío si el equipo está en el área misma. */
export function placeInArea(location: Pick<Asset['location'], 'path'>, areaName: string): string {
  const at = location.path.indexOf(areaName);
  return at < 0 ? '' : location.path.slice(at + 1).join(' · ');
}

/**
 * Las cifras por estado en frases cortas, con el tono de su color: «47 operativos», «2 uso limitado»,
 * «1 fuera de servicio». Lo que está en cero no se escribe.
 */
export function stateParts(counts: { operational: number; restricted: number; faulted: number }): Array<{
  tone: 'success' | 'warning' | 'danger';
  text: string;
}> {
  const number = new Intl.NumberFormat('es-EC');
  return [
    { tone: 'success' as const, count: counts.operational, text: counts.operational === 1 ? 'operativo' : 'operativos' },
    { tone: 'warning' as const, count: counts.restricted, text: 'uso limitado' },
    { tone: 'danger' as const, count: counts.faulted, text: 'fuera de servicio' },
  ]
    .filter((part) => part.count > 0)
    .map(({ tone, count, text }) => ({ tone, text: `${number.format(count)} ${text}` }));
}

/** «12 equipos», «1 equipo»; con más páginas por pedir, «50+ equipos» (no se conoce el total). */
export function assetsText(count: number, more: boolean): string {
  return `${new Intl.NumberFormat('es-EC').format(count)}${more ? '+' : ''} ${count === 1 && !more ? 'equipo' : 'equipos'}`;
}

