import { Button, Sheet } from '@platlab/ui';
import { CalendarOff } from 'lucide-react';
import { useState } from 'react';
import { useLabsAccess } from './area-access';
import { ClosuresList } from './closures';

/**
 * «Feriados» en la cabecera de Áreas (ADR 0023, solo para quien administra los espacios): abre los cierres comunes a
 * todas las áreas, con «Nuevo feriado» y «Anular».
 */
export function HolidaysAction() {
  const { workspaceId, me, canManage } = useLabsAccess();
  const [open, setOpen] = useState(false);
  if (!me) return null;
  return (
    <>
      <Button className="h-11 sm:h-10" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <CalendarOff aria-hidden />
        Feriados
      </Button>
      <Sheet open={open} onOpenChange={setOpen} icon={CalendarOff} title="Feriados" description="Los días en que no se agenda ninguna área del laboratorio.">
        <ClosuresList
          workspaceId={workspaceId}
          timeZone={me.workspace.timeZone}
          scope={null}
          canManage={canManage}
          heading="Próximos feriados"
          addLabel="Nuevo feriado"
          emptyText={canManage ? 'Sin feriados en el próximo año. Registra los que cierran todo el laboratorio.' : 'Sin feriados en el próximo año.'}
        />
      </Sheet>
    </>
  );
}
