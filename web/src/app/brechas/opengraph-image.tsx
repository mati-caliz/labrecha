import { sourceLabel } from "@/lib/indicators";
import type { SourceGap } from "@/lib/labrechaApi";
import { OG_CONTENT_TYPE, OG_SIZE, OgFrame, OgHeadline } from "@/lib/ogImage";
import { serverGet } from "@/lib/serverApi";
import { ImageResponse } from "next/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Las brechas entre fuentes que miden lo mismo";

const REVALIDATE_SECONDS = 1800;

export default async function Image(): Promise<ImageResponse> {
  let widest: SourceGap | undefined;
  try {
    const gaps = await serverGet<SourceGap[]>("/gaps?limit=1", REVALIDATE_SECONDS);
    widest = gaps[0];
  } catch {
    widest = undefined;
  }

  const footnote =
    widest === undefined
      ? "Cuando dos fuentes miden lo mismo y no dicen lo mismo."
      : `La más ancha hoy: ${sourceLabel(widest.higher_source)} vs ${sourceLabel(widest.lower_source)}`;

  return new ImageResponse(
    <OgFrame>
      <OgHeadline
        eyebrow="Brechas entre mediciones"
        title="Cuando dos fuentes miden lo mismo y no dicen lo mismo"
        footnote={footnote}
      />
    </OgFrame>,
    size,
  );
}
