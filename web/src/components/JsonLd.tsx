const HTML_SENSITIVE = /[<>&]/g;

const UNICODE_ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
};

function serialize(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(HTML_SENSITIVE, (character) => UNICODE_ESCAPES[character] ?? character);
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json">{serialize(data)}</script>;
}
