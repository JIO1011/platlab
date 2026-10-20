import type { MaintenanceIndicators } from '@platlab/contracts';
import { Button, IconChip } from '@platlab/ui';
import { Repeat } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { assetFichaPath } from './asset-path';
import { CodeTag } from '../../app/code-tag';
import { useMaintenance } from './context';
import { replacementReasons } from './indicator-text';
import { Panel } from './panel';
import { ReplacementSheet } from './replacement-sheet';

type Candidate = MaintenanceIndicators['replacement'][number];

/** La hoja de descarte abierta; `n` la monta de nuevo en cada apertura (formulario limpio). */
interface Dismissing {
  n: number;
  open: boolean;
  asset: Candidate['asset'];
}

/**
 * «Evaluar reemplazo» (ADR 0020, M-01c; aviso en tarjeta del Resumen, ADR 0021): los equipos que cumplen alguna de las
 * tres condiciones de 02 §12, cada uno con su motivo por línea. El Administrador descarta el aviso (6 meses, con motivo)
 * o va a la ficha de Equipos a dar de baja. Sin candidatos no hay aviso. Lo que llega con `#reemplazo` se lleva a esta
 * sección.
 */
export function ReplacementSection({ candidates }: { candidates: Candidate[] }) {
  const { workspaceId, me, canReviewReplacement } = useMaintenance();
  const { hash } = useLocation();
  const [dismissing, setDismissing] = useState<Dismissing | null>(null);

  useEffect(() => {
    if (hash !== '#reemplazo') return;
    const section = document.getElementById('reemplazo');
    if (!section) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    section.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  }, [hash]);

  return (
    <>
      {candidates.length === 0 ? null : (
        <Panel
          id="reemplazo"
          title="Evaluar reemplazo"
          icon={<IconChip icon={Repeat} tone="warning" />}
          description="Un equipo aparece si cumplió su vida útil, si lo reparado en 12 meses llega a la mitad de su valor de reposición o si tuvo 3 incidentes en ese tiempo."
        >
          <ul className="divide-y divide-line">
            {candidates.map((candidate) => {
              const { asset } = candidate;
              const ficha = assetFichaPath(me, workspaceId, asset.id, 'historial');
              return (
                <li key={asset.id} className="grid gap-x-4 gap-y-3 py-3.5 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 break-words font-semibold text-ink">
                      <CodeTag>{asset.code}</CodeTag>
                      {ficha ? (
                        <Link to={ficha} className="rounded-[4px] text-ink underline-offset-2 hover:text-action hover:underline">
                          {asset.name}
                        </Link>
                      ) : (
                        asset.name
                      )}
                    </p>
                    {asset.area ? <p className="mt-0.5 text-[13px] text-ink-muted">{asset.area}</p> : null}
                    <ul className="mt-2 grid gap-1 text-sm text-ink">
                      {replacementReasons(candidate).map((reason) => (
                        <li key={reason} className="break-words">
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {canReviewReplacement ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <Button
                        className="h-11 max-md:w-full sm:h-10"
                        aria-haspopup="dialog"
                        aria-label={`Descartar el aviso de ${asset.code}`}
                        onClick={() => setDismissing({ n: (dismissing?.n ?? 0) + 1, open: true, asset })}
                      >
                        Descartar
                      </Button>
                      {ficha ? (
                        <Link
                          to={ficha}
                          aria-label={`Dar de baja en Equipos: ${asset.code}`}
                          className="inline-flex min-h-11 items-center font-medium text-action underline-offset-2 hover:underline sm:min-h-10"
                        >
                          Dar de baja en Equipos
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
      {dismissing ? (
        <ReplacementSheet
          key={dismissing.n}
          workspaceId={workspaceId}
          open={dismissing.open}
          onOpenChange={(open) => setDismissing((current) => (current ? { ...current, open } : current))}
          asset={dismissing.asset}
        />
      ) : null}
    </>
  );
}
