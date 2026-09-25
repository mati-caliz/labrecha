import type { IndicatorDisplay } from "@/lib/indicators";
import { SOURCE_LABELS, sourceLabel } from "@/lib/indicators";
import type { IndicatorSourceSummary, Post } from "@/lib/labrechaApi";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const SOURCE_URLS: Record<string, string> = {
  argentinadatos: "https://argentinadatos.com",
  datosgobar: "https://datos.gob.ar",
  bcra: "https://www.bcra.gob.ar",
  dolarapi: "https://dolarapi.com",
  hcdn: "https://www.hcdn.gob.ar",
  senado: "https://www.senado.gob.ar",
  utdt: "https://www.utdt.edu",
  indec: "https://www.indec.gob.ar",
};

export function websiteStructuredData(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "es-AR",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function indicatorDatasetStructuredData(
  indicator: IndicatorDisplay,
  sources: IndicatorSourceSummary[],
): Record<string, unknown> {
  const url = `${SITE_URL}/indicador/${indicator.code}`;
  const firstDate = sources.reduce(
    (min, source) => (min === "" || source.first_date < min ? source.first_date : min),
    "",
  );
  const lastDate = sources.reduce((max, source) => (source.last_date > max ? source.last_date : max), "");

  const dataset: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${indicator.label} (Argentina)`,
    description: `Serie histórica de ${indicator.label} en Argentina, con la fuente y la fecha de cada medición${sources.length > 1 ? " y la brecha entre las distintas fuentes que la miden" : ""}.`,
    url,
    inLanguage: "es-AR",
    isAccessibleForFree: true,
    keywords: [indicator.label, "Argentina", "indicadores económicos", indicator.code],
    creator: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    distribution: sources.map((source) => ({
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: `${SITE_URL}/api/data/indicators/${indicator.code}?source=${source.source}`,
      name: `${indicator.label} según ${sourceLabel(source.source)}`,
    })),
  };

  if (firstDate !== "" && lastDate !== "") {
    dataset.temporalCoverage = `${firstDate}/${lastDate}`;
  }
  if (lastDate !== "") {
    dataset.dateModified = lastDate;
  }

  const providers = sources
    .map((source) => {
      const name = SOURCE_LABELS[source.source] ?? source.source;
      const sourceUrl = SOURCE_URLS[source.source];
      return sourceUrl === undefined
        ? { "@type": "Organization", name }
        : { "@type": "Organization", name, url: sourceUrl };
    })
    .filter((provider, index, all) => all.findIndex((one) => one.name === provider.name) === index);
  if (providers.length > 0) {
    dataset.includedInDataCatalog = providers.map((provider) => ({
      "@type": "DataCatalog",
      name: provider.name,
      ...(provider.url === undefined ? {} : { url: provider.url }),
    }));
  }

  return dataset;
}

export function postStructuredData(post: Post): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.summary ?? undefined,
    url: `${SITE_URL}/ideas/${post.slug}`,
    inLanguage: "es-AR",
    datePublished: post.created_at,
    dateModified: post.updated_at,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function breadcrumbStructuredData(trail: { name: string; path: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: `${SITE_URL}${step.path}`,
    })),
  };
}
