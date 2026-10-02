import { Toaster } from '@platlab/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';
import { isApiError } from './api';
import { router } from './router';
import { SessionProvider } from './session';

// La sesión expirada (IDENTITY_INVALID) la atiende SessionProvider, que conoce el motivo del cierre.
const queryClient = new QueryClient({
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
