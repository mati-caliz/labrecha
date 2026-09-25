"use client";
import type { ReactElement } from "react";

import type { GapLeg } from "@/lib/gaps";
import { SOURCE_METHODOLOGY, sourceLabel } from "@/lib/indicators";
import { hasText } from "@/lib/utils";

const MONO = "var(--font-jb-mono)";

function legSourcesLabel(leg: GapLeg): string {
  if (hasText(leg.historySource)) {
    return `${leg.label} — ${sourceLabel(leg.source)} + ${sourceLabel(leg.historySource)}`;
  }
  return `${leg.label} — ${sourceLabel(leg.source)}`;
}

export function GapSourceNotes({ legs }: Readonly<{ legs: GapLeg[] }>): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        marginTop: 16,
        paddingTop: 16,
        borderTop: "1px solid var(--line)",
      }}
    >
      {legs.map((leg) => (
        <div
          key={`${leg.code}-${leg.source}`}
          style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--ink3)", lineHeight: 1.5 }}
        >
          <b style={{ color: "var(--ink2)" }}>{legSourcesLabel(leg)}</b>
          {" · "}
          {SOURCE_METHODOLOGY[leg.source] ?? "Fuente oficial; ver publicación original."}
        </div>
      ))}
    </div>
  );
}
