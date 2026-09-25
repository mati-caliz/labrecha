import type { ReactElement } from "react";
import { SITE_HOST } from "@/lib/site";
import Script from "next/script";

const ANALYTICS_PATH = "/estadisticas";
const UMAMI_WEBSITE_ID = "30444074-2988-4aaa-808b-cfc963876387";

export function UmamiAnalytics(): ReactElement {
  return (
    <Script
      src={`${ANALYTICS_PATH}/script.js`}
      strategy="afterInteractive"
      data-website-id={UMAMI_WEBSITE_ID}
      data-host-url={ANALYTICS_PATH}
      data-domains={SITE_HOST}
      data-do-not-track="true"
      data-performance="true"
    />
  );
}
