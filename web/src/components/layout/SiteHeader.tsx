"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { useAppStore } from "@/store/useStore";
import { Coffee, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type CSSProperties, useState, useSyncExternalStore, type ReactElement } from "react";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "El país", href: "/" },
  { label: "Indicadores", href: "/indicadores" },
  { label: "Brechas", href: "/brechas" },
  { label: "Comparar", href: "/comparar" },
  { label: "Tasas", href: "/tasas" },
  { label: "Ideas", href: "/ideas" },
  { label: "Congreso", href: "/congreso" },
  { label: "Noticias", href: "/noticias" },
  { label: "Calculadoras", href: "/calculadoras" },
];

const APPLE_PLATFORM = /Mac|iPhone|iPad/;
const CAFECITO_URL = "https://cafecito.app/finlatam";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  if (href === "/calculadoras") {
    return pathname.startsWith("/calculadora");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BrandMark({ fontSize = 21 }: Readonly<{ fontSize?: number }>): ReactElement {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 8,
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
        }}
      >
        La Brecha
      </span>
      <span
        style={{
          width: 7,
          height: 7,
          flexShrink: 0,
          borderRadius: "50%",
          background: "var(--gap)",
          transform: "translateY(-2px)",
        }}
      />
    </span>
  );
}

function subscribeToNothing(): () => void {
  return () => undefined;
}

function useIsApplePlatform(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => APPLE_PLATFORM.test(navigator.userAgent),
    () => false,
  );
}

function CommandTrigger(): ReactElement {
  const setCommandOpen = useAppStore((state) => state.setCommandOpen);
  const isMac = useIsApplePlatform();

  return (
    <button
      type="button"
      onClick={() => {
        setCommandOpen(true);
      }}
      aria-label="Buscar"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 11px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid var(--line)",
        background: "var(--surface)",
        color: "var(--ink3)",
        fontFamily: "var(--font-jb-mono)",
        fontSize: "0.75rem",
        cursor: "pointer",
      }}
    >
      <Search size={14} aria-hidden />
      <span className="hidden sm:inline">Buscar</span>
      <span className="hidden md:inline">{isMac ? "⌘K" : "Ctrl K"}</span>
    </button>
  );
}

const NAV_LINK_BASE: CSSProperties = {
  padding: "8px 12px",
  borderRadius: "var(--radius-md)",
  fontFamily: "var(--font-jb-mono)",
  fontSize: "0.75rem",
  letterSpacing: "0.02em",
  textDecoration: "none",
};

function DesktopNav({ pathname }: Readonly<{ pathname: string }>): ReactElement {
  return (
    <nav className="hidden lg:flex" style={{ alignItems: "center", gap: 2 }}>
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              ...NAV_LINK_BASE,
              color: active ? "var(--ink)" : "var(--ink2)",
              background: active ? "var(--surface)" : "transparent",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function HeaderCafecitoLink(): ReactElement {
  return (
    <a
      href={CAFECITO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="hidden sm:inline-flex"
      style={{
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid var(--line)",
        background: "var(--surface)",
        color: "var(--gap)",
        fontFamily: "var(--font-jb-mono)",
        fontSize: "0.75rem",
        fontWeight: 600,
        textDecoration: "none",
      }}
    >
      <Coffee size={14} aria-hidden />
      <span className="hidden md:inline">Café</span>
    </a>
  );
}

function MobileNav({
  pathname,
  onNavigate,
}: Readonly<{ pathname: string; onNavigate: () => void }>): ReactElement {
  return (
    <nav
      className="flex lg:hidden"
      style={{
        borderTop: "1px solid var(--line)",
        background: "var(--paper)",
        padding: "8px 16px 16px",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            style={{
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              fontFamily: "var(--font-jb-mono)",
              fontSize: "0.8125rem",
              textDecoration: "none",
              color: active ? "var(--ink)" : "var(--ink2)",
              background: active ? "var(--surface)" : "transparent",
            }}
          >
            {item.label}
          </Link>
        );
      })}
      <a
        href={CAFECITO_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          marginTop: 6,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 12px",
          borderRadius: "var(--radius-md)",
          fontFamily: "var(--font-jb-mono)",
          fontSize: "0.8125rem",
          color: "var(--gap)",
          textDecoration: "none",
        }}
      >
        <Coffee size={14} aria-hidden />
        Invitame un café
      </a>
    </nav>
  );
}

export function SiteHeader(): ReactElement {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "color-mix(in oklch, var(--paper) 88%, transparent)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          maxWidth: "var(--container-max)",
          margin: "0 auto",
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <Link href="/" aria-label="Ir al inicio" style={{ flexShrink: 0 }}>
          <BrandMark />
        </Link>

        <DesktopNav pathname={pathname} />

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            className="hidden xl:inline"
            style={{
              fontFamily: "var(--font-jb-mono)",
              fontSize: "0.7rem",
              color: "var(--ink3)",
            }}
          >
            {today}
          </span>
          <div className="hidden sm:block">
            <CommandTrigger />
          </div>
          <HeaderCafecitoLink />
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex lg:hidden"
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => {
              setMobileOpen((open) => !open);
            }}
            style={{
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--ink2)",
              cursor: "pointer",
            }}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <MobileNav
          pathname={pathname}
          onNavigate={() => {
            setMobileOpen(false);
          }}
        />
      )}
    </header>
  );
}
