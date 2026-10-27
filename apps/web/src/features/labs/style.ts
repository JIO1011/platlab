/**
 * El oficio de Laboratorios (ADR 0023, «Color de Laboratorios»): formal y sobrio, como su Propuesta. Las tarjetas son
 * blancas, de radio generoso y con una sombra muy suave y larga, sin brillos; la acción principal, en el degradado del
 * negro petróleo. Las clases van completas para que Tailwind las encuentre.
 */
export const softCard =
  'rounded-card bg-surface shadow-[0_0_0_1px_var(--color-line),0_1px_2px_rgb(15_23_42/0.04),0_14px_32px_-20px_rgb(15_23_42/0.16)]';

/** La acción principal de una pantalla: el degradado de la acción al negro petróleo, con una sombra suave del mismo tono. */
export const primaryGradient =
  'border-transparent bg-linear-to-br from-action to-action-deep shadow-md shadow-action/20 hover:from-action-hover hover:to-action-deep active:from-action-pressed';
