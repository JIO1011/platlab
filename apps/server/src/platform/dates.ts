/** El día civil de un instante en la zona IANA del espacio, `YYYY-MM-DD` (en-CA lo escribe así; 03 §3). */
export const dayIn = (at: Date | string, timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(at));

/** Hoy en la zona del espacio, `YYYY-MM-DD`. */
export const todayIn = (timeZone: string) => dayIn(new Date(), timeZone);

/** Un día civil `YYYY-MM-DD` más `days` días, contados en UTC para que no influya la zona del servidor. */
export const addDays = (day: string, days: number) => new Date(Date.parse(day) + days * 86_400_000).toISOString().slice(0, 10);
