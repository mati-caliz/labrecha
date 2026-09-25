"use client";
import type { ReactElement } from "react";

import { AnnotatedSeriesChart } from "@/components/core";
import { Skeleton } from "@/components/ui/skeleton";
import { useIndicatorSeries } from "@/hooks/useLabrecha";
import { COMPARE_BASE, type IndexedSeries, commonMonths, indexToBase } from "@/lib/compare";
import { INDICATOR_FAMILY_LABELS, INDICATOR_META, formatMonthAR, formatNumberAR } from "@/lib/indicators";
import type { IndicatorPoint, IndicatorSeries } from "@/lib/labrechaApi";
import type { UseQueryResult } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";

const MONO = "var(--font-jb-mono)";
const CHART_HEIGHT = 320;
const MAX_X_LABELS = 8;
const SERIES_LIMIT = 5000;

export const DEFAULT_LEFT = "cpi_level_general";
export const DEFAULT_RIGHT = "minimum_wage";

const LEFT_COLOR = "var(--accent)";
const RIGHT_COLOR = "var(--gap)";

const SORTED_CODES = Object.keys(INDICATOR_META).sort((left, right) =>
  (INDICATOR_META[left]?.label ?? left).localeCompare(INDICATOR_META[right]?.label ?? right, "es"),
);

function IndicatorPicker({
  label,
  value,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  onChange: (code: string) => void;
}>): ReactElement {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 220px" }}>
      <span
        style={{
          fontFamily: MONO,
          fontSize: "0.66rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink3)",
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "0.9375rem",
          padding: "10px 12px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--line)",
          background: "var(--surface)",
          color: "var(--ink)",
        }}
      >
        {SORTED_CODES.map((code) => (
          <option key={code} value={code}>
            {INDICATOR_META[code]?.label ?? code} ·{" "}
            {INDICATOR_FAMILY_LABELS[INDICATOR_META[code]?.family ?? "precios"]}
          </option>
        ))}
      </select>
    </label>
  );
}

function Reading({
  code,
  changePct,
  color,
}: Readonly<{ code: string; changePct: number; color: string }>): ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: "1 1 200px" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 3, background: color, borderRadius: 2 }} />
        <span style={{ fontSize: "0.9375rem", color: "var(--ink2)" }}>
          {INDICATOR_META[code]?.label ?? code}
        </span>
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: "1.6rem",
          color: "var(--ink)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {changePct >= 0 ? "+" : "−"}
        {formatNumberAR(Math.abs(changePct), 1)} %
      </span>
    </div>
  );
}

interface ComparisonProps {
  left: string;
  right: string;
  leftIndexed: IndexedSeries;
  rightIndexed: IndexedSeries;
  months: string[];
}

function monthLabels(months: string[]): string[] {
  const step = Math.max(1, Math.ceil(months.length / MAX_X_LABELS));
  return months.map((month, index) => (index % step === 0 ? formatMonthAR(`${month}-01`) : ""));
}

function ComparisonResult({
  left,
  right,
  leftIndexed,
  rightIndexed,
  months,
}: Readonly<ComparisonProps>): ReactElement {
  return (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          padding: "16px 18px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--line)",
          background: "var(--raise)",
        }}
      >
        <Reading code={left} changePct={leftIndexed.changePct} color={LEFT_COLOR} />
        <Reading code={right} changePct={rightIndexed.changePct} color={RIGHT_COLOR} />
        <span
          style={{
            fontFamily: MONO,
            fontSize: "0.7rem",
            color: "var(--ink3)",
            flex: "1 1 100%",
          }}
        >
          Ambas series arrancan en {COMPARE_BASE} en {formatMonthAR(`${leftIndexed.baseDate}-01`)} — el índice
          sólo compara ritmos, no niveles. {months.length} meses en común.
        </span>
      </div>

      <AnnotatedSeriesChart
        height={CHART_HEIGHT}
        xLabels={monthLabels(months)}
        yFormat={(value) => formatNumberAR(value, 0)}
        series={[
          {
            name: INDICATOR_META[left]?.label ?? left,
            color: LEFT_COLOR,
            data: leftIndexed.values.map((value) => ({ v: value })),
          },
          {
            name: INDICATOR_META[right]?.label ?? right,
            color: RIGHT_COLOR,
            dashed: true,
            data: rightIndexed.values.map((value) => ({ v: value })),
          },
        ]}
      />
    </>
  );
}

function ComparisonBody({
  isLoading,
  leftIndexed,
  rightIndexed,
  ...rest
}: Readonly<
  Omit<ComparisonProps, "leftIndexed" | "rightIndexed"> & {
    isLoading: boolean;
    leftIndexed: IndexedSeries | null;
    rightIndexed: IndexedSeries | null;
  }
>): ReactElement {
  if (isLoading) {
    return <Skeleton className="h-[380px] rounded-[10px]" />;
  }
  if (leftIndexed === null || rightIndexed === null) {
    return (
      <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink2)" }}>
        Estas dos series no tienen ningún mes medido en común, así que no hay nada honesto que comparar. Probá
        con otro par.
      </p>
    );
  }
  return <ComparisonResult {...rest} leftIndexed={leftIndexed} rightIndexed={rightIndexed} />;
}

type ComparatorSide = "a" | "b";

interface ComparatorSelection {
  left: string;
  right: string;
  select: (side: ComparatorSide, code: string) => void;
}

function useComparatorSelection(): ComparatorSelection {
  const router = useRouter();
  const params = useSearchParams();
  const left = params.get("a") ?? DEFAULT_LEFT;
  const right = params.get("b") ?? DEFAULT_RIGHT;

  function select(side: ComparatorSide, code: string): void {
    const next = new URLSearchParams(params.toString());
    next.set("a", side === "a" ? code : left);
    next.set("b", side === "b" ? code : right);
    router.replace(`/comparar?${next.toString()}`, { scroll: false });
  }

  return { left, right, select };
}

function seriesPoints(series: UseQueryResult<IndicatorSeries>): IndicatorPoint[] {
  return series.data?.points ?? [];
}

export function IndicatorComparator(): ReactElement {
  const { left, right, select } = useComparatorSelection();

  const leftSeries = useIndicatorSeries(left, { limit: SERIES_LIMIT, order: "asc" });
  const rightSeries = useIndicatorSeries(right, { limit: SERIES_LIMIT, order: "asc" });

  const isLoading = leftSeries.isLoading || rightSeries.isLoading;
  const leftPoints = seriesPoints(leftSeries);
  const rightPoints = seriesPoints(rightSeries);
  const months = commonMonths(leftPoints, rightPoints);
  const leftIndexed = indexToBase(leftPoints, months);
  const rightIndexed = indexToBase(rightPoints, months);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <IndicatorPicker
          label="Serie A"
          value={left}
          onChange={(code) => {
            select("a", code);
          }}
        />
        <IndicatorPicker
          label="Serie B"
          value={right}
          onChange={(code) => {
            select("b", code);
          }}
        />
      </div>

      <ComparisonBody
        isLoading={isLoading}
        left={left}
        right={right}
        leftIndexed={leftIndexed}
        rightIndexed={rightIndexed}
        months={months}
      />
    </div>
  );
}
