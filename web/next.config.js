/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      isProd
        ? "script-src 'self' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "img-src 'self' data: https://statics.eleconomista.com.ar https://www.bcra.gob.ar https://icon.horse https://icons.com.ar",
      "connect-src 'self' https://www.bcra.gob.ar https://icon.horse",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self' https://matiascaliz.com.ar",
    ]
      .filter(Boolean)
      .join("; "),
  },
];

const FRAME_ANCESTORS = /frame-ancestors [^;]+/;

// Los /embed/* son para incrustar en cualquier sitio: se les afloja frame-ancestors y se
// les saca el X-Frame-Options. El resto de las cabeceras de seguridad se mantiene igual.
const embedHeaders = securityHeaders.map((header) =>
  header.key === "Content-Security-Policy"
    ? { key: header.key, value: header.value.replace(FRAME_ANCESTORS, "frame-ancestors *") }
    : header,
);

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["lucide-react"],
  compress: true,
  poweredByHeader: false,
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.bcra.gob.ar",
      },
      {
        protocol: "https",
        hostname: "icon.horse",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  compiler: {
    removeConsole: isProd
      ? {
          exclude: ["error", "warn"],
        }
      : false,
    reactRemoveProperties: isProd,
  },
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-progress",
      "@radix-ui/react-select",
      "@radix-ui/react-slot",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
    ],
    optimizeCss: true,
    webpackBuildWorker: true,
  },
  modularizeImports: {
    "date-fns": {
      transform: "date-fns/{{member}}",
    },
  },
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: embedHeaders,
      },
      {
        source: "/:path((?!embed/).*)",
        headers: securityHeaders,
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/icon.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, must-revalidate",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Alias cortos → ruta canónica (español)
      { source: "/ganancias", destination: "/calculadora-sueldo-neto", permanent: true },
      { source: "/reservas", destination: "/indicador/international_reserves", permanent: true },
      {
        source: "/reservas-bcra",
        destination: "/indicador/international_reserves",
        permanent: true,
      },
      { source: "/cotizaciones", destination: "/indicador/dollar_blue", permanent: true },
      { source: "/inflacion", destination: "/indicador/cpi_monthly", permanent: true },
      { source: "/riesgo-pais", destination: "/indicador/country_risk", permanent: true },
      // URLs viejas en inglés → nueva ruta canónica (español)
      { source: "/gaps", destination: "/brechas", permanent: true },
      { source: "/calculators", destination: "/calculadoras", permanent: true },
      { source: "/congress", destination: "/congreso", permanent: true },
      { source: "/congress/vote/:id", destination: "/congreso/votacion/:id", permanent: true },
      { source: "/status", destination: "/estado", permanent: true },
      { source: "/holidays", destination: "/feriados", permanent: true },
      { source: "/indicators", destination: "/indicadores", permanent: true },
      { source: "/indicator/:code", destination: "/indicador/:code", permanent: true },
      { source: "/news", destination: "/noticias", permanent: true },
      {
        source: "/calculator-inflation-adjustment",
        destination: "/calculadora-ajuste-inflacion",
        permanent: true,
      },
      {
        source: "/calculator-fiscal-impact",
        destination: "/calculadora-impacto-fiscal",
        permanent: true,
      },
      {
        source: "/calculator-compound-interest",
        destination: "/calculadora-interes-compuesto",
        permanent: true,
      },
      {
        source: "/calculator-net-salary",
        destination: "/calculadora-sueldo-neto",
        permanent: true,
      },
      { source: "/gazette.xml", destination: "/boletin.xml", permanent: true },
    ];
  },
};

module.exports = nextConfig;
