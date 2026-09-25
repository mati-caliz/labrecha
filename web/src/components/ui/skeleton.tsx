import type { ReactElement } from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, style, ...props }: Readonly<SkeletonProps>): ReactElement {
  return (
    <div className={cn("animate-pulse rounded-md bg-gray-800/50", className)} style={style} {...props} />
  );
}

export function SkeletonText({
  className,
  lines = 1,
}: Readonly<{ className?: string; lines?: number }>): ReactElement {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => i).map((i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 && lines > 1 ? "w-3/4" : "w-full")} />
      ))}
    </div>
  );
}

export function SkeletonCircle({
  className,
  size = "md",
}: Readonly<{
  className?: string;
  size?: "sm" | "md" | "lg";
}>): ReactElement {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  return <Skeleton className={cn("rounded-full", sizeClasses[size], className)} />;
}

export function SkeletonButton({ className }: Readonly<SkeletonProps>): ReactElement {
  return <Skeleton className={cn("h-10 w-24 rounded-md", className)} />;
}

export function SkeletonInput({ className }: Readonly<SkeletonProps>): ReactElement {
  return <Skeleton className={cn("h-10 w-full rounded-md", className)} />;
}

export function SkeletonAvatar({ className }: Readonly<SkeletonProps>): ReactElement {
  return <Skeleton className={cn("h-10 w-10 rounded-full", className)} />;
}
