import type { Asset, AssetCondition, AssetConservation } from '@platlab/contracts';

/** Cómo se llama cada condición en pantalla (ADR 0019): siempre con texto, nunca solo con color. */
export const conditionLabel: Record<AssetCondition, string> = {
  operational: 'Operativo',
  restricted: 'Con restricción',
  faulted: 'Fuera de servicio',
  retired: 'Dado de baja',
};

/** El tono de estado de cada condición: «Dado de baja» es definitivo y no alarma, por eso neutro. */
export const conditionTone: Record<AssetCondition, 'success' | 'warning' | 'danger' | 'neutral'> = {
  operational: 'success',
  restricted: 'warning',
  faulted: 'danger',
  retired: 'neutral',
};

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

/** «12 equipos», «1 equipo»; con más páginas por pedir, «50+ equipos» (no se conoce el total). */
export function assetsText(count: number, more: boolean): string {
  return `${new Intl.NumberFormat('es-EC').format(count)}${more ? '+' : ''} ${count === 1 && !more ? 'equipo' : 'equipos'}`;
}

/** La conservación del equipo (su estado físico) en pantalla; `null` es «sin dato». */
export const conservationLabel: Record<AssetConservation, string> = {
  good: 'Bueno',
  fair: 'Regular',
  poor: 'Malo',
};
