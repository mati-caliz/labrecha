import type { ReactElement } from "react";
import { JsonLd } from "@/components/JsonLd";
import { PostDetail } from "@/components/posts/PostDetail";
import type { Post } from "@/lib/labrechaApi";
import { postDetailQueries } from "@/lib/pageQueries";
import { PrefetchedQueries } from "@/lib/prefetch";
import { postQuery } from "@/lib/queries";
import { postStructuredData } from "@/lib/structuredData";
import type { Metadata } from "next";

interface IdeaPageProps {
  params: Promise<{ slug: string }>;
}

async function loadPost(slug: string): Promise<Post | undefined> {
  return await postQuery(slug)
    .queryFn()
    .catch(() => undefined);
}

export async function generateMetadata({ params }: IdeaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (post === undefined) {
    return {
      title: "Ideas - La Brecha",
      description: "Ideas, leyes y análisis para Argentina publicados por el observatorio.",
    };
  }
  return {
    title: `${post.title} - La Brecha`,
    description: post.summary ?? undefined,
    alternates: { canonical: `/ideas/${slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.summary ?? undefined,
      url: `/ideas/${slug}`,
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
    },
  };
}

export default async function IdeaDetailPage({ params }: Readonly<IdeaPageProps>): Promise<ReactElement> {
  const { slug } = await params;
  const post = await loadPost(slug);

  return (
    <>
      {post === undefined ? null : <JsonLd data={postStructuredData(post)} />}
      <PrefetchedQueries queries={postDetailQueries(slug)}>
        <PostDetail slug={slug} />
      </PrefetchedQueries>
    </>
  );
}
