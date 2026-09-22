# El frontend

Next.js 16 con App Router, React 18, TypeScript y Tailwind. Consume la FastAPI a través de un
proxy propio; nunca pega directo desde el navegador.

## El BFF same-origin

El navegador pide a `/api/data/...` y `src/app/api/data/[...path]/route.ts` proxya a la FastAPI
(`LABRECHA_API_INTERNAL_URL`) con ISR por ruta. El cliente (`src/lib/labrechaApi.ts`) es
**isomórfico**: en el browser va por el proxy y en el servidor directo a la API vía `serverGet`
(`src/lib/serverApi.ts`). Los TTL son únicos y viven en `src/lib/cacheRules.ts`.

El `POST` del proxy tiene **whitelist** (`POSTABLE_PATHS`). Lo único que escribe es `/errors`;
las calculadoras van por `POST` porque llevan cuerpo, pero no tocan la base. Sus rutas salen de
`src/lib/calculatorPaths.ts` justamente para que el cliente y la whitelist no puedan divergir:
cuando divergieron, las cuatro calculadoras devolvían 404 en el navegador.

**El proxy no debe ser el agujero** por el que se llegue al próximo endpoint de escritura que se
agregue.

## Los datos se prefetchean en el servidor

Cada `page.tsx` prefetchea sus queries y las hidrata con `<PrefetchedQueries>`: el HTML sale con
contenido real en vez de skeletons y las páginas se prerenderizan.

Para que la clave del prefetch no pueda divergir de la del hook, las dos salen de las factorías
de `src/lib/queries.ts`. Qué necesita cada ruta está en `src/lib/pageQueries.ts` y los params
compartidos en `src/lib/queryParams.ts`, que es un **módulo plano a propósito**: un `"use client"`
exporta referencias, no valores, así que las constantes que lee el servidor no pueden vivir en un
componente cliente.

## `/admin`, la única superficie de escritura

Se autentica contra `ADMIN_PASSWORD` y guarda una cookie HttpOnly cuyo token es
`<expiresAt>.<hmac>`: el vencimiento va **adentro** de la firma (`lib/adminSession.ts`), no sólo
en el `Max-Age`, que el cliente controla. El login limita intentos por IP en memoria
(`lib/loginAttempts.ts`).

## Diseño

Dirección "Editorial", de periodismo de datos. Los tokens `oklch` light y dark están en
`src/app/globals.css`, bloque "Design system v2" — ahí están los nombres, no hace falta
repetirlos acá.

Dos colores tienen significado fijo: **`--gap` ámbar** es siempre discrepancia entre fuentes y
**`--event` violeta** siempre evento político.

Tres tipografías: display para titulares, serif para prosa y mono para números y labels. La
regla: **ningún número va en serif ni en sans**, siempre mono tabular y en formato argentino
(punto de miles, coma decimal). Los componentes de `src/components/core/` usan estilos inline con
esas variables; el resto, Tailwind.

## SEO

El JSON-LD vive en `src/lib/structuredData.ts` y lo emite `<JsonLd>`, que escapa `<`, `>` y `&` a
`\uXXXX` para inyectarlo como texto: biome corre con `security: all`, así que no se usa
`dangerouslySetInnerHTML`. Las `opengraph-image.tsx` comparten el marco de marca en
`src/lib/ogImage.tsx`.

## `/comparar`

Pone dos series en el mismo eje **indexadas a 100** en su primer mes en común
(`src/lib/compare.ts`): compara ritmos, nunca niveles. Si no hay ningún mes compartido lo dice,
en vez de inventar una base. El par viaja en la URL (`?a=&b=`) para que sea compartible.

## `/embed/indicador/[code]`

El gráfico incrustable. Va sin chrome porque `SiteChrome` detecta el prefijo, y es el **único**
lugar con `frame-ancestors *`.

Eso vive en **dos lados que tienen que coincidir**: `next.config.js`, donde la regla general es
`/:path((?!embed/).*)` —si volviera a ser `/:path*` matchearía también el embed y le pisaría el
CSP—, y el `location /embed/` del nginx compartido. El navegador aplica la **intersección** de
los dos CSP. Lo cubre `__tests__/securityHeaders.test.ts`.

## Alertas por umbral

`/indicador/[code]/feed.xml?umbral=N&direccion=arriba|abajo` filtra el RSS a los datos que cruzan
el umbral (`src/lib/feedAlerts.ts`). Es un "avisame cuando" sin pedir un mail ni guardar nada de
nadie.
