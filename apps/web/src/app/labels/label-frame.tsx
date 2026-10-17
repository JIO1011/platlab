import type { ReactNode } from 'react';
import { QrCode } from '../qr-code';

/**
 * Marco de toda etiqueta QR de PlatLab, de 63,5 × 33,9 mm (la hoja A4 adhesiva de 3 × 8): borde punteado, el
 * QR de 22 mm a la izquierda y, a la derecha, el texto de cada módulo (`children`). Negro sobre blanco, para
 * cualquier impresora.
 */
export function LabelFrame({ url, qrLabel, children }: { url: string; qrLabel: string; children: ReactNode }) {
  return (
    <div className="flex h-[33.9mm] w-[63.5mm] items-center gap-[3mm] overflow-hidden rounded-[2mm] border border-dashed border-line-strong bg-white p-[3mm] text-black print:border-black/50">
      <QrCode value={url} label={qrLabel} className="size-[22mm] shrink-0" />
      <div className="min-w-0 flex-1 leading-tight">{children}</div>
    </div>
  );
}
