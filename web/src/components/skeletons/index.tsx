import type { ReactElement } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DolarCardSkeleton(): ReactElement {
  return (
    <Card className="bg-card">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
        <Skeleton className="h-3 w-32 mt-3" />
      </CardContent>
    </Card>
  );
}
