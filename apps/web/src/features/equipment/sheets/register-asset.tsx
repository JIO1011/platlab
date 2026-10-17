import { Button } from '@platlab/ui';
import { Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useEquipment } from '../context';
import { AssetFormSheet } from './asset-sheet';

/**
 * Lleva la hoja «Registrar equipo» para quien dibuja el botón (el Resumen y el Inventario): `children`
 * recibe la función que la abre. Cada apertura monta la hoja de nuevo, con el formulario limpio y su
 * propia clave idempotente. Quien lo usa decide si mostrarlo (`canManage`). Con `initialLocationId` (el
 * alta desde un área), la hoja abre con esa ubicación ya elegida.
 */
export function RegisterAsset({ initialLocationId, children }: { initialLocationId?: string | undefined; children: (open: () => void) => ReactNode }) {
  const { workspaceId, base, canManage } = useEquipment();
  const [sheet, setSheet] = useState<{ id: number; open: boolean } | null>(null);
  return (
    <>
      {children(() => setSheet({ id: Date.now(), open: true }))}
      {sheet ? (
        <AssetFormSheet
          key={sheet.id}
          workspaceId={workspaceId}
          open={sheet.open}
          onOpenChange={(open) => setSheet((current) => (current ? { ...current, open } : current))}
          base={base}
          canManage={canManage}
          initialLocationId={initialLocationId}
        />
      ) : null}
    </>
  );
}

/** El botón primario «Registrar equipo», que abre el alta (con la ubicación puesta si se da `initialLocationId`). */
export function RegisterAssetButton({ initialLocationId, className }: { initialLocationId?: string | undefined; className?: string | undefined }) {
  return (
    <RegisterAsset initialLocationId={initialLocationId}>
      {(open) => (
        <Button variant="primary" className={className} onClick={open}>
          <Plus aria-hidden />
          Registrar equipo
        </Button>
      )}
    </RegisterAsset>
  );
}
