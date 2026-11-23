/**
 * Una captura de la demo, ya recortada a lo importante. La generan `scripts/capturar.mjs`
 * y su manifiesto; el sitio solo lee lo que necesita para mostrarla.
 */
export type Toma = {
  id: string;
  /** Ruta bajo /capturas/. */
  archivo: string;
  /** Tamaño en píxeles CSS de la captura (la imagen guardada es 2×). */
  ancho: number;
  alto: number;
  alt: string;
};

export type Manifiesto = Record<string, Toma>;
