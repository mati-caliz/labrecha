import { createQueryClient } from "@/lib/queryClient";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import type { ReactNode } from "react";

interface PrefetchableQuery {
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
}

export async function PrefetchedQueries({
  queries,
  children,
}: {
  queries: PrefetchableQuery[];
  children: ReactNode;
}) {
  const queryClient = createQueryClient();
  await Promise.all(
    queries.map((query) => queryClient.prefetchQuery({ queryKey: query.queryKey, queryFn: query.queryFn })),
  );
  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
