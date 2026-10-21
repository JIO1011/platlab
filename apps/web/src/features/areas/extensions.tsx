import { Skeleton, sectionLabel } from '@platlab/ui';
import { Suspense } from 'react';
import { useShell } from '../../app/app-shell';
import { useExtensions } from '../../app/extensions';
import { AREA_MARK, AREA_PANEL, HEADER_ACTION } from './extension-points';

/** Lo que otros módulos aportan a la hoja de un área (ADR 0020): un panel por aporte, con su texto como título. */
export function AreaPanels({ areaId, areaName }: { areaId: string; areaName: string }) {
  const { me } = useShell();
  const panels = useExtensions(AREA_PANEL, me);
  return (
    <>
      {panels.map(({ code, label, Component }) => (
        <section key={code} aria-labelledby={`area-panel-${code}`} className="grid gap-2">
          <h3 id={`area-panel-${code}`} className={sectionLabel}>
            {label}
          </h3>
          <Suspense fallback={<Skeleton className="h-24" />}>
            <Component areaId={areaId} areaName={areaName} />
          </Suspense>
        </section>
      ))}
    </>
  );
}

/** Las marcas de otros módulos en el cuadro de un área; cada una decide si se pinta. */
export function AreaMarks({ areaId }: { areaId: string }) {
  const { me } = useShell();
  const marks = useExtensions(AREA_MARK, me);
  return (
    <>
      {marks.map(({ code, Component }) => (
        <Suspense key={code} fallback={null}>
          <Component areaId={areaId} />
        </Suspense>
      ))}
    </>
  );
}

/** Las acciones de otros módulos en la cabecera de Áreas. */
export function HeaderActions() {
  const { me } = useShell();
  const actions = useExtensions(HEADER_ACTION, me);
  return (
    <>
      {actions.map(({ code, Component }) => (
        <Suspense key={code} fallback={null}>
          <Component />
        </Suspense>
      ))}
    </>
  );
}
