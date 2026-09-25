import { formatDateAR, formatNumberAR, getIndicatorDisplay, sourceLabel } from "@/lib/indicators";
import type { SourceGap } from "@/lib/labrechaApi";
import { buildRssResponse, toRfc822 } from "@/lib/rss";
import { serverGet } from "@/lib/serverApi";
import { SITE_URL } from "@/lib/site";

const REVALIDATE_SECONDS = 1800;
const DEFAULT_THRESHOLD_PCT = 1;

function parseThreshold(request: Request): number {
  const raw = new URL(request.url).searchParams.get("min");
  const parsed = raw === null ? Number.NaN : Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_THRESHOLD_PCT;
}

export async function GET(request: Request): Promise<Response> {
  const threshold = parseThreshold(request);

  let gaps: SourceGap[] = [];
  try {
    gaps = await serverGet<SourceGap[]>("/gaps", REVALIDATE_SECONDS);
  } catch {
    gaps = [];
  }

  const alerted = gaps.filter((gap) => Math.abs(gap.gap_pct) >= threshold);

  return buildRssResponse(
    {
      title: "La Brecha — discrepancias entre fuentes",
      link: `${SITE_URL}/brechas`,
      selfUrl: `${SITE_URL}/brechas.xml?min=${threshold}`,
      description: `Aviso cuando dos fuentes que miden el mismo indicador difieren en ${formatNumberAR(threshold, 2)}% o más. Cambiá el umbral con ?min=5.`,
      items: alerted.map((gap) => {
        const indicator = getIndicatorDisplay(gap.indicator_code);
        const higher = Number.parseFloat(gap.higher_value);
        const lower = Number.parseFloat(gap.lower_value);
        const pct = formatNumberAR(Math.abs(gap.gap_pct), 2);
        return {
          title: `${indicator.label}: ${pct}% de brecha entre ${sourceLabel(gap.higher_source)} y ${sourceLabel(gap.lower_source)}`,
          link: `${SITE_URL}/indicador/${gap.indicator_code}`,
          guid: `${gap.indicator_code}-${gap.date}-${pct}`,
          pubDate: toRfc822(gap.date),
          category: indicator.label,
          description: `Al ${formatDateAR(gap.date)}, ${sourceLabel(gap.higher_source)} midió ${indicator.format(higher)} y ${sourceLabel(gap.lower_source)} midió ${indicator.format(lower)}: ${pct}% de discrepancia sobre la misma fecha.`,
        };
      }),
    },
    REVALIDATE_SECONDS,
  );
}
