/** Fechas y horas en la zona del espacio, nunca en la del navegador (03 §3: zona IANA del espacio). */
export function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es-EC', { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
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
