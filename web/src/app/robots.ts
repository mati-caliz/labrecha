import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";
import { BLOCKED_CRAWLERS, CITATION_CRAWLERS, SEARCH_CRAWLERS } from "./robots-crawlers";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: CITATION_CRAWLERS,
        allow: "/",
        crawlDelay: 1,
      },
      {
        userAgent: SEARCH_CRAWLERS,
        allow: "/",
        crawlDelay: 1,
      },
      {
        userAgent: BLOCKED_CRAWLERS,
        disallow: "/",
      },
      {
        userAgent: "*",
        allow: "/",
        crawlDelay: 2,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
