"use client";

import { QueryError } from "@/components/QueryError";
import { Skeleton } from "@/components/ui/skeleton";
import { useHolidays } from "@/hooks/useLabrecha";
import { daysUntil, formatLongDate, freeRunAround, holidayLabel, todayISO } from "@/lib/holidays";
import type { Holiday } from "@/lib/labrechaApi";
import { type CSSProperties, useEffect, useState } from "react";

const MONO = "var(--font-jb-mono)";
const LONG_WEEKEND_MIN_DAYS = 3;

function weekdayName(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("es-AR", { weekday: "long" });
}

function dayMonth(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

function useCountdown(targetISO: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!targetISO) {
    return undefined;
  }
  const target = new Date(`${targetISO}T00:00:00`).getTime();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return { days, hms: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` };
}

function TypeBadge({ holiday }: { holiday: Holiday }) {
  const fixed = holiday.is_fixed === true;
  const color = fixed ? "var(--event)" : "var(--gap)";
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: "0.68rem",
        color,
        border: `1px solid ${color}`,
        borderRadius: "var(--radius-pill)",
        padding: "4px 12px",
        whiteSpace: "nowrap",
      }}
    >
      {fixed ? "Inamovible" : "Trasladable"}
    </span>
  );
}

function CountdownHero({ holiday, targetISO }: { holiday: Holiday; targetISO: string }) {
  const countdown = useCountdown(targetISO);
  return (
    <div
      className="lb-holiday-hero"
      style={{
        background: "var(--gap-bg)",
        border: "1px solid var(--gap)",
        borderRadius: 14,
        padding: "36px 40px",
        marginBottom: 40,
        gap: 32,
        alignItems: "center",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: "0.68rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--gap)",
            marginBottom: 14,
          }}
        >
          Próximo feriado
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(1.75rem, 4vw, 2.125rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            margin: "0 0 10px",
            color: "var(--ink)",
          }}
        >
          {holidayLabel(holiday)}
        </h2>
        <div
          style={{
            fontFamily: MONO,
            fontSize: "0.82rem",
            color: "var(--ink2)",
            textTransform: "capitalize",
          }}
        >
          {formatLongDate(holiday.date)}
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: "clamp(3rem, 9vw, 4.5rem)",
            lineHeight: 0.85,
            letterSpacing: "-0.04em",
            color: "var(--ink)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {countdown?.days ?? "—"}
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: "0.72rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink2)",
            marginTop: 8,
          }}
        >
          días · {countdown?.hms ?? "00:00:00"}
        </div>
      </div>
    </div>
  );
}

const yearPillStyle = (active: boolean): CSSProperties => ({
  fontFamily: MONO,
  fontSize: "0.75rem",
  padding: "7px 15px",
  borderRadius: "var(--radius-pill)",
  cursor: "pointer",
  border: active ? "1px solid var(--ink)" : "1px solid var(--line)",
  background: active ? "var(--ink)" : "transparent",
  color: active ? "var(--paper)" : "var(--ink2)",
});

export function HolidaysCalendar() {
  const currentYear = new Date().getUTCFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  const [year, setYear] = useState(currentYear);
  const { data, isLoading, isError, error, refetch } = useHolidays({ year });

  if (isError) {
    return <QueryError error={error} onRetry={() => refetch()} />;
  }

  const holidays = [...(data ?? [])].sort((first, second) =>
    first.date < second.date ? -1 : first.date > second.date ? 1 : 0,
  );
  const today = todayISO();
  const holidayDates = new Set(holidays.map((holiday) => holiday.date));
  const nextHoliday = holidays.find((holiday) => holiday.date >= today);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 30, flexWrap: "wrap" }}>
        {years.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setYear(option)}
            style={yearPillStyle(option === year)}
          >
            {option}
          </button>
        ))}
      </div>

      {isLoading ? (
        <>
          <Skeleton className="h-[150px] rounded-[14px]" />
          <div style={{ height: 24 }} />
          <Skeleton className="h-[360px] rounded-[10px]" />
        </>
      ) : holidays.length === 0 ? (
        <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink2)" }}>
          No hay feriados cargados para {year}.
        </p>
      ) : (
        <>
          {year === currentYear && nextHoliday && (
            <CountdownHero holiday={nextHoliday} targetISO={nextHoliday.date} />
          )}

          <div
            style={{
              fontFamily: MONO,
              fontSize: "0.68rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink3)",
              marginBottom: 16,
            }}
          >
            {year === currentYear ? "Los feriados del año" : `Feriados ${year}`}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {holidays.map((holiday, index) => {
              const isPast = daysUntil(holiday.date) < 0;
              const freeRun = freeRunAround(holiday.date, holidayDates);
              return (
                <div
                  key={`${holiday.date}-${holiday.name}`}
                  className="lb-holiday-row"
                  style={{
                    alignItems: "center",
                    gap: 20,
                    padding: "18px 4px",
                    borderBottom: index === holidays.length - 1 ? "none" : "1px solid var(--line)",
                    opacity: isPast ? 0.5 : 1,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontWeight: 600,
                      fontSize: "0.9375rem",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {dayMonth(holiday.date)}
                    <br />
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--ink3)",
                        fontWeight: 400,
                        textTransform: "capitalize",
                      }}
                    >
                      {weekdayName(holiday.date)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "1.1875rem",
                      color: "var(--ink)",
                    }}
                  >
                    {holidayLabel(holiday)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    {freeRun.length >= LONG_WEEKEND_MIN_DAYS && (
                      <span
                        style={{
                          fontFamily: MONO,
                          fontSize: "0.68rem",
                          color: "var(--ink2)",
                          background: "var(--surface)",
                          border: "1px solid var(--line)",
                          borderRadius: "var(--radius-pill)",
                          padding: "4px 10px",
                        }}
                      >
                        Finde de {freeRun.length} días
                      </span>
                    )}
                    <TypeBadge holiday={holiday} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 24, fontFamily: MONO, fontSize: "0.7rem", color: "var(--ink3)" }}>
            Fuente: calendario oficial de feriados nacionales · Nager.Date.
          </div>
        </>
      )}
    </div>
  );
}
