"use client";

import { useIndicators } from "@/hooks/useLabrecha";
import { indicatorLabel, sourceLabel } from "@/lib/indicators";
import type { IndicatorSummary } from "@/lib/labrechaApi";
import { useAppStore } from "@/store/useStore";
import {
  Activity,
  Calculator,
  CalendarDays,
  Landmark,
  Lightbulb,
  LineChart,
  Newspaper,
  Scale,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { hasText } from "@/lib/utils";

interface Command {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  keywords: string;
  icon: ReactNode;
}

const STATIC_COMMANDS: Command[] = [
  {
    id: "route:inicio",
    title: "Inicio",
    subtitle: "Estado del país",
    href: "/",
    keywords: "inicio home estado del pais",
    icon: <LineChart className="h-4 w-4" />,
  },
  {
    id: "route:indicadores",
    title: "Indicadores",
    subtitle: "Catálogo completo",
    href: "/indicadores",
    keywords: "indicadores catalogo series",
    icon: <LineChart className="h-4 w-4" />,
  },
  {
    id: "route:brechas",
    title: "Brechas entre mediciones",
    subtitle: "Cambiaria, financiera, inflación esperada, reservas",
    href: "/brechas",
    keywords: "brecha cambiaria financiera dolar blue mep reservas inflacion esperada rem comparador",
    icon: <Scale className="h-4 w-4" />,
  },
  {
    id: "route:congreso",
    title: "Congreso",
    subtitle: "Votaciones, leyes y composición",
    href: "/congreso",
    keywords: "congreso diputados senado votaciones leyes",
    icon: <Landmark className="h-4 w-4" />,
  },
  {
    id: "route:noticias",
    title: "Noticias económicas",
    subtitle: "Últimos titulares de economía",
    href: "/noticias",
    keywords: "noticias titulares prensa economia el economista",
    icon: <Newspaper className="h-4 w-4" />,
  },
  {
    id: "route:ideas",
    title: "Ideas",
    subtitle: "Ideas, leyes y análisis para Argentina",
    href: "/ideas",
    keywords: "ideas propuestas leyes analisis blog publicaciones",
    icon: <Lightbulb className="h-4 w-4" />,
  },
  {
    id: "route:feriados",
    title: "Feriados de Argentina",
    subtitle: "Calendario de feriados nacionales",
    href: "/feriados",
    keywords: "feriados calendario dias no laborables asueto",
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    id: "route:estado",
    title: "Estado del observatorio",
    subtitle: "Salud del scraper",
    href: "/estado",
    keywords: "estado salud scraper conectores corridas errores pipeline status",
    icon: <Activity className="h-4 w-4" />,
  },
  {
    id: "route:sueldo",
    title: "Calculadora de sueldo neto",
    href: "/calculadora-sueldo-neto",
    keywords: "calculadora sueldo neto ganancias impuesto",
    icon: <Calculator className="h-4 w-4" />,
  },
  {
    id: "route:impacto",
    title: "Calculadora de impacto fiscal",
    href: "/calculadora-impacto-fiscal",
    keywords: "calculadora impacto fiscal tax freedom day impuestos",
    icon: <Calculator className="h-4 w-4" />,
  },
  {
    id: "route:interes",
    title: "Calculadora de interés compuesto",
    href: "/calculadora-interes-compuesto",
    keywords: "calculadora interes compuesto inversion",
    icon: <Calculator className="h-4 w-4" />,
  },
  {
    id: "route:ajuste",
    title: "Calculadora de ajuste por inflación",
    href: "/calculadora-ajuste-inflacion",
    keywords: "calculadora ajuste inflacion ipc actualizar",
    icon: <Calculator className="h-4 w-4" />,
  },
];

const DIACRITICS = /\p{Diacritic}/gu;

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(DIACRITICS, "");
}

const FOCUS_DELAY_MS = 0;

function useCommandShortcut(commandOpen: boolean, setCommandOpen: (open: boolean) => void): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(!commandOpen);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [commandOpen, setCommandOpen]);
}

function useCommands(indicators: IndicatorSummary[] | undefined): Command[] {
  return useMemo<Command[]>(() => {
    const indicatorCommands: Command[] = (indicators ?? []).map((indicator) => ({
      id: `indicator:${indicator.indicator_code}`,
      title: indicatorLabel(indicator.indicator_code),
      subtitle: indicator.sources.map(sourceLabel).join(" · "),
      href: `/indicador/${indicator.indicator_code}`,
      keywords: `${indicator.indicator_code} ${indicatorLabel(indicator.indicator_code)}`,
      icon: <LineChart className="h-4 w-4" />,
    }));
    return [...STATIC_COMMANDS, ...indicatorCommands];
  }, [indicators]);
}

