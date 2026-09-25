import type { ReactNode, ReactElement } from "react";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export const OG_COLORS = {
  bg: "#f7f4ee",
  ink: "#1a1f24",
  muted: "#6b7280",
  accent: "#1e4fa3",
  brecha: "#c77b1e",
};

export function OgBrand(): ReactElement {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: OG_COLORS.ink }}>La</div>
      <div style={{ width: 5, height: 30, background: OG_COLORS.brecha, borderRadius: 3 }} />
      <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: OG_COLORS.ink }}>Brecha</div>
      <div style={{ display: "flex", marginLeft: 14, fontSize: 22, color: OG_COLORS.muted }}>
        Observatorio político-económico de Argentina
      </div>
    </div>
  );
}

export function OgFrame({ children }: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: OG_COLORS.bg,
        padding: 56,
        fontFamily: "sans-serif",
      }}
    >
      <OgBrand />
      {children}
    </div>
  );
}

export function OgHeadline({
  eyebrow,
  title,
  footnote,
}: Readonly<{
  eyebrow: string;
  title: string;
  footnote: string;
}>): ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: OG_COLORS.brecha }}>{eyebrow}</div>
      <div
        style={{
          display: "flex",
          fontSize: 74,
          fontWeight: 700,
          color: OG_COLORS.ink,
          lineHeight: 1.05,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", fontSize: 26, color: OG_COLORS.muted }}>{footnote}</div>
    </div>
  );
}
