"use client";

import { QueryError } from "@/components/QueryError";
import { POST_CATEGORY_LABELS, formatPostDate } from "@/components/posts/postCategories";
import { POST_IMPACT_META, readingTimeMinutes } from "@/components/posts/postImpacts";
import { Skeleton } from "@/components/ui/skeleton";
import { usePosts } from "@/hooks/useLabrecha";
import { POST_CATEGORIES, type Post } from "@/lib/labrechaApi";
import Link from "next/link";
import { type CSSProperties, useState } from "react";

const SKELETON_KEYS = ["p1", "p2", "p3"];
const ALL_FILTER = "Todas";
const MONO = "var(--font-jb-mono)";

const IMPACT_CHIP_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontFamily: MONO,
  fontSize: "0.66rem",
  color: "var(--ink2)",
  border: "1px solid var(--line)",
  borderRadius: 5,
  padding: "4px 9px",
};

function CategoryBadge({ category }: { category: Post["category"] }) {
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: "0.62rem",
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--event)",
        border: "1px solid var(--event-ln)",
        background: "var(--event-bg)",
        padding: "2px 9px",
        borderRadius: "var(--radius-pill)",
      }}
    >
      {POST_CATEGORY_LABELS[category]}
    </span>
  );
}

function ImpactChips({ post, limit = 2 }: { post: Post; limit?: number }) {
  const impacts = (post.impacts ?? []).slice(0, limit);
  if (impacts.length === 0) {
    return null;
  }
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {impacts.map((impact) => {
        const meta = POST_IMPACT_META[impact.kind];
        const Icon = meta.icon;
        return (
          <span key={`${impact.kind}-${impact.value}`} style={IMPACT_CHIP_STYLE}>
            <Icon size={11} strokeWidth={2.2} aria-hidden />
            {meta.label}: {impact.value}
          </span>
        );
      })}
    </div>
  );
}

function FeaturedIdea({ post }: { post: Post }) {
  return (
    <Link
      href={`/ideas/${post.slug}`}
      style={{
        display: "block",
        paddingBottom: 38,
        marginBottom: 38,
        borderBottom: "1px solid var(--line)",
        textDecoration: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <CategoryBadge category={post.category} />
        <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--ink3)" }}>
          {formatPostDate(post.created_at)} · {readingTimeMinutes(post.content)} min
        </span>
      </div>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "clamp(1.875rem, 4.5vw, 2.625rem)",
          lineHeight: 1.02,
          letterSpacing: "-0.025em",
          margin: "0 0 16px",
          color: "var(--ink)",
          textWrap: "balance",
        }}
      >
        {post.title}
      </h2>
      {post.summary ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1rem, 2vw, 1.1875rem)",
            lineHeight: 1.5,
            color: "var(--ink2)",
            margin: "0 0 20px",
            maxWidth: 720,
            textWrap: "pretty",
          }}
        >
          {post.summary}
        </p>
      ) : null}
      <ImpactChips post={post} limit={3} />
    </Link>
  );
}

function IdeaCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/ideas/${post.slug}`}
      style={{
        background: "var(--raise)",
        padding: "26px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        textDecoration: "none",
        color: "var(--ink)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <CategoryBadge category={post.category} />
      </div>
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "1.5rem",
          lineHeight: 1.08,
          letterSpacing: "-0.02em",
          margin: 0,
          flex: 1,
          color: "var(--ink)",
        }}
      >
        {post.title}
      </h3>
      {post.summary ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "0.97rem",
            lineHeight: 1.45,
            color: "var(--ink2)",
            margin: 0,
          }}
        >
          {post.summary}
        </p>
      ) : null}
      <ImpactChips post={post} />
      <div
        style={{
          fontFamily: MONO,
          fontSize: "0.7rem",
          color: "var(--ink3)",
          paddingTop: 6,
          borderTop: "1px solid var(--line2)",
        }}
      >
        {formatPostDate(post.created_at)}
      </div>
    </Link>
  );
}

const FILTER_STYLE = (active: boolean): CSSProperties => ({
  fontFamily: MONO,
  fontSize: "0.75rem",
  padding: "8px 14px",
  borderRadius: "var(--radius-pill)",
  cursor: "pointer",
  border: active ? "1px solid var(--ink)" : "1px solid var(--line)",
  background: active ? "var(--ink)" : "transparent",
  color: active ? "var(--paper)" : "var(--ink2)",
});

export function PostsFeed() {
  const [activeFilter, setActiveFilter] = useState<string>(ALL_FILTER);
  const activeCategory = POST_CATEGORIES.find((category) => POST_CATEGORY_LABELS[category] === activeFilter);
  const { data, isLoading, isError, error, refetch } = usePosts(
    activeCategory ? { category: activeCategory } : undefined,
  );

  const filterItems = [ALL_FILTER, ...POST_CATEGORIES.map((category) => POST_CATEGORY_LABELS[category])];
  const posts = data ?? [];
  const [featured, ...rest] = posts;

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 36, flexWrap: "wrap" }}>
        {filterItems.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setActiveFilter(item)}
            style={FILTER_STYLE(item === activeFilter)}
          >
            {item}
          </button>
        ))}
      </div>

      {isError && <QueryError error={error} onRetry={() => refetch()} />}

      {isLoading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 1,
          }}
        >
          {SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-[220px] rounded-[10px]" />
          ))}
        </div>
      )}

      {!isLoading && !isError && posts.length === 0 && (
        <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink2)", margin: 0 }}>
          Todavía no hay publicaciones en esta categoría.
        </p>
      )}

      {featured ? <FeaturedIdea post={featured} /> : null}

      {rest.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 1,
            background: "var(--line)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {rest.map((post) => (
            <IdeaCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
