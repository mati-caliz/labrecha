"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createQueryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, type ReactElement } from "react";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>): ReactElement {
  const [queryClient] = useState(createQueryClient);

  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      storageKey="labrecha-theme"
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
