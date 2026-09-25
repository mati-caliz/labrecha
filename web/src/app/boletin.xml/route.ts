import type { GazetteSummary } from "@/lib/labrechaApi";
import { serverGet } from "@/lib/serverApi";
import { SITE_URL } from "@/lib/site";

const AI_DISCLAIMER = "Resumen generado por IA. Verificá siempre contra la fuente oficial.";
const REVALIDATE_SECONDS = 3600;
const ISO_DATE_LENGTH = 10;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc822(date: string): string {
  const parsed = new Date(date.length <= ISO_DATE_LENGTH ? `${date}T12:00:00Z` : date);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toUTCString();
  }
  return parsed.toUTCString();
}

function itemXml(summary: GazetteSummary): string {
  const bullets = summary.summary.map((line) => `• ${line}`).join("\n");
  const description = `${bullets}\n\n${AI_DISCLAIMER}`;
  return `    <item>
      <title>${escapeXml(summary.title)}</title>
      <link>${escapeXml(summary.url)}</link>
      <guid isPermaLink="false">${escapeXml(summary.regulation_id)}</guid>
      <category>${escapeXml(summary.category)}</category>
      <pubDate>${toRfc822(summary.date)}</pubDate>
      <description>${escapeXml(description)}</description>
    </item>`;
}

export async function GET(): Promise<Response> {
  let summaries: GazetteSummary[] = [];
  try {
    summaries = await serverGet<GazetteSummary[]>("/gazette/summaries?limit=50", REVALIDATE_SECONDS);
  } catch {
    summaries = [];
  }

  const items = summaries.map(itemXml).join("\n");
  const firstSummary = summaries[0];
  const lastBuild = firstSummary ? toRfc822(firstSummary.date) : new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>La Brecha — Boletín Oficial en criollo</title>
    <link>${SITE_URL}</link>
    <description>Las normas económicas y regulatorias del Boletín Oficial, resumidas por IA. ${AI_DISCLAIMER}</description>
    <language>es-AR</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=${REVALIDATE_SECONDS * 2}`,
    },
  });
}
