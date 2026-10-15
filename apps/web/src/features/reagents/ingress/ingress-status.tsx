import { CircleCheck } from 'lucide-react';
import type { RefObject } from 'react';
import { missingLabels } from './review';

/**
 * El pie de la hoja: qué falta (con más de dos, un botón que lleva el foco al primero), cuántos datos hay por
 * revisar o, si todo está bien, «Listo» con los frascos que se ingresan.
 */
export function IngressStatus({
  missingFields,
  toReview,
  bottlesLabel,
  bodyRef,
}: {
  missingFields: ReadonlyArray<keyof typeof missingLabels>;
  toReview: number;
  bottlesLabel: string;
  bodyRef: RefObject<HTMLDivElement | null>;
}) {
  const missing = missingFields.length;

  /** Lleva el foco al primer campo que falta: la etiqueta apunta a su control. */
  const focusMissing = () => {
    const first = missingFields[0];
    if (!first) return;
    const wanted = missingLabels[first];
    const label = Array.from(bodyRef.current?.querySelectorAll('label') ?? []).find((node) => node.textContent?.trim().startsWith(wanted));
    const target = label?.htmlFor ? document.getElementById(label.htmlFor) : null;
    target?.focus();
  };

  if (missing > 2) {
    return (
      <button
        type="button"
        onClick={focusMissing}
        className="-my-2 inline-flex min-h-[44px] items-center rounded-[6px] font-medium text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:text-action hover:decoration-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:min-h-0 sm:py-2"
      >
        Faltan {missing} campos
      </button>
    );
  }
  if (missing > 0) {
    return (
      <span>
        {missing === 1 ? 'Falta' : 'Faltan'}: {missingFields.map((key) => missingLabels[key]).join(', ')}
      </span>
    );
  }
  if (toReview > 0) {
    return (
      <span>
        Revisa {toReview} {toReview === 1 ? 'dato' : 'datos'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-success">
      <CircleCheck className="size-4" aria-hidden />
      Listo: {bottlesLabel}
    </span>
  );
}
