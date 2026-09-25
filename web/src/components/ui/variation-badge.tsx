import type { ReactElement } from "react";
import { cn } from "@/lib/utils";
import { Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

type VariationFormat = "percentage" | "absolute";

interface VariationBadgeProps {
  variation: number;
  format?: VariationFormat;
  decimals?: number;
  showSign?: boolean;
  className?: string;
}

type VariationDirection = "up" | "down" | "flat";

const DIRECTION_CLASSES: Record<VariationDirection, string> = {
  up: "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/15",
  down: "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/15",
  flat: "text-muted-foreground bg-muted",
};

const DIRECTION_ICONS: Record<VariationDirection, LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

function variationDirection(variation: number): VariationDirection {
  if (variation > 0) {
    return "up";
  }
  if (variation < 0) {
    return "down";
  }
  return "flat";
}

function formatVariation(
  variation: number,
  format: VariationFormat,
  decimals: number,
  showSign: boolean,
): string {
  if (format === "percentage") {
    return `${variation.toFixed(decimals)}%`;
  }
  const sign = showSign && variation > 0 ? "+" : "";
  return `${sign}${variation.toLocaleString("es-AR", { maximumFractionDigits: decimals })}`;
}

export function VariationBadge({
  variation,
  format = "percentage",
  decimals = 2,
  showSign = false,
  className,
}: Readonly<VariationBadgeProps>): ReactElement {
  const direction = variationDirection(variation);
  const DirectionIcon = DIRECTION_ICONS[direction];

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-sm px-2 py-1 rounded-full",
        DIRECTION_CLASSES[direction],
        className,
      )}
    >
      <DirectionIcon className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{formatVariation(variation, format, decimals, showSign)}</span>
    </div>
  );
}
