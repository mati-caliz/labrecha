import type { ReactElement } from "react";
import { BrandMark } from "@/components/layout/SiteHeader";
import { SITE_HOST } from "@/lib/site";
import Link from "next/link";

const SECTION_LINKS = [
  { label: "Indicadores", href: "/indicadores" },
  { label: "Brechas", href: "/brechas" },
  { label: "Tasas", href: "/tasas" },
  { label: "Ideas", href: "/ideas" },
  { label: "Congreso", href: "/congreso" },
  { label: "Noticias", href: "/noticias" },
  { label: "Feriados", href: "/feriados" },
  { label: "Calculadoras", href: "/calculadoras" },
  { label: "Metodología", href: "/metodologia" },
  { label: "API pública", href: "/api-publica" },
];

const SOURCES = "INDEC · BCRA · datos.gob.ar · Congreso de la Nación · consultoras (REM) · UTDT";

export function SiteFooter(): ReactElement {
  const columnTitle = {
    fontFamily: "var(--font-jb-mono)",
    fontSize: "0.7rem",
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: "var(--ink3)",
    marginBottom: 14,
  };

  return (
    <footer style={{ borderTop: "1px solid var(--line)", marginTop: 48, background: "var(--surface)" }}>
      <div
        style={{
          maxWidth: "var(--container-max)",
          margin: "0 auto",
          padding: "44px 24px",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr",
          gap: 40,
        }}
        className="footer-grid"
      >
        <div>
          <div style={{ marginBottom: 14 }}>
            <BrandMark fontSize={19} />
          </div>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "0.9375rem",
              lineHeight: 1.5,
              color: "var(--ink2)",
              margin: 0,
              maxWidth: 340,
            }}
          >
            Observatorio político-económico de la Argentina. Datos abiertos, con fuente y fecha siempre a la
            vista.
          </p>
        </div>
        <div>
          <div style={columnTitle}>Secciones</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {SECTION_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontFamily: "var(--font-jb-mono)",
                  fontSize: "0.8125rem",
                  color: "var(--ink2)",
                  textDecoration: "none",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div style={columnTitle}>Fuentes</div>
          <p
            style={{
              fontFamily: "var(--font-jb-mono)",
              fontSize: "0.75rem",
              lineHeight: 1.9,
              color: "var(--ink2)",
              margin: 0,
            }}
          >
            {SOURCES}
          </p>
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--line)" }}>
        <div
          style={{
            maxWidth: "var(--container-max)",
            margin: "0 auto",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            fontFamily: "var(--font-jb-mono)",
            fontSize: "0.7rem",
            color: "var(--ink3)",
          }}
        >
          <span>
            © {new Date().getFullYear()} La Brecha · {SITE_HOST}
          </span>
          <span>Sin fines de lucro · datos con atribución</span>
        </div>
      </div>
    </footer>
  );
}
