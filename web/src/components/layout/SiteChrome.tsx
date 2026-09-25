"use client";

import { CommandPalette } from "@/components/layout/CommandPalette";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { usePathname } from "next/navigation";
import type { ReactNode, ReactElement } from "react";

export const EMBED_PREFIX = "/embed";

export function isEmbeddedPath(pathname: string): boolean {
  return pathname === EMBED_PREFIX || pathname.startsWith(`${EMBED_PREFIX}/`);
}

export function SiteChrome({ children }: Readonly<{ children: ReactNode }>): ReactElement {
  const pathname = usePathname();

  if (isEmbeddedPath(pathname)) {
    return <main>{children}</main>;
  }

  return (
    <>
      <div
        className="min-h-screen"
        style={{
          background: "var(--paper)",
          color: "var(--ink)",
          fontFamily: "var(--font-serif)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <SiteHeader />
        <main style={{ flex: 1 }}>{children}</main>
        <SiteFooter />
      </div>
      <CommandPalette />
    </>
  );
}
