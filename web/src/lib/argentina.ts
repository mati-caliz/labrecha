export interface ProvinceCentroid {
  lon: number;
  lat: number;
}

export const PROVINCE_CENTROIDS = {
  "Buenos Aires": { lon: -60.56, lat: -36.68 },
  CABA: { lon: -58.45, lat: -34.61 },
  Catamarca: { lon: -66.95, lat: -27.34 },
  Córdoba: { lon: -63.8, lat: -32.14 },
  Corrientes: { lon: -57.8, lat: -28.77 },
  Chaco: { lon: -60.77, lat: -26.39 },
  Chubut: { lon: -68.53, lat: -43.79 },
  "Entre Ríos": { lon: -59.2, lat: -32.06 },
  Formosa: { lon: -59.93, lat: -24.9 },
  Jujuy: { lon: -65.76, lat: -23.32 },
  "La Pampa": { lon: -65.45, lat: -37.14 },
  "La Rioja": { lon: -67.18, lat: -29.68 },
  Mendoza: { lon: -68.58, lat: -34.63 },
  Misiones: { lon: -54.65, lat: -26.88 },
  Neuquén: { lon: -70.12, lat: -38.64 },
  "Río Negro": { lon: -67.23, lat: -40.41 },
  Salta: { lon: -64.81, lat: -24.3 },
  "San Juan": { lon: -68.89, lat: -30.87 },
  "San Luis": { lon: -66.03, lat: -33.76 },
  "Santa Cruz": { lon: -69.96, lat: -48.82 },
  "Santa Fe": { lon: -60.95, lat: -30.71 },
  "Santiago del Estero": { lon: -63.25, lat: -27.78 },
  "Tierra del Fuego": { lon: -68.3, lat: -54.0 },
  Tucumán: { lon: -65.36, lat: -26.95 },
} satisfies Record<string, ProvinceCentroid>;

const LON_MIN = -73.6;
const LON_MAX = -53.6;
const LAT_MIN = -55.2;
const LAT_MAX = -21.8;
const MEAN_LAT_COS = Math.cos((((LAT_MIN + LAT_MAX) / 2) * Math.PI) / 180);

export interface ProjectedPoint {
  x: number;
  y: number;
}

export function projectCentroid(centroid: ProvinceCentroid, width: number, height: number): ProjectedPoint {
  const lonSpan = (LON_MAX - LON_MIN) * MEAN_LAT_COS;
  const latSpan = LAT_MAX - LAT_MIN;
  const usableWidth = height * (lonSpan / latSpan);
  const offsetX = (width - usableWidth) / 2;
  const x = offsetX + (((centroid.lon - LON_MIN) * MEAN_LAT_COS) / lonSpan) * usableWidth;
  const y = ((LAT_MAX - centroid.lat) / latSpan) * height;
  return { x, y };
}

const MAINLAND_OUTLINE: ProvinceCentroid[] = [
  { lon: -66.9, lat: -21.8 },
  { lon: -64.3, lat: -22.0 },
  { lon: -62.6, lat: -22.2 },
  { lon: -61.0, lat: -23.6 },
  { lon: -59.4, lat: -24.4 },
  { lon: -57.6, lat: -25.4 },
  { lon: -57.9, lat: -27.3 },
  { lon: -56.4, lat: -27.4 },
  { lon: -55.6, lat: -26.9 },
  { lon: -54.6, lat: -25.9 },
  { lon: -53.7, lat: -25.6 },
  { lon: -53.8, lat: -26.7 },
  { lon: -54.8, lat: -27.5 },
  { lon: -55.7, lat: -28.3 },
  { lon: -57.1, lat: -29.7 },
  { lon: -58.0, lat: -31.4 },
  { lon: -58.4, lat: -33.0 },
  { lon: -58.4, lat: -34.0 },
  { lon: -58.35, lat: -34.6 },
  { lon: -57.2, lat: -35.3 },
  { lon: -57.1, lat: -35.9 },
  { lon: -57.5, lat: -38.1 },
  { lon: -58.7, lat: -38.6 },
  { lon: -60.9, lat: -38.95 },
  { lon: -62.3, lat: -38.8 },
  { lon: -62.3, lat: -40.8 },
  { lon: -63.7, lat: -41.15 },
  { lon: -63.6, lat: -42.4 },
  { lon: -65.1, lat: -43.3 },
  { lon: -65.6, lat: -44.8 },
  { lon: -67.5, lat: -45.9 },
  { lon: -67.3, lat: -46.9 },
  { lon: -65.9, lat: -47.75 },
  { lon: -67.7, lat: -49.8 },
  { lon: -69.2, lat: -51.6 },
  { lon: -68.4, lat: -52.3 },
  { lon: -69.8, lat: -52.15 },
  { lon: -72.3, lat: -51.5 },
  { lon: -72.5, lat: -50.0 },
  { lon: -73.5, lat: -49.3 },
  { lon: -72.6, lat: -48.0 },
  { lon: -72.0, lat: -46.5 },
  { lon: -71.7, lat: -45.0 },
  { lon: -71.3, lat: -43.5 },
  { lon: -71.7, lat: -42.0 },
  { lon: -71.9, lat: -40.5 },
  { lon: -70.8, lat: -39.0 },
  { lon: -71.2, lat: -37.5 },
  { lon: -70.4, lat: -36.0 },
  { lon: -69.8, lat: -34.5 },
  { lon: -70.0, lat: -33.0 },
  { lon: -69.8, lat: -31.5 },
  { lon: -70.2, lat: -30.0 },
  { lon: -69.9, lat: -28.5 },
  { lon: -68.6, lat: -27.0 },
  { lon: -68.4, lat: -25.5 },
  { lon: -67.3, lat: -24.0 },
  { lon: -67.0, lat: -22.7 },
];

const TIERRA_DEL_FUEGO_OUTLINE: ProvinceCentroid[] = [
  { lon: -68.6, lat: -52.9 },
  { lon: -67.2, lat: -53.3 },
  { lon: -65.2, lat: -54.4 },
  { lon: -66.5, lat: -55.05 },
  { lon: -68.6, lat: -54.95 },
];

const ARGENTINA_OUTLINES = [MAINLAND_OUTLINE, TIERRA_DEL_FUEGO_OUTLINE];

export function argentinaOutlinePaths(width: number, height: number): string[] {
  return ARGENTINA_OUTLINES.map((outline) => {
    const commands = outline.map((vertex, index) => {
      const point = projectCentroid(vertex, width, height);
      const command = index === 0 ? "M" : "L";
      return `${command}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    });
    return `${commands.join(" ")} Z`;
  });
}
