/** Cuánto cambió una cuenta frente al periodo anterior, en % entero; `null` si antes era cero y ahora no (no hay base). */
export function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) * 100) / previous);
}

/** «3 nov»: la fecha civil del lunes de una semana, sin zona que convertir. */
export function weekLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('es-EC', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)));
}
