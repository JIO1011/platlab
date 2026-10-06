import { encode } from 'uqr';

/**
 * Código QR como SVG de React (sin insertar HTML): un cuadrado por módulo oscuro, nítido al imprimir.
 * Corrección de errores media, para que una etiqueta algo gastada siga leyéndose.
 */
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const { data, size } = encode(value, { ecc: 'M', border: 0 });
  const path = data
    .flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : '')))
    .join('');
  return (
    // `data-value` deja leer en las pruebas el enlace que codifica, sin decodificar la imagen.
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className={className} shapeRendering="crispEdges" data-value={value}>
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}
