import { CACHE_TIMES } from "@/lib/constants";
import { QueryClient } from "@tanstack/react-query";

const RETRY_BASE_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: CACHE_TIMES.REALTIME_STALE,
        refetchOnWindowFocus: false,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(RETRY_BASE_DELAY_MS * 2 ** attemptIndex, MAX_RETRY_DELAY_MS),
      },
      mutations: {
        retry: 1,
      },
    },
  });
}
