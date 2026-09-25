import { createQueryClient } from "@/lib/queryClient";
import { HydrationBoundary, dehydrate, noop } from "@tanstack/react-query";
import type { ReactNode, ReactElement } from "react";

interface PrefetchableQuery {
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
}

export async function PrefetchedQueries({
  queries,
  children,
}: Readonly<{
  queries: PrefetchableQuery[];
  children: ReactNode;
}>): Promise<ReactElement> {
  const queryClient = createQueryClient();
  await Promise.all(
    queries.map((query) =>
      queryClient.query({ queryKey: query.queryKey, queryFn: query.queryFn }).then(noop).catch(noop),
    ),
  );
  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
