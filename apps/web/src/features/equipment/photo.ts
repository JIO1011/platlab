import { ASSET_PHOTO_MAX_BYTES } from '@platlab/contracts';

/** Lado mayor de la foto que se sube (ADR 0019, 02 §12): basta para la ficha y pesa unos 300 KB. */
const MAX_SIDE = 1600;
/** Calidades que se prueban, de mejor a menor, hasta que la foto quepa en el límite. */
const QUALITIES = [0.82, 0.7, 0.55];

export type PhotoType = 'image/webp' | 'image/jpeg';

const toBlob = (canvas: HTMLCanvasElement, type: PhotoType, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * Reduce en el navegador la foto elegida o tomada con la cámara (ADR 0019): lado mayor de 1600 px,
 * orientación de la cámara aplicada y WebP; si el navegador no sabe escribir WebP, JPEG. Devuelve null
 * si el archivo no es una imagen que el navegador pueda abrir o si no cabe en 2 MiB.
 */
export async function shrinkPhoto(file: Blob): Promise<{ body: Blob; type: PhotoType } | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return null;
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const type of ['image/webp', 'image/jpeg'] as const) {
    for (const quality of QUALITIES) {
      const blob = await toBlob(canvas, type, quality);
      // Un navegador sin WebP devuelve PNG: se prueba con JPEG.
      if (!blob || blob.type !== type) break;
      if (blob.size <= ASSET_PHOTO_MAX_BYTES) return { body: blob, type };
    }
  }
  return null;
}
