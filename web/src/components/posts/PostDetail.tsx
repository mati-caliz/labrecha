"use client";
import type { ReactElement } from "react";

import { QueryError } from "@/components/QueryError";
import { POST_CATEGORY_LABELS, formatPostDate } from "@/components/posts/postCategories";
import { POST_IMPACT_META, readingTimeMinutes } from "@/components/posts/postImpacts";
import { Skeleton } from "@/components/ui/skeleton";
import { usePost, usePosts } from "@/hooks/useLabrecha";
import type { Post, PostImpact } from "@/lib/labrechaApi";
import { RELATED_POSTS_PARAMS } from "@/lib/queryParams";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { hasText } from "@/lib/utils";

const MONO = "var(--font-jb-mono)";
const NARROW = 720;

function ImpactTile({ impact }: Readonly<{ impact: PostImpact }>): ReactElement {
  const meta = POST_IMPACT_META[impact.kind];
  const Icon = meta.icon;
  return (
    <div
      style={{
        background: "var(--raise)",
        border: "1px solid var(--line)",
        borderRadius: 9,
        padding: 16,
      }}
    >
      <Icon size={20} strokeWidth={2} aria-hidden style={{ color: meta.color, marginBottom: 8 }} />
      <div
        style={{
          fontFamily: MONO,
          fontSize: "0.62rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--ink3)",
          marginBottom: 4,
        }}
      >
        {meta.label}
      </div>
      <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: "0.9375rem", color: "var(--ink)" }}>
        {impact.value}
      </div>
    </div>
  );
}

function RelatedItem({ post }: Readonly<{ post: Post }>): ReactElement {
  return (
    <Link href={`/ideas/${post.slug}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: "0.66rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--ink3)",
          marginBottom: 8,
        }}
      >
        {POST_CATEGORY_LABELS[post.category]}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "1.25rem",
          lineHeight: 1.1,
          letterSpacing: "-0.015em",
          color: "var(--ink)",
        }}
      >
        {post.title}
      </div>
    </Link>
  );
}

function PostHeader({ post }: Readonly<{ post: Post }>): ReactElement {
  return (
    <div style={{ maxWidth: NARROW, margin: "0 auto", padding: "52px 24px 0" }}>
      <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--ink3)", marginBottom: 22 }}>
        <Link href="/ideas" style={{ color: "var(--ink3)", textDecoration: "none" }}>
          Ideas
        </Link>{" "}
        / <span style={{ color: "var(--ink2)" }}>{POST_CATEGORY_LABELS[post.category]}</span>
      </div>

      <div style={{ marginBottom: 22 }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: "0.68rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--event)",
            border: "1px solid var(--event-ln)",
            background: "var(--event-bg)",
            padding: "3px 11px",
            borderRadius: "var(--radius-pill)",
          }}
        >
          {POST_CATEGORY_LABELS[post.category]}
        </span>
      </div>

      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "clamp(2rem, 5.5vw, 3.25rem)",
          lineHeight: 1.02,
          letterSpacing: "-0.03em",
          margin: "0 0 22px",
          color: "var(--ink)",
          textWrap: "balance",
        }}
      >
        {post.title}
      </h1>

      {hasText(post.summary) ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1.125rem, 3vw, 1.4375rem)",
            lineHeight: 1.45,
            color: "var(--ink2)",
            margin: "0 0 28px",
            textWrap: "pretty",
          }}
        >
          {post.summary}
        </p>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          padding: "16px 0",
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
          fontFamily: MONO,
          fontSize: "0.75rem",
          color: "var(--ink3)",
        }}
      >
        <span style={{ color: "var(--ink2)" }}>Por la redacción de La Brecha</span>
        <span>·</span>
        <span>{formatPostDate(post.created_at)}</span>
        <span>·</span>
        <span>{readingTimeMinutes(post.content)} min de lectura</span>
      </div>
    </div>
  );
}

function PostImpacts({ impacts }: Readonly<{ impacts: PostImpact[] }>): ReactElement {
  return (
    <div style={{ maxWidth: NARROW, margin: "0 auto", padding: "28px 24px 0" }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: "0.68rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink3)",
          marginBottom: 14,
        }}
      >
        Impacto estimado
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        {impacts.map((impact) => (
          <ImpactTile key={`${impact.kind}-${impact.value}`} impact={impact} />
        ))}
      </div>
    </div>
  );
}

function PostFooter({ post, related }: Readonly<{ post: Post; related: Post[] }>): ReactElement {
  return (
    <div style={{ maxWidth: NARROW, margin: "0 auto", padding: "0 24px 60px" }}>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "20px 24px",
          fontFamily: MONO,
          fontSize: "0.75rem",
          color: "var(--ink2)",
          lineHeight: 1.7,
        }}
      >
        <span
          style={{
            color: "var(--ink3)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontSize: "0.66rem",
          }}
        >
          Atribución
        </span>
        <br />
        Publicado por La Brecha el {formatPostDate(post.created_at)}. Todo dato citado en el texto lleva su
        fuente.
      </div>

      {related.length > 0 && (
        <div style={{ marginTop: 40, borderTop: "2px solid var(--ink)", paddingTop: 22 }}>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "1.25rem",
              margin: "0 0 18px",
            }}
          >
            Seguir leyendo
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 20,
            }}
          >
            {related.map((item) => (
              <RelatedItem key={item.id} post={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PostDetail({ slug }: Readonly<{ slug: string }>): ReactElement {
  const { data: post, isLoading, isError, error, refetch } = usePost(slug);
  const { data: allPosts } = usePosts(RELATED_POSTS_PARAMS);

  if (isError) {
    return (
      <div style={{ maxWidth: NARROW, margin: "0 auto", padding: "52px 24px" }}>
        <QueryError
          error={error}
          onRetry={() => {
            void refetch();
          }}
        />
      </div>
    );
  }

  if (isLoading || !post) {
    return (
      <div
        style={{
          maxWidth: NARROW,
          margin: "0 auto",
          padding: "52px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <Skeleton className="h-[48px] w-2/3 rounded-[10px]" />
        <Skeleton className="h-[320px] rounded-[10px]" />
      </div>
    );
  }

  const impacts = post.impacts ?? [];
  const related = (allPosts ?? []).filter((item) => item.slug !== post.slug).slice(0, 2);

  return (
    <article style={{ fontFamily: "var(--font-serif)" }}>
      <PostHeader post={post} />

      {impacts.length > 0 && <PostImpacts impacts={impacts} />}

      <div
        className="post-markdown"
        style={{
          maxWidth: NARROW,
          margin: "0 auto",
          padding: "40px 24px 20px",
          fontFamily: "var(--font-serif)",
          fontSize: "1.1875rem",
          lineHeight: 1.65,
          color: "var(--ink)",
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
      </div>

      <PostFooter post={post} related={related} />
    </article>
  );
}
