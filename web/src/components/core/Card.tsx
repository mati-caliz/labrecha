import type { CSSProperties, ReactNode, ReactElement } from "react";

const CARD_BODY_PADDING = 20;

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  pad?: boolean;
  style?: CSSProperties;
}

export function Card({
  title,
  subtitle,
  actions,
  footer,
  children,
  pad = true,
  style,
}: Readonly<CardProps>): ReactElement {
  return (
    <div
      style={{
        background: "var(--raise)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {(Boolean(title) || Boolean(actions)) && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: "16px 20px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>
            {Boolean(title) && (
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "1.0625rem",
                  letterSpacing: "-0.01em",
                  color: "var(--ink)",
                }}
              >
                {title}
              </div>
            )}
            {Boolean(subtitle) && (
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "0.9rem",
                  color: "var(--ink2)",
                  marginTop: 2,
                }}
              >
                {subtitle}
              </div>
            )}
          </div>
          {Boolean(actions) && <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{actions}</div>}
        </div>
      )}
      <div style={{ padding: pad ? CARD_BODY_PADDING : 0, flex: 1 }}>{children}</div>
      {Boolean(footer) && (
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--line)",
            background: "var(--surface)",
            borderRadius: "0 0 10px 10px",
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
