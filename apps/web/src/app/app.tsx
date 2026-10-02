import { Toaster } from '@platlab/ui';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';
import { isApiError } from './api';
import { router } from './router';
import { SessionProvider } from './session';
import { supabase } from './supabase';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // Una identidad inválida a mitad de uso es una sesión expirada: se cierra y se vuelve al acceso.
    onError: (error) => {
      if (isApiError(error, 'IDENTITY_INVALID')) {
        void supabase.auth.signOut().then(() => router.navigate('/acceso?sesion=expirada'));
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: (failures, error) => !isApiError(error) && failures < 2,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RouterProvider router={router} />
        <Toaster />
      </SessionProvider>
    </QueryClientProvider>
  );
}
