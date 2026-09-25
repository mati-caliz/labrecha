export interface SeriesPoint {
  t?: string;
  v: number | null;
}

export interface ChartSeries {
  name: string;
  color?: string;
  dashed?: boolean;
  data: SeriesPoint[];
}

export interface ChartEvent {
  index: number;
  label: string;
}

export type ValueFormatter = (value: number) => string;
