import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isApiError } from './api';
import { supabase } from './supabase';

interface SessionState {
  session: Session | null;
  /** Mientras se lee la sesión guardada; evita mandar al acceso a quien ya entró. */
  loading: boolean;
  /** La sesión terminó porque la API rechazó la identidad, no porque la persona saliera. */
  expired: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession((previous) => {
        // Otra identidad: la caché no se comparte entre usuarios (02 §8).
        if (previous?.user.id !== next?.user.id) queryClient.clear();
        return next;
      });
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  // Una identidad inválida a mitad de uso es una sesión expirada. El motivo se guarda antes de
  // cerrarla para que la redirección al acceso lo lleve consigo y el aviso no se pierda.
  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        if (event.type === 'updated' && event.action.type === 'error' && isApiError(event.action.error, 'IDENTITY_INVALID')) {
          setExpired(true);
          void supabase.auth.signOut();
        }
      }),
    [queryClient],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      setExpired(false);
      return null;
    }
    return error.status === 400 ? 'El correo o la contraseña no coinciden.' : 'No pudimos iniciar sesión. Vuelve a intentarlo.';
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({ session, loading, expired, signIn, signOut }),
    [session, loading, expired, signIn, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession fuera de SessionProvider');
  return value;
}
