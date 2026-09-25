import { PostsFeed } from "@/components/posts/PostsFeed";
import { postsFeedQueries } from "@/lib/pageQueries";
import { PrefetchedQueries } from "@/lib/prefetch";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ideas - La Brecha",
  description:
    "Propuestas concretas para Argentina: políticas que funcionaron en otros países, analizadas y adaptadas, con su impacto estimado.",
};

export default function IdeasPage() {
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 24px" }}>
      <header style={{ borderBottom: "2px solid var(--ink)", paddingBottom: 24, marginBottom: 34 }}>
        <div
          style={{
            fontFamily: "var(--font-jb-mono)",
            fontSize: "0.72rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ink3)",
            marginBottom: 12,
          }}
        >
          /ideas
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(2.25rem, 6vw, 3.375rem)",
            lineHeight: 1.0,
            letterSpacing: "-0.025em",
            margin: "0 0 16px",
            maxWidth: 760,
            color: "var(--ink)",
            textWrap: "balance",
          }}
        >
          Propuestas concretas para la Argentina
        </h1>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1rem, 2.2vw, 1.25rem)",
            lineHeight: 1.5,
            color: "var(--ink2)",
            margin: 0,
            maxWidth: 640,
          }}
        >
          Políticas que funcionaron en otros países, analizadas y adaptadas. Cada una con su categoría, su
          impacto estimado y su fecha.
        </p>
      </header>
      <PrefetchedQueries queries={postsFeedQueries()}>
        <PostsFeed />
      </PrefetchedQueries>
    </div>
  );
}
