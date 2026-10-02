import { QueryClient } from '@tanstack/react-query'

/** Shared TanStack Query client. Realtime (later phase) invalidates these queries on change. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})
