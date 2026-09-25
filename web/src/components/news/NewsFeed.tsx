"use client";

import { QueryError } from "@/components/QueryError";
import { Skeleton } from "@/components/ui/skeleton";
import { useNews } from "@/hooks/useLabrecha";
import type { NewsArticle } from "@/lib/labrechaApi";
import { NEWS_LIMIT } from "@/lib/queryParams";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";

const MONO = "var(--font-jb-mono)";

const CATEGORY_LABELS: Record<string, string> = {
  ECONOMY_GENERAL: "Economía",
  MARKETS: "Mercados",
  FINANCE: "Finanzas",
  ENERGY: "Energía",
  POLITICS: "Política",
};

const SKELETON_KEYS = ["n1", "n2", "n3", "n4", "n5", "n6"];

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, " ").toLowerCase();
}

function formatPublished(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NewsImage({ article, ratio, width }: { article: NewsArticle; ratio: string; width?: number }) {
  const [failed, setFailed] = useState(false);
  if (!article.image_url || failed) {
    return null;
  }
  return (
    <img
      src={article.image_url}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={{
        display: "block",
        width: width ? width : "100%",
        flexShrink: 0,
        aspectRatio: ratio,
        objectFit: "cover",
        background: "var(--surface)",
        border: "1px solid var(--line)",
      }}
    />
  );
}

function LeadArticle({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.source_url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        paddingBottom: 28,
        borderBottom: "1px solid var(--line)",
        marginBottom: 24,
        textDecoration: "none",
      }}
    >
      <div className="lb-media-row">
        <div className="lb-media-body">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: "0.68rem",
                fontWeight: 600,
                color: "var(--gap)",
                border: "1px solid var(--gap)",
                padding: "3px 10px",
                borderRadius: "var(--radius-pill)",
              }}
            >
              {categoryLabel(article.category)}
            </span>
            <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--ink3)" }}>
              {article.source} · {formatPublished(article.published_date)}
            </span>
          </div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(1.75rem, 4vw, 2.125rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              margin: "0 0 12px",
              color: "var(--ink)",
              textWrap: "balance",
            }}
          >
            {article.title}
          </h2>
          {article.summary ? (
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.0625rem",
                lineHeight: 1.5,
                color: "var(--ink2)",
                margin: 0,
              }}
            >
              {article.summary}
            </p>
          ) : null}
        </div>
        {article.image_url ? (
          <div className="lb-media-side">
            <NewsImage article={article} ratio="4 / 3" />
          </div>
        ) : null}
      </div>
    </a>
  );
}

function ListArticle({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.source_url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: "flex", gap: 16, textDecoration: "none" }}
    >
      <NewsImage article={article} ratio="4 / 3" width={104} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: "0.7rem", color: "var(--ink3)", marginBottom: 7 }}>
          {article.source} · {formatPublished(article.published_date)} ·{" "}
          <span style={{ color: "var(--ink2)" }}>{categoryLabel(article.category)}</span>
        </div>
        <h3
          style={{
            display: "flex",
            gap: 6,
            alignItems: "flex-start",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1.3125rem",
            lineHeight: 1.12,
            letterSpacing: "-0.015em",
            margin: 0,
            color: "var(--ink)",
          }}
        >
          <span>{article.title}</span>
          <ArrowUpRight size={15} aria-hidden style={{ flexShrink: 0, marginTop: 4, color: "var(--ink3)" }} />
        </h3>
      </div>
    </a>
  );
}

export function NewsFeed() {
  const { data, isLoading, isError, error, refetch } = useNews({ limit: NEWS_LIMIT });

  if (isError) {
    return <QueryError error={error} onRetry={() => refetch()} />;
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        }}
      >
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-[120px] rounded-[10px]" />
        ))}
      </div>
    );
  }

  const articles = data ?? [];
  const [lead, ...rest] = articles;
  if (!lead) {
    return (
      <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink2)" }}>
        Todavía no hay noticias ingeridas. Volvé más tarde.
      </p>
    );
  }

  const mainList = rest.slice(0, 5);
  const sidebarList = rest.slice(5, 9);
  const sources = Array.from(new Set(articles.map((article) => article.source)));

  return (
    <div>
      <div className="lb-ideas-grid">
        <div>
          <LeadArticle article={lead} />
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {mainList.map((article) => (
              <ListArticle key={article.source_url} article={article} />
            ))}
          </div>
        </div>

        <aside>
          {sidebarList.length > 0 && (
            <>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: "0.68rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink3)",
                  marginBottom: 16,
                }}
              >
                Más titulares
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {sidebarList.map((article, index) => (
                  <a
                    key={article.source_url}
                    href={article.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      gap: 16,
                      padding: "16px 0",
                      borderBottom: index === sidebarList.length - 1 ? "none" : "1px solid var(--line)",
                      textDecoration: "none",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: MONO,
                        fontWeight: 700,
                        fontSize: "1.25rem",
                        color: index === 0 ? "var(--gap)" : "var(--ink3)",
                      }}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <h4
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          fontSize: "1rem",
                          lineHeight: 1.15,
                          margin: "0 0 5px",
                          color: "var(--ink)",
                        }}
                      >
                        {article.title}
                      </h4>
                      <span style={{ fontFamily: MONO, fontSize: "0.66rem", color: "var(--ink3)" }}>
                        {article.source} · {formatPublished(article.published_date)}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}
          <div
            style={{
              marginTop: 24,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 9,
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: "0.66rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ink3)",
                marginBottom: 10,
              }}
            >
              Fuentes agregadas
            </div>
            <p
              style={{
                fontFamily: MONO,
                fontSize: "0.72rem",
                lineHeight: 1.8,
                color: "var(--ink2)",
                margin: 0,
              }}
            >
              {sources.join(" · ")}
            </p>
          </div>
        </aside>
      </div>

      <p style={{ fontFamily: MONO, fontSize: "0.7rem", color: "var(--ink3)", margin: "32px 0 0" }}>
        Titulares enlazados a la nota original. La Brecha no edita ni reproduce el contenido completo.
      </p>
    </div>
  );
}
