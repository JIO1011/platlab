import { useState, type ReactNode } from 'react';
import { ScanSheet } from '../../app/scan/scan-sheet';

/**
 * Lleva la hoja «Escanear etiqueta» para quien dibuja el botón (el Resumen y el Inventario): `children`
 * recibe la función que la abre. Lo puede usar quien ve Equipos; la etiqueta de un equipo o de un frasco
 * lleva a su ficha.
 */
export function EquipmentScan({ children }: { children: (open: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {children(() => setOpen(true))}
      <ScanSheet open={open} onOpenChange={setOpen} description="Apunta la cámara al código QR de un equipo o de un frasco." />
    </>
  );
}
