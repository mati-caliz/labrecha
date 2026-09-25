import { OG_CONTENT_TYPE, OG_SIZE, OgFrame, OgHeadline } from "@/lib/ogImage";
import { ImageResponse } from "next/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Cuánto de lo que gastás es impuesto";

export default function Image(): ImageResponse {
  return new ImageResponse(
    <OgFrame>
      <OgHeadline
        eyebrow="Impacto fiscal"
        title="Cuánto de lo que gastás es impuesto"
        footnote="Sobre datos oficiales de recaudación, con su fuente."
      />
    </OgFrame>,
    size,
  );
}
