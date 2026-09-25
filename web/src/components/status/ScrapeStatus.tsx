"use client";
import type { ReactElement } from "react";

import { QueryError } from "@/components/QueryError";
import { Card } from "@/components/core";
import { Skeleton } from "@/components/ui/skeleton";
import { useScrapeRuns } from "@/hooks/useLabrecha";
import { compareIsoDates } from "@/lib/isoDates";
import type { ScrapeRun } from "@/lib/labrechaApi";
import { SCRAPE_RUNS_PARAMS } from "@/lib/queryParams";
import { hasText } from "@/lib/utils";

import { formatDurationBetween, formatElapsedSince } from "./relativeTime";

const SKELETON_KEYS = ["e1", "e2", "e3", "e4", "e5", "e6"];

const STATUS_SUCCESS = "success";
const STATUS_EMPTY = "empty";
const STATUS_RUNNING = "running";

const EMPTY_LABEL = "sin datos";
const EMPTY_HINT = "el conector corrió sin errores pero no trajo filas nuevas";

function isSuccess(run: ScrapeRun): boolean {
  return run.status.toLowerCase() === STATUS_SUCCESS;
}

function isEmpty(run: ScrapeRun): boolean {
  return run.status.toLowerCase() === STATUS_EMPTY;
}

function statusColor(run: ScrapeRun): string {
  if (isSuccess(run)) {
    return "var(--pos)";
  }
  if (isEmpty(run) || run.status.toLowerCase() === STATUS_RUNNING) {
    return "var(--gap)";
  }
  return "var(--neg)";
}

function statusLabel(run: ScrapeRun): string {
  if (isSuccess(run)) {
    return "OK";
  }
  if (isEmpty(run)) {
    return EMPTY_LABEL;
  }
  return run.status;
}

function relativeTime(iso: string | null): string {
  if (!hasText(iso)) {
    return "—";
  }
  return formatElapsedSince(iso);
}

function durationLabel(run: ScrapeRun): string {
  if (!hasText(run.started_at) || !hasText(run.finished_at)) {
    return "—";
  }
  return formatDurationBetween(run.started_at, run.finished_at);
}

function compareRunsFailingFirstThenNewest(first: ScrapeRun, second: ScrapeRun): number {
  const firstOk = isSuccess(first) ? 1 : 0;
  const secondOk = isSuccess(second) ? 1 : 0;
  if (firstOk !== secondOk) {
    return firstOk - secondOk;
  }
  const firstTime = first.finished_at ?? first.started_at ?? "";
  const secondTime = second.finished_at ?? second.started_at ?? "";
  return compareIsoDates(secondTime, firstTime);
}

function StatusRow({ run }: Readonly<{ run: ScrapeRun }>): ReactElement {
  const ok = isSuccess(run);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 14px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--line)",
        background: ok ? "var(--surface)" : "var(--gap-bg)",
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: 999,
          background: statusColor(run),
          marginTop: 5,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span className="num" style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)" }}>
            {run.job_name}
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--ink3)" }}>
            {relativeTime(run.finished_at ?? run.started_at)}
          </span>
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--ink2)" }}>
          {statusLabel(run)} · {(run.rows_upserted ?? 0).toLocaleString("es-AR")} filas · {durationLabel(run)}
        </div>
        {isEmpty(run) && <div style={{ fontSize: "0.6875rem", color: "var(--gap)" }}>{EMPTY_HINT}</div>}
        {hasText(run.error) && !isEmpty(run) && (
          <div
            style={{
              fontFamily: "var(--font-jb-mono)",
              fontSize: "0.6875rem",
              color: "var(--neg)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {run.error}
          </div>
        )}
      </div>
    </div>
  );
}

export function ScrapeStatus(): ReactElement {
  const { data, isLoading, isError, error, refetch } = useScrapeRuns(SCRAPE_RUNS_PARAMS);

  if (isError) {
    return (
      <QueryError
        error={error}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-[64px] rounded-[8px]" />
        ))}
      </div>
    );
  }

  const runs = [...(data ?? [])];
  if (runs.length === 0) {
    return (
      <Card>
        <p style={{ color: "var(--ink3)", margin: 0 }}>No hay corridas registradas todavía.</p>
      </Card>
    );
  }

  runs.sort(compareRunsFailingFirstThenNewest);

  const total = runs.length;
  const failing = runs.filter((run) => !isSuccess(run)).length;

  return (
    <Card
      title="Salud del scraper"
      subtitle="Última corrida de cada conector. Los conectores con error se muestran arriba."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div>
            <span className="num" style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              {total}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--ink3)", marginLeft: 6 }}>conectores</span>
          </div>
          <div>
            <span
              className="num"
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: failing === 0 ? "var(--pos)" : "var(--neg)",
              }}
            >
              {failing}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--ink3)", marginLeft: 6 }}>
              con error o sin datos
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {runs.map((run) => (
            <StatusRow key={run.job_name} run={run} />
          ))}
        </div>
      </div>
    </Card>
  );
}
