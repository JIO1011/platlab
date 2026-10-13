// Prototipo R-01D: solo interfaz
export type SdsKind = 'digital' | 'physical' | 'none';

/** Peligros y ficha de seguridad de ejemplo por CAS: el catálogo real aún no los guarda. */
const sample: Record<string, { hazards: string[]; sds: SdsKind }> = {
  '64-17-5': { hazards: ['flammable', 'irritant'], sds: 'digital' },
  '7647-14-5': { hazards: [], sds: 'physical' },
  '7647-01-0': { hazards: ['corrosive', 'irritant'], sds: 'digital' },
  '1310-73-2': { hazards: ['corrosive'], sds: 'digital' },
  '7664-93-9': { hazards: ['corrosive'], sds: 'digital' },
  '67-64-1': { hazards: ['flammable', 'irritant'], sds: 'physical' },
};

export const sampleOf = (cas: string | null) => (cas ? sample[cas] : undefined) ?? { hazards: [], sds: null };
