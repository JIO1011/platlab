import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/** Supabase solo para la identidad: el navegador nunca lee ni escribe tablas (02 §5). */
export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
