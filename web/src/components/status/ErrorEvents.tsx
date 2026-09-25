"use client";

import { Card } from "@/components/core";
import { Skeleton } from "@/components/ui/skeleton";
import { useErrorEvents } from "@/hooks/useLabrecha";
import type { ErrorEvent } from "@/lib/labrechaApi";

const MONO = "var(--font-jb-mono)";
const SKELETON_KEYS = ["e1", "e2", "e3"];

const ORIGIN_LABELS: Record<string, string> = {
  api: "API",
  "web-server": "web (servidor)",
  "web-browser": "web (navegador)",
};

function originLabel(origin: string): string {
  return ORIGIN_LABELS[origin] ?? origin;
}

function relativeTime(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (Number.isNaN(minutes)) {
    return "—";
  }
  if (minutes < 1) {
    return "recién";
  }
  if (minutes < 60) {
    return `hace ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `hace ${hours} h`;
  }
  const days = Math.floor(hours / 24);
  return `hace ${days} día${days === 1 ? "" : "s"}`;
}

function ErrorRow({ event }: { event: ErrorEvent }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "12px 14px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--line)",
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "baseline",
        }}
      >
        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--neg)" }}>{event.kind}</span>
        <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--ink3)" }}>
          {originLabel(event.origin)} · {event.occurrences} {event.occurrences === 1 ? "vez" : "veces"} ·{" "}
          {relativeTime(event.last_seen_at)}
        </span>
      </div>
      <div style={{ fontSize: "0.8125rem", color: "var(--ink2)", wordBreak: "break-word" }}>
        {event.message}
      </div>
      {event.path === null ? null : (
        <div style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--ink3)" }}>{event.path}</div>
      )}
    </div>
  );
}

export function ErrorEvents() {
  const { data, isLoading } = useErrorEvents();

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-[72px] rounded-[8px]" />
        ))}
      </div>
    );
  }

  const events = data ?? [];

  return (
    <Card
      title="Errores en producción"
      subtitle="Agrupados por error, con cuántas veces pasó y cuándo fue la última. Los errores del scraper viven arriba, en su corrida."
    >
      {events.length === 0 ? (
        <p style={{ color: "var(--ink3)", margin: 0 }}>
          Ningún error registrado. Es la respuesta que queremos.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {events.map((event) => (
            <ErrorRow key={event.fingerprint} event={event} />
          ))}
        </div>
      )}
    </Card>
  );
}
