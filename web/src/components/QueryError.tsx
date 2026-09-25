"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Clock, RefreshCw, ServerCrash, WifiOff, type LucideIcon } from "lucide-react";
import type { ReactElement } from "react";
import { hasText } from "@/lib/utils";

const ERROR_MESSAGES = {
  errorTitle: "Error",
  errorGeneric: "Ocurrió un error inesperado. Intentá nuevamente.",
  errorUnauthorized: "Sesión expirada o no autorizado. Iniciá sesión nuevamente.",
  errorNoConnection: "Sin conexión",
  errorNetwork: "No se pudo conectar con el servidor. Verificá tu conexión a internet.",
  errorTimeOutTitle: "Tiempo agotado",
  errorTimeout: "La solicitud tardó demasiado. Intentá nuevamente.",
  errorServerTitle: "Error del servidor",
  errorServer: "El servidor no está disponible. Intentá más tarde.",
  retry: "Reintentar",
} as const;

const HTTP_UNAUTHORIZED = 401;
const NETWORK_ERROR_MARKERS = ["Network", "fetch"];
const TIMEOUT_ERROR_MARKERS = ["timeout", "Timeout"];
const SERVER_ERROR_MARKERS = ["500", "502", "503"];

type ErrorKind = "unauthorized" | "network" | "timeout" | "server" | "generic";

interface ErrorConfig {
  icon: LucideIcon;
  defaultTitle: string;
  message: string;
  color: string;
  bgColor: string;
}

const ERROR_CONFIGS: Record<ErrorKind, ErrorConfig> = {
  unauthorized: {
    icon: AlertCircle,
    defaultTitle: ERROR_MESSAGES.errorTitle,
    message: ERROR_MESSAGES.errorUnauthorized,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  network: {
    icon: WifiOff,
    defaultTitle: ERROR_MESSAGES.errorNoConnection,
    message: ERROR_MESSAGES.errorNetwork,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  timeout: {
    icon: Clock,
    defaultTitle: ERROR_MESSAGES.errorTimeOutTitle,
    message: ERROR_MESSAGES.errorTimeout,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  server: {
    icon: ServerCrash,
    defaultTitle: ERROR_MESSAGES.errorServerTitle,
    message: ERROR_MESSAGES.errorServer,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  generic: {
    icon: AlertCircle,
    defaultTitle: ERROR_MESSAGES.errorTitle,
    message: ERROR_MESSAGES.errorGeneric,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
};

interface QueryErrorProps {
  error: Error | null;
  onRetry?: () => void;
  title?: string;
  compact?: boolean;
}

function readResponseStatus(error: Error): number | undefined {
  if (!("response" in error)) {
    return undefined;
  }
  const { response } = error;
  if (typeof response !== "object" || response === null || !("status" in response)) {
    return undefined;
  }
  return typeof response.status === "number" ? response.status : undefined;
}

function messageIncludesAny(error: Error, markers: readonly string[]): boolean {
  return markers.some((marker) => error.message.includes(marker));
}

function classifyError(error: Error | null): ErrorKind {
  if (error === null) {
    return "generic";
  }
  if (readResponseStatus(error) === HTTP_UNAUTHORIZED) {
    return "unauthorized";
  }
  if (messageIncludesAny(error, NETWORK_ERROR_MARKERS) || error.name === "TypeError") {
    return "network";
  }
  if (messageIncludesAny(error, TIMEOUT_ERROR_MARKERS)) {
    return "timeout";
  }
  if (messageIncludesAny(error, SERVER_ERROR_MARKERS)) {
    return "server";
  }
  return "generic";
}

interface ErrorViewProps {
  config: ErrorConfig;
  title: string;
  onRetry: (() => void) | undefined;
}

function CompactQueryError({ config, title, onRetry }: Readonly<ErrorViewProps>): ReactElement {
  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${config.bgColor}`}>
      <Icon className={`h-5 w-5 ${config.color} shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${config.color}`}>{title}</p>
        <p className="text-xs text-gray-400 truncate">{config.message}</p>
      </div>
      {onRetry !== undefined && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

interface FullQueryErrorProps extends ErrorViewProps {
  devErrorMessage: string | undefined;
}

function FullQueryError({
  config,
  title,
  onRetry,
  devErrorMessage,
}: Readonly<FullQueryErrorProps>): ReactElement {
  const Icon = config.icon;
  return (
    <Card className="bg-card">
      <CardContent className="p-8 text-center">
        <div className={`mx-auto mb-4 p-3 rounded-full w-fit ${config.bgColor}`}>
          <Icon className={`h-8 w-8 ${config.color}`} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm mb-4">{config.message}</p>

        {process.env.NODE_ENV === "development" && devErrorMessage !== undefined && (
          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg text-left overflow-auto max-h-24">
            <p className="text-xs font-mono text-gray-500">{devErrorMessage}</p>
          </div>
        )}

        {onRetry !== undefined && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            {ERROR_MESSAGES.retry}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function QueryError({
  error,
  onRetry,
  title,
  compact = false,
}: Readonly<QueryErrorProps>): ReactElement {
  const kind = classifyError(error);
  const config = ERROR_CONFIGS[kind];
  const resolvedTitle = hasText(title) ? title : config.defaultTitle;

  if (compact) {
    return <CompactQueryError config={config} title={resolvedTitle} onRetry={onRetry} />;
  }

  const devErrorMessage = kind === "unauthorized" ? ERROR_MESSAGES.errorUnauthorized : error?.message;

  return (
    <FullQueryError
      config={config}
      title={resolvedTitle}
      onRetry={onRetry}
      devErrorMessage={devErrorMessage}
    />
  );
}

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string | undefined }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon: Icon = AlertCircle,
  title,
  description,
  action,
}: Readonly<EmptyStateProps>): ReactElement {
  return (
    <Card className="bg-card">
      <CardContent className="p-8 text-center">
        <div className="mx-auto mb-4 p-3 bg-gray-800/50 rounded-full w-fit">
          <Icon className="h-8 w-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        {hasText(description) && <p className="text-gray-400 text-sm mb-4">{description}</p>}
        {action !== undefined && (
          <Button onClick={action.onClick} variant="outline">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
