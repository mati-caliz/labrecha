"use client";
import type { ReactElement } from "react";

import { Card } from "@/components/core";
import { Skeleton } from "@/components/ui/skeleton";
import { useCongressAttendance } from "@/hooks/useLabrecha";
import { chamberLabel } from "@/lib/chambers";
import { formatNumberAR } from "@/lib/indicators";

const PERCENT_CAP = 100;
const HIGH_ATTENDANCE_PCT = 85;
const MEDIUM_ATTENDANCE_PCT = 75;

function attendanceColor(attendancePct: number): string {
  if (attendancePct >= HIGH_ATTENDANCE_PCT) {
    return "var(--pos)";
  }
  if (attendancePct >= MEDIUM_ATTENDANCE_PCT) {
    return "var(--serie-1)";
  }
  return "var(--neg)";
}

export function BlocAttendance(): ReactElement | null {
  const { data, isLoading } = useCongressAttendance();

  if (isLoading) {
    return <Skeleton className="h-[360px] rounded-[10px]" />;
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return null;
  }

  return (
    <Card
      title="Presentismo por bloque"
      subtitle="Cuántas veces estuvieron presentes en las votaciones nominales de cada cámara"
      footer={
        <span style={{ fontSize: "0.6875rem", color: "var(--ink3)" }}>
          Presentismo = votos no ausentes sobre el total, por bloque y por cámara. Bloques con al menos 1.000
          votos registrados. Fuentes: HCDN y Senado de la Nación.
        </span>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((row) => {
          const pct = Number.parseFloat(row.attendance_pct);
          const fill = Math.min(PERCENT_CAP, Math.max(0, pct));
          return (
            <div key={`${row.chamber}-${row.bloc}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                title={`${row.bloc} · ${chamberLabel(row.chamber)}`}
                style={{
                  width: 160,
                  fontSize: "0.6875rem",
                  color: "var(--ink2)",
                  fontWeight: 600,
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flexShrink: 0,
                }}
              >
                {row.bloc}
              </span>
              <span
                style={{
                  fontSize: "0.625rem",
                  color: "var(--ink3)",
                  width: 62,
                  flexShrink: 0,
                }}
              >
                {chamberLabel(row.chamber)}
              </span>
              <div style={{ flex: 1, height: 13, background: "var(--surface)", borderRadius: 3 }}>
                <div
                  style={{
                    width: `${fill}%`,
                    height: "100%",
                    borderRadius: 3,
                    background: attendanceColor(pct),
                  }}
                />
              </div>
              <span
                className="num"
                style={{
                  width: 46,
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {formatNumberAR(pct, 1)}%
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
