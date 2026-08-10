import { QueryClient } from '@tanstack/react-query';

// Single QueryClient instance shared by the app and the auth store. The store
// calls queryClient.clear() on logout and tenant switch so cached data from a
// previous tenant/session can never leak into the next one.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
