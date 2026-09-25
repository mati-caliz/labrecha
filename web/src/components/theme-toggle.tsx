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
import { useEffect, useState } from "react";

type ThemeValue = "light" | "dark" | "system";

const labels: Record<ThemeValue, string> = {
  light: "Claro",
  dark: "Oscuro",
  system: "Sistema",
};

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = (theme ?? "system") as ThemeValue;
  const isDark = resolvedTheme === "dark";

  const getIcon = () => {
    if (currentTheme === "system") {
      return Monitor;
    }
    if (isDark) {
      return Moon;
    }
    return Sun;
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Cambiar tema" disabled>
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const Icon = getIcon();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Cambiar tema">
          <Icon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[100] bg-popover" sideOffset={8}>
        <DropdownMenuItem className="cursor-pointer" onSelect={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          {labels.light}
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onSelect={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          {labels.dark}
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onSelect={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          {labels.system}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
