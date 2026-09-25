"use client";

import { QueryError } from "@/components/QueryError";
import { Skeleton } from "@/components/ui/skeleton";
import { useHolidays } from "@/hooks/useLabrecha";
import { daysUntil, formatLongDate, freeRunAround, holidayLabel, todayISO } from "@/lib/holidays";
import { compareIsoDates } from "@/lib/isoDates";
import type { Holiday } from "@/lib/labrechaApi";
import { type CSSProperties, useEffect, useState, type ReactElement } from "react";
import { hasText } from "@/lib/utils";

const MONO = "var(--font-jb-mono)";
const LONG_WEEKEND_MIN_DAYS = 3;
const PAST_HOLIDAY_OPACITY = 0.5;
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

function weekdayName(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("es-AR", { weekday: "long" });
}

function dayMonth(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

function useCountdown(targetISO: string | undefined): { days: number; hms: string } | undefined {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, MS_PER_SECOND);
    return () => {
      clearInterval(timer);
    };
  }, []);
  if (!hasText(targetISO)) {
    return undefined;
  }
  const target = new Date(`${targetISO}T00:00:00`).getTime();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / MS_PER_DAY);
  const hours = Math.floor((diff % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((diff % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((diff % MS_PER_MINUTE) / MS_PER_SECOND);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return { days, hms: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` };
}

function TypeBadge({ holiday }: Readonly<{ holiday: Holiday }>): ReactElement {
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

function CountdownHero({
  holiday,
  targetISO,
}: Readonly<{ holiday: Holiday; targetISO: string }>): ReactElement {
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

function HolidayRow({
  holiday,
  isLast,
  holidayDates,
}: Readonly<{ holiday: Holiday; isLast: boolean; holidayDates: Set<string> }>): ReactElement {
  const isPast = daysUntil(holiday.date) < 0;
  const freeRun = freeRunAround(holiday.date, holidayDates);
  return (
    <div
      className="lb-holiday-row"
      style={{
        alignItems: "center",
        gap: 20,
        padding: "18px 4px",
        borderBottom: isLast ? "none" : "1px solid var(--line)",
        opacity: isPast ? PAST_HOLIDAY_OPACITY : 1,
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
}

function HolidayYearView({
  holidays,
  year,
  isCurrentYear,
}: Readonly<{ holidays: Holiday[]; year: number; isCurrentYear: boolean }>): ReactElement {
  const today = todayISO();
  const holidayDates = new Set(holidays.map((holiday) => holiday.date));
  const nextHoliday = holidays.find((holiday) => holiday.date >= today);
  return (
    <>
      {isCurrentYear && nextHoliday && <CountdownHero holiday={nextHoliday} targetISO={nextHoliday.date} />}

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
        {isCurrentYear ? "Los feriados del año" : `Feriados ${year}`}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {holidays.map((holiday, index) => (
          <HolidayRow
            key={`${holiday.date}-${holiday.name}`}
            holiday={holiday}
            isLast={index === holidays.length - 1}
            holidayDates={holidayDates}
          />
        ))}
      </div>

      <div style={{ marginTop: 24, fontFamily: MONO, fontSize: "0.7rem", color: "var(--ink3)" }}>
        Fuente: calendario oficial de feriados nacionales · Nager.Date.
      </div>
    </>
  );
}

function HolidaysBody({
  isLoading,
  holidays,
  year,
  isCurrentYear,
}: Readonly<{
  isLoading: boolean;
  holidays: Holiday[];
  year: number;
  isCurrentYear: boolean;
}>): ReactElement {
  if (isLoading) {
    return (
      <>
        <Skeleton className="h-[150px] rounded-[14px]" />
        <div style={{ height: 24 }} />
        <Skeleton className="h-[360px] rounded-[10px]" />
      </>
    );
  }
  if (holidays.length === 0) {
    return (
      <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink2)" }}>
        No hay feriados cargados para {year}.
      </p>
    );
  }
  return <HolidayYearView holidays={holidays} year={year} isCurrentYear={isCurrentYear} />;
}

export function HolidaysCalendar(): ReactElement {
  const currentYear = new Date().getUTCFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  const [year, setYear] = useState(currentYear);
  const { data, isLoading, isError, error, refetch } = useHolidays({ year });

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

  const holidays = [...(data ?? [])].sort((first, second) => compareIsoDates(first.date, second.date));

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 30, flexWrap: "wrap" }}>
        {years.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setYear(option);
            }}
            style={yearPillStyle(option === year)}
          >
            {option}
          </button>
        ))}
      </div>

      <HolidaysBody
        isLoading={isLoading}
        holidays={holidays}
        year={year}
        isCurrentYear={year === currentYear}
      />
    </div>
  );
}
