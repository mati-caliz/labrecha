/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import nextConfig from "../../next.config.js";

interface HeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

const EMBED_RULE = "/embed/:path*";
const REST_RULE = "/:path((?!embed/).*)";

const REQUIRED_KEYS = [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
];

const FRAME_ANCESTORS = /frame-ancestors [^;]*/;
const IMG_SRC = /img-src ([^;"]*)/;

const NGINX_CONF_PATH = join(__dirname, "..", "..", "..", "nginx", "nginx.conf");
const SITE_SERVER_NAME = "labrecha.matiascaliz.com.ar";
const NEWS_IMAGE_HOST = "https://statics.eleconomista.com.ar";
const IMG_SRC_KEYWORDS = ["'self'", "data:"];

function imageHostsOf(csp: string | undefined): string[] {
  const directive = csp?.match(IMG_SRC)?.[1] ?? "";
  return directive
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0 && !IMG_SRC_KEYWORDS.includes(token));
}

function nginxSiteImageHosts(): string[] {
  const conf = readFileSync(NGINX_CONF_PATH, "utf8");
  const siteBlock = conf
    .split(/^[ \t]*server[ \t]*\{/m)
    .find((block) => block.includes(`server_name ${SITE_SERVER_NAME}`) && block.includes("443 ssl"));
  if (siteBlock === undefined) {
    throw new Error(
      `nginx.conf ya no tiene el server HTTPS de ${SITE_SERVER_NAME}: los dos CSP tienen que coincidir`,
    );
  }
  return imageHostsOf(siteBlock);
}

function rulesFor(rules: HeaderRule[], pathname: string): HeaderRule[] {
  const embedded = pathname.startsWith("/embed/");
  return rules.filter(
    (rule) => (rule.source === EMBED_RULE && embedded) || (rule.source === REST_RULE && !embedded),
  );
}

function frameAncestorsFor(rules: HeaderRule[], pathname: string): string | undefined {
  const matched = rulesFor(rules, pathname)[0];
  const csp = matched?.headers.find((header) => header.key === "Content-Security-Policy");
  return csp?.value.match(FRAME_ANCESTORS)?.[0];
}

describe("the security headers of every route", () => {
  let rules: HeaderRule[];

  beforeAll(async () => {
    const headers = nextConfig.headers;
    if (headers === undefined) {
      throw new Error("next.config.js dejó de declarar headers(): las cabeceras son parte del contrato");
    }
    rules = await headers();
  });

  it("lets the embeddable charts be framed by anyone", () => {
    expect(frameAncestorsFor(rules, "/embed/indicador/dollar_blue")).toBe("frame-ancestors *");
  });

  it("keeps every other route framed only by us", () => {
    for (const pathname of ["/", "/brechas", "/comparar", "/indicador/dollar_blue"]) {
      const frameAncestors = frameAncestorsFor(rules, pathname);

      expect(frameAncestors).toContain("'self'");
      expect(frameAncestors).not.toContain("*");
    }
  });

  it("never trades away the other security headers to allow framing", () => {
    for (const pathname of ["/", "/embed/indicador/dollar_blue"]) {
      const keys = rulesFor(rules, pathname)[0]?.headers.map((header) => header.key) ?? [];

      for (const required of REQUIRED_KEYS) {
        expect(keys).toContain(required);
      }
    }
  });

  it("lets the nginx CSP load every image host the app declares, since the browser intersects both", () => {
    const declared = imageHostsOf(
      rulesFor(rules, "/noticias")[0]?.headers.find((header) => header.key === "Content-Security-Policy")
        ?.value,
    );
    const allowedByNginx = nginxSiteImageHosts();

    expect(declared).toContain(NEWS_IMAGE_HOST);
    for (const host of declared) {
      expect(allowedByNginx).toContain(host);
    }
  });

  it("matches exactly one rule per route, so none can silently override another", () => {
    for (const pathname of ["/", "/brechas", "/embed/indicador/dollar_blue"]) {
      expect(rulesFor(rules, pathname)).toHaveLength(1);
    }
  });
});
