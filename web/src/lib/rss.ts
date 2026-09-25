export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function toRfc822(date: string): string {
  const parsed = new Date(date.length <= 10 ? `${date}T12:00:00Z` : date);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toUTCString();
  }
  return parsed.toUTCString();
}

export interface FeedItem {
  title: string;
  link: string;
  guid: string;
  pubDate: string;
  description: string;
  category?: string;
}

export interface FeedChannel {
  title: string;
  link: string;
  selfUrl: string;
  description: string;
  items: FeedItem[];
}

export function buildRssResponse(channel: FeedChannel, revalidateSeconds: number): Response {
  const items = channel.items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>${
        item.category === undefined ? "" : `\n      <category>${escapeXml(item.category)}</category>`
      }
      <pubDate>${item.pubDate}</pubDate>
      <description>${escapeXml(item.description)}</description>
    </item>`,
    )
    .join("\n");

  const first = channel.items[0];
  const lastBuild = first ? first.pubDate : new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <atom:link href="${escapeXml(channel.selfUrl)}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(channel.description)}</description>
    <language>es-AR</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": `public, s-maxage=${revalidateSeconds}, stale-while-revalidate=${revalidateSeconds * 2}`,
    },
  });
}
