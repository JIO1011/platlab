import { Button, Sheet } from '@platlab/ui';
import { ScanLine } from 'lucide-react';
import { useNavigate } from 'react-router';
import { readLabelLink, type LabelLink } from '../label-link';
import { ScannerView, type ScanReading } from './scanner-view';

/** Cualquier etiqueta de PlatLab sirve: la de un frasco abre el frasco; la de un equipo, el equipo. */
function readAnyLabel(text: string): ScanReading<LabelLink> {
  const link = readLabelLink(text);
  if (!link) return { notice: 'Este código no es una etiqueta de PlatLab' };
  return { value: link, found: link.kind === 'frasco' ? 'Etiqueta leída. Abriendo el frasco…' : 'Etiqueta leída. Abriendo el equipo…' };
}

/**
 * Hoja «Escanear etiqueta»: la cámara dentro de la app. El QR de la etiqueta es su enlace corto
 * (`/q/…` o `/q/e/…`); al leerlo se navega a esa ruta, que resuelve el frasco o el equipo y lleva a él.
 */
export function ScanSheet({ open, onOpenChange, description }: { open: boolean; onOpenChange: (open: boolean) => void; description: string }) {
  const navigate = useNavigate();
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Escanear etiqueta"
      description={description}
      icon={ScanLine}
      footer={
        <Button className="w-full" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
      }
    >
      <ScannerView
        active={open}
        read={readAnyLabel}
        onFound={(link) => {
          onOpenChange(false);
          void navigate(link.path);
        }}
      />
    </Sheet>
  );
}
