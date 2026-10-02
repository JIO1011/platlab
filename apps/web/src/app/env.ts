/**
 * Configuración pública del navegador. Solo valores públicos por diseño (URL de Auth y clave
 * publicable): ningún secreto vive en variables VITE_* (02 §10). Por defecto, Supabase local.
 */
export const env = {
  supabaseUrl: import.meta.env['VITE_SUPABASE_URL'] ?? 'http://127.0.0.1:54321',
  supabasePublishableKey:
    import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
  /** Vacío: mismo origen (proxy de Vite). En producción, el dominio de la API. */
  apiUrl: import.meta.env['VITE_API_URL'] ?? '',
};
