import type { ReactElement } from "react";
import { EmbeddedIndicator } from "@/components/indicator/EmbeddedIndicator";
import { indicatorSeriesQuery } from "@/lib/queries";
import type { Metadata } from "next";

const EMBED_POINTS = 180;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface EmbedPageProps {
  params: Promise<{ code: string }>;
}

export default async function EmbedIndicatorPage({
  params,
}: Readonly<EmbedPageProps>): Promise<ReactElement> {
  const { code } = await params;
  const series = await indicatorSeriesQuery(code, { limit: EMBED_POINTS, order: "asc" })
    .queryFn()
    .catch(() => ({ indicator_code: code, points: [] }));

  return <EmbeddedIndicator code={code} points={series.points} />;
}
