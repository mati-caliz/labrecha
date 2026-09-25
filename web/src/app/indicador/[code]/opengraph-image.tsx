import { formatDateAR, getIndicatorDisplay, sourceLabel } from "@/lib/indicators";
import type { IndicatorSeries } from "@/lib/labrechaApi";
import { OG_COLORS, OG_CONTENT_TYPE, OG_SIZE, OgBrand } from "@/lib/ogImage";
import { serverGet } from "@/lib/serverApi";
import { ImageResponse } from "next/og";
import { hasText } from "@/lib/utils";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Indicador de La Brecha";

const COLORS = OG_COLORS;
const SERIES_POINTS = 48;
const REVALIDATE_SECONDS = 1800;
const SPARKLINE_WIDTH = 1080;
const SPARKLINE_HEIGHT = 200;

function sparklinePath(values: number[], width: number, height: number): string {
  if (values.length < 2) {
    return "";
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const span = range === 0 ? 1 : range;
  const step = width / (values.length - 1);
  return values
    .map((value, index) => {
      const pointX = index * step;
      const pointY = height - ((value - min) / span) * height;
      return `${index === 0 ? "M" : "L"} ${pointX.toFixed(1)} ${pointY.toFixed(1)}`;
    })
    .join(" ");
}

export default async function Image({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<ImageResponse> {
  const { code } = await params;
  const indicator = getIndicatorDisplay(code);

  let points: { value: number; date: string; source: string }[] = [];
  try {
    const sourceParam = hasText(indicator.preferredSource) ? `&source=${indicator.preferredSource}` : "";
    const series = await serverGet<IndicatorSeries>(
      `/indicators/${code}?limit=${SERIES_POINTS}&order=desc${sourceParam}`,
      REVALIDATE_SECONDS,
    );
    points = series.points
      .map((point) => ({
        value: Number.parseFloat(point.value),
        date: point.date,
        source: point.source,
      }))
      .filter((point) => Number.isFinite(point.value));
  } catch {
    points = [];
  }

  const latest = points[0];
  const ascending = [...points].reverse().map((point) => point.value);
  const path = sparklinePath(ascending, SPARKLINE_WIDTH, SPARKLINE_HEIGHT);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: COLORS.bg,
        padding: 56,
        fontFamily: "sans-serif",
      }}
    >
      <OgBrand />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", fontSize: 38, fontWeight: 600, color: COLORS.muted }}>
          {indicator.label}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
          <div
            style={{
              display: "flex",
              fontSize: 120,
              fontWeight: 700,
              color: COLORS.ink,
              lineHeight: 1,
            }}
          >
            {latest ? indicator.format(latest.value) : "—"}
          </div>
          {hasText(indicator.unit) && (
            <div style={{ display: "flex", fontSize: 40, color: COLORS.muted, paddingBottom: 16 }}>
              {indicator.unit}
            </div>
          )}
        </div>
        {latest && (
          <div style={{ display: "flex", fontSize: 26, color: COLORS.muted }}>
            Fuente {sourceLabel(latest.source)} · {formatDateAR(latest.date)}
          </div>
        )}
      </div>

      <svg
        width={SPARKLINE_WIDTH}
        height={SPARKLINE_HEIGHT}
        viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
        role="img"
        aria-label="Serie histórica"
      >
        {path && <path d={path} fill="none" stroke={COLORS.accent} strokeWidth={5} />}
      </svg>
    </div>,
    size,
  );
}
