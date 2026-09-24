import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Newsreader } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { CafecitoModal } from "@/components/CafecitoModal";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { JsonLd } from "@/components/JsonLd";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { UmamiAnalytics } from "@/components/UmamiAnalytics";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { layoutQueries } from "@/lib/pageQueries";
import { PrefetchedQueries } from "@/lib/prefetch";
import { SITE_URL } from "@/lib/site";
import { websiteStructuredData } from "@/lib/structuredData";
import { Providers } from "./providers";

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["400", "600", "700", "800"],
  variable: "--font-bricolage",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "La Brecha - Indicadores económicos de Argentina",
  description:
    "Inflación, reservas del BCRA, riesgo país, cotizaciones y calculadoras financieras de Argentina",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "La Brecha",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITE_URL,
    siteName: "La Brecha",
    title: "La Brecha - Indicadores económicos de Argentina",
    description: "Inflación, reservas del BCRA, riesgo país y cotizaciones del dólar en Argentina",
  },
  twitter: {
    card: "summary_large_image",
    title: "La Brecha - Indicadores económicos de Argentina",
    description: "Inflación, reservas del BCRA, riesgo país y cotizaciones del dólar en Argentina",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfbf7" },
    { media: "(prefers-color-scheme: dark)", color: "#101318" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html
      lang="es"
      className={`${bricolageGrotesque.variable} ${newsreader.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" sizes="180x180" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <JsonLd data={websiteStructuredData()} />
      </head>
      <body className={newsreader.className}>
        {gaMeasurementId && (
          <>
            <Script
              strategy="lazyOnload"
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            />
            <Script id="google-analytics" strategy="lazyOnload">
              {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaMeasurementId}', {
            page_path: window.location.pathname,
          });
        `}
            </Script>
          </>
        )}
        <Providers>
          <PrefetchedQueries queries={layoutQueries()}>
            <SiteChrome>{children}</SiteChrome>
          </PrefetchedQueries>
          <CafecitoModal />
        </Providers>
        <ServiceWorkerRegistration />
        <UmamiAnalytics />
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
      </body>
    </html>
  );
}