function filterCommands(commands: Command[], query: string): Command[] {
  const normalizedQuery = normalize(query.trim());
  if (normalizedQuery.length === 0) {
    return commands;
  }
  return commands.filter((command) =>
    normalize(`${command.title} ${command.keywords}`).includes(normalizedQuery),
  );
}

interface CommandSearchInputProps {
  inputRef: RefObject<HTMLInputElement>;
  query: string;
  onQueryChange: (query: string) => void;
}

function CommandSearchInput({
  inputRef,
  query,
  onQueryChange,
}: Readonly<CommandSearchInputProps>): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <Search className="h-4 w-4" style={{ color: "var(--ink3)" }} />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => {
          onQueryChange(event.target.value);
        }}
        placeholder="Buscar indicador, calculadora, sección…"
        aria-label="Buscar"
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          background: "transparent",
          color: "var(--ink)",
          fontSize: "0.9375rem",
        }}
      />
    </div>
  );
}

interface CommandResultItemProps {
  command: Command;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}

function CommandResultItem({
  command,
  active,
  onSelect,
  onHover,
}: Readonly<CommandResultItemProps>): ReactElement {
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "9px 12px",
        borderRadius: "var(--radius-md)",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        background: active ? "var(--gap-bg)" : "transparent",
        color: active ? "var(--gap)" : "var(--ink)",
      }}
    >
      <span style={{ color: active ? "var(--gap)" : "var(--ink3)", flexShrink: 0 }}>{command.icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "0.875rem", fontWeight: 600 }}>{command.title}</span>
        {hasText(command.subtitle) && (
          <span
            style={{
              display: "block",
              fontSize: "0.75rem",
              color: "var(--ink3)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {command.subtitle}
          </span>
        )}
      </span>
    </button>
  );
}

export function CommandPalette(): ReactElement | null {
  const { commandOpen, setCommandOpen } = useAppStore();
  const { data: indicators } = useIndicators();
  const commands = useCommands(indicators);
  useCommandShortcut(commandOpen, setCommandOpen);

  if (!commandOpen) {
    return null;
  }
  return (
    <CommandPaletteDialog
      commands={commands}
      onClose={() => {
        setCommandOpen(false);
      }}
    />
  );
}

function CommandPaletteDialog({
  commands,
  onClose,
}: Readonly<{ commands: Command[]; onClose: () => void }>): ReactElement {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => inputRef.current?.focus(), FOCUS_DELAY_MS);
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  const results = useMemo(() => filterCommands(commands, query), [commands, query]);

  const go = (command: Command): void => {
    onClose();
    router.push(command.href);
  };

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const command = results[activeIndex];
      if (command) {
        go(command);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        paddingInline: 16,
      }}
    >
      <button
        type="button"
        aria-label="Cerrar buscador"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          border: "none",
          cursor: "default",
          background: "rgba(20,25,31,0.45)",
          backdropFilter: "blur(2px)",
        }}
      />
      <dialog
        open
        aria-label="Buscar en el observatorio"
        onKeyDown={onKeyDown}
        style={{
          position: "relative",
          margin: 0,
          padding: 0,
          width: "100%",
          maxWidth: 560,
          background: "var(--raise)",
          color: "var(--ink)",
          border: "1px solid var(--line2)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-raised)",
          overflow: "hidden",
        }}
      >
        <CommandSearchInput
          inputRef={inputRef}
          query={query}
          onQueryChange={(nextQuery) => {
            setQuery(nextQuery);
            setActiveIndex(0);
          }}
        />

        <div ref={listRef} style={{ maxHeight: "56vh", overflowY: "auto", padding: 6 }}>
          {results.length === 0 && (
            <p style={{ padding: "16px", color: "var(--ink3)", fontSize: "0.875rem", margin: 0 }}>
              Sin resultados para “{query}”.
            </p>
          )}
          {results.map((command, index) => (
            <CommandResultItem
              key={command.id}
              command={command}
              active={index === activeIndex}
              onSelect={() => {
                go(command);
              }}
              onHover={() => {
                setActiveIndex(index);
              }}
            />
          ))}
        </div>
      </dialog>
    </div>
  );
}
