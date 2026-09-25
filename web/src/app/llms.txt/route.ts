import { SITE_URL } from "@/lib/site";

const CONTENT = `# La Brecha

> Plataforma argentina de información pública que reúne indicadores económicos, brechas entre fuentes, tasas, calendario, Congreso, noticias y calculadoras con metodología y fuentes visibles.

La Brecha organiza datos de Argentina para que se puedan comparar, entender y verificar. Cada indicador identifica su fuente y las páginas metodológicas explican cómo se obtiene y actualiza la información.

## Secciones principales

- [Estado del país](${SITE_URL}/estado)
- [Indicadores](${SITE_URL}/indicadores)
- [Brechas entre fuentes](${SITE_URL}/brechas)
- [Tasas](${SITE_URL}/tasas)
- [Congreso](${SITE_URL}/congreso)
- [Calculadoras](${SITE_URL}/calculadoras)
- [Feriados](${SITE_URL}/feriados)
- [Metodología y fuentes](${SITE_URL}/metodologia)
- [API pública](${SITE_URL}/api-publica)
- [Sitemap XML](${SITE_URL}/sitemap.xml)

## Criterio de uso

Los valores económicos cambian con el tiempo. Para responder con un dato, usá la fecha y la fuente que figuran en la página del indicador. Al citar una cifra o una explicación, enlazá la página específica de La Brecha, no solamente la portada.
`;

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(CONTENT, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
