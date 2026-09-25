import { type ThresholdAlert, crossesThreshold, describeAlert, parseThresholdAlert } from "@/lib/feedAlerts";
import { formatDateAR, getIndicatorDisplay, sourceLabel } from "@/lib/indicators";
import type { IndicatorPoint, IndicatorSeries } from "@/lib/labrechaApi";
import { buildRssResponse, toRfc822 } from "@/lib/rss";
import { serverGet } from "@/lib/serverApi";
import { SITE_URL } from "@/lib/site";
import { hasText } from "@/lib/utils";

const REVALIDATE_SECONDS = 1800;
const FEED_POINTS = 30;
const ALERT_POINTS = 400;

function selectPoints(points: IndicatorPoint[], alert: ThresholdAlert | null): IndicatorPoint[] {
  if (alert === null) {
    return points;
  }
  return points
    .filter((point) => {
      const value = Number.parseFloat(point.value);
      return Number.isFinite(value) && crossesThreshold(value, alert);
    })
    .slice(0, FEED_POINTS);
}

function alertTitle(label: string, alert: ThresholdAlert | null, boundary: string): string {
  return alert === null ? `La Brecha — ${label}` : `La Brecha — ${label} ${describeAlert(alert, boundary)}`;
}

function feedDescription(label: string, alert: ThresholdAlert | null, boundary: string): string {
  if (alert === null) {
    return `Cada nuevo dato de ${label} en Argentina, con su fuente y su fecha.`;
  }
  return `Alerta de ${label}: este feed sólo trae los datos en los que ${
    alert.direction === "arriba" ? `superó ${boundary}` : `quedó por debajo de ${boundary}`
  }, con su fuente y su fecha.`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code } = await params;
  const indicator = getIndicatorDisplay(code);
  const pageUrl = `${SITE_URL}/indicador/${code}`;
  const requestUrl = new URL(request.url);
  const alert = parseThresholdAlert(requestUrl.searchParams);

  let series: IndicatorSeries | undefined;
  try {
    series = await serverGet<IndicatorSeries>(
      `/indicators/${code}?limit=${alert === null ? FEED_POINTS : ALERT_POINTS}&order=desc`,
      REVALIDATE_SECONDS,
    );
  } catch {
    series = undefined;
  }

  const points = selectPoints(series?.points ?? [], alert);
  const unitSuffix = hasText(indicator.unit) ? ` ${indicator.unit}` : "";
  const boundary = alert === null ? "" : `${indicator.format(alert.threshold)}${unitSuffix}`;

  return buildRssResponse(
    {
      title: alertTitle(indicator.label, alert, boundary),
      link: pageUrl,
      selfUrl: `${pageUrl}/feed.xml${requestUrl.search}`,
      description: feedDescription(indicator.label, alert, boundary),
      items: points.map((point) => {
        const value = Number.parseFloat(point.value);
        return {
          title: `${indicator.label}: ${indicator.format(value)}${unitSuffix}`,
          link: pageUrl,
          guid: `${code}-${point.source}-${point.date}`,
          pubDate: toRfc822(point.date),
          category: sourceLabel(point.source),
          description: `${indicator.label} del ${formatDateAR(point.date)}: ${indicator.format(value)}${unitSuffix}. Fuente: ${sourceLabel(point.source)}.`,
        };
      }),
    },
    REVALIDATE_SECONDS,
  );
}
