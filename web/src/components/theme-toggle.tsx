"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore, type ReactElement } from "react";

type ThemeValue = "light" | "dark" | "system";

const labels: Record<ThemeValue, string> = {
  light: "Claro",
  dark: "Oscuro",
  system: "Sistema",
};

const SYSTEM_THEME: ThemeValue = "system";

function subscribeToNothing(): () => void {
  return () => undefined;
}

function useIsMounted(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

function ThemeIcon({ isSystem, isDark }: Readonly<{ isSystem: boolean; isDark: boolean }>): ReactElement {
  if (isSystem) {
    return <Monitor className="h-5 w-5" />;
  }
  if (isDark) {
    return <Moon className="h-5 w-5" />;
  }
  return <Sun className="h-5 w-5" />;
}

export function ThemeToggle(): ReactElement {
  const mounted = useIsMounted();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const isSystem = (theme ?? SYSTEM_THEME) === SYSTEM_THEME;
  const isDark = resolvedTheme === "dark";

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Cambiar tema" disabled>
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Cambiar tema">
          <ThemeIcon isSystem={isSystem} isDark={isDark} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[100] bg-popover" sideOffset={8}>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => {
            setTheme("light");
          }}
        >
          <Sun className="mr-2 h-4 w-4" />
          {labels.light}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => {
            setTheme("dark");
          }}
        >
          <Moon className="mr-2 h-4 w-4" />
          {labels.dark}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => {
            setTheme("system");
          }}
        >
          <Monitor className="mr-2 h-4 w-4" />
          {labels.system}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
