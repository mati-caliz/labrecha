"use client";

import { ActionLink, SectionHead } from "@/components/home/homeShared";
import { POST_CATEGORY_LABELS, formatPostDate } from "@/components/posts/postCategories";
import { POST_IMPACT_META, readingTimeMinutes } from "@/components/posts/postImpacts";
import { Skeleton } from "@/components/ui/skeleton";
import { usePosts } from "@/hooks/useLabrecha";
import type { Post } from "@/lib/labrechaApi";
import { HOME_POSTS_PARAMS } from "@/lib/queryParams";
import Link from "next/link";

function CategoryBadge({ post }: { post: Post }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-jb-mono)",
        fontSize: "0.62rem",
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--event)",
        border: "1px solid var(--event-ln)",
        background: "var(--event-bg)",
        padding: "3px 10px",
        borderRadius: "var(--radius-pill)",
      }}
    >
      {POST_CATEGORY_LABELS[post.category]}
    </span>
  );
}

function LeadIdea({ post }: { post: Post }) {
  const impacts = post.impacts ?? [];
  return (
    <article>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <CategoryBadge post={post} />
        <span style={{ fontFamily: "var(--font-jb-mono)", fontSize: "0.7rem", color: "var(--ink3)" }}>
          {readingTimeMinutes(post.content)} min de lectura
        </span>
      </div>
      <Link
        href={`/ideas/${post.slug}`}
        style={{
          display: "block",
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
          lineHeight: 1.02,
          letterSpacing: "-0.025em",
          margin: "0 0 16px",
          color: "var(--ink)",
          textDecoration: "none",
          textWrap: "balance",
        }}
      >
        {post.title}
      </Link>
      {post.summary ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1rem, 2vw, 1.1875rem)",
            lineHeight: 1.5,
            color: "var(--ink2)",
            margin: "0 0 22px",
            textWrap: "pretty",
          }}
        >
          {post.summary}
        </p>
      ) : null}
      {impacts.length > 0 ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          {impacts.map((impact) => {
            const meta = POST_IMPACT_META[impact.kind];
            const Icon = meta.icon;
            return (
              <span
                key={`${impact.kind}-${impact.value}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "var(--font-jb-mono)",
                  fontSize: "0.7rem",
                  color: meta.color,
                  background: meta.background,
                  border: `1px solid ${meta.border}`,
                  borderRadius: 6,
                  padding: "6px 11px",
                }}
              >
                <Icon size={12} strokeWidth={2.2} aria-hidden />
                {meta.label}: {impact.value}
              </span>
            );
          })}
        </div>
      ) : null}
      <div style={{ fontFamily: "var(--font-jb-mono)", fontSize: "0.72rem", color: "var(--ink3)" }}>
        Publicado {formatPostDate(post.created_at)}
      </div>
    </article>
  );
}

function IdeaListItem({ post, last }: { post: Post; last: boolean }) {
  return (
    <Link
      href={`/ideas/${post.slug}`}
      style={{
        display: "block",
        padding: "0 0 20px",
        borderBottom: last ? "none" : "1px solid var(--line)",
        marginBottom: last ? 0 : 20,
        textDecoration: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
        <CategoryBadge post={post} />
      </div>
      <h4
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "1.3125rem",
          lineHeight: 1.12,
          letterSpacing: "-0.015em",
          margin: "0 0 6px",
          color: "var(--ink)",
        }}
      >
        {post.title}
      </h4>
      <div style={{ fontFamily: "var(--font-jb-mono)", fontSize: "0.7rem", color: "var(--ink3)" }}>
        {formatPostDate(post.created_at)}
      </div>
    </Link>
  );
}

export function IdeasHome() {
  const { data, isLoading } = usePosts(HOME_POSTS_PARAMS);
  const posts = data ?? [];
  const leadPost = posts[0];

  return (
    <section className="lb-container" style={{ paddingTop: 40, paddingBottom: 24 }}>
      <SectionHead
        index="02"
        title="Ideas para la Argentina"
        action={<ActionLink href="/ideas">Ver todas las propuestas →</ActionLink>}
      />
      {isLoading ? (
        <Skeleton className="h-[280px] rounded-[8px]" />
      ) : posts.length === 0 ? (
        <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink2)", margin: 0 }}>
          Todavía no hay ideas publicadas.
        </p>
      ) : (
        <div className="lb-ideas-grid">
          {leadPost ? <LeadIdea post={leadPost} /> : null}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {posts.slice(1).map((post, index, list) => (
              <IdeaListItem key={post.id} post={post} last={index === list.length - 1} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
