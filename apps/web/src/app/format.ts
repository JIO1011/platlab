/** Fechas y horas en la zona del espacio, nunca en la del navegador (03 §3: zona IANA del espacio). */
export function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es-EC', { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

/** Versión corta para listas estrechas: «1 oct, 8:23 p. m.»; el año solo si no es el actual. */
export function formatShortDateTime(iso: string, timeZone: string): string {
  const date = new Date(iso);
  const year = (value: Date) => new Intl.DateTimeFormat('en', { timeZone, year: 'numeric' }).format(value);
  return new Intl.DateTimeFormat('es-EC', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: year(date) === year(new Date()) ? undefined : 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)),
  );
}

/** «hace 2 min»: el tablero nunca promete «en vivo» (01 §7). */
export function formatAgo(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 45) return 'hace un momento';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  return `hace ${Math.round(minutes / 60)} h`;
}
