import { OG_CONTENT_TYPE, OG_SIZE, OgFrame, OgHeadline } from "@/lib/ogImage";
import { ImageResponse } from "next/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Cuánto valen hoy $100 de entonces";

export default function Image(): ImageResponse {
  return new ImageResponse(
    <OgFrame>
      <OgHeadline
        eyebrow="Ajuste por inflación"
        title="Cuánto valen hoy $100 de entonces"
        footnote="Deflactado con el IPC del INDEC, mes a mes."
      />
    </OgFrame>,
    size,
  );
}
