import { QueryClient } from '@tanstack/react-query';

// Single QueryClient instance shared by the app and the auth store. The store
// calls queryClient.clear() on logout and tenant switch so cached data from a
// previous tenant/session can never leak into the next one.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 detik: navigasi instan dari cache, background refresh mulus tanpa kedip skeleton
      gcTime: 10 * 60 * 1000, // 10 menit cache data di memori
      refetchOnWindowFocus: true, // Auto sinkronisasi saat user kembali ke tab/layar aplikasi
      refetchOnMount: false, // Jangan buang cache data saat ganti page
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});
