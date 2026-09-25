import { OG_CONTENT_TYPE, OG_SIZE, OgFrame, OgHeadline } from "@/lib/ogImage";
import { ImageResponse } from "next/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Cuánto rinde tu plata en el tiempo";

export default function Image(): ImageResponse {
  return new ImageResponse(
    <OgFrame>
      <OgHeadline
        eyebrow="Interés compuesto"
        title="Cuánto rinde tu plata en el tiempo"
        footnote="Con las tasas que publica el BCRA."
      />
    </OgFrame>,
    size,
  );
}
