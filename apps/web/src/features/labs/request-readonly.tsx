import { useLabs } from './context';
import { FormPaper } from './form-paper';
import type { RequestView } from './request-draft';
import { RequestHistory } from './request-history';
import { RequestHolds } from './request-holds';
import { PrintControls, useRequestSheet } from './request-sheet';

/**
 * La hoja del formato con lo que se llenó, de solo lectura (ADR 0023), para quien la envió. Los datos
 * vacíos quedan en blanco. «Imprimir» saca la hoja llena en A4, con su membrete y logo. El área no va: se elige al
 * programar cada fecha en el Cronograma.
 */
export function PaperSheet({ request }: { request: RequestView }) {
  const { me } = useLabs();
  const sheet = useRequestSheet(request);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-end gap-x-4 gap-y-2">
        <PrintControls request={request} sheet={sheet} />
      </div>
      <FormPaper mode="view" draft={sheet.paper} workspaceName={me.workspace.name} revision={request.formRevision} slots={sheet.slots} />
    </div>
  );
}

/** La solicitud llena, de solo lectura, para quien la envió: la hoja y, al pie, lo apartado en cada fecha programada y el historial con sus motivos. */
export function FilledRequest({ request }: { request: RequestView }) {
  const { me } = useLabs();
  return (
    <div className="grid gap-4">
      <PaperSheet request={request} />
      <RequestHolds request={request} />
      <RequestHistory events={request.events} timeZone={me.workspace.timeZone} />
    </div>
  );
}
