import { OG_CONTENT_TYPE, OG_SIZE, OgFrame, OgHeadline } from "@/lib/ogImage";
import { ImageResponse } from "next/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Cuánto te queda después de Ganancias";

export default function Image(): ImageResponse {
  return new ImageResponse(
    <OgFrame>
      <OgHeadline
        eyebrow="Sueldo neto"
        title="Cuánto te queda después de Ganancias"
        footnote="Con la escala vigente de ARCA y su fecha, siempre a la vista."
      />
    </OgFrame>,
    size,
  );
}
