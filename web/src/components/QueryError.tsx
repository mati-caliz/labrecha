"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Clock, RefreshCw, ServerCrash, WifiOff } from "lucide-react";

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

interface QueryErrorProps {
  error: Error | null;
  onRetry?: () => void;
  title?: string;
  compact?: boolean;
}

interface AxiosError extends Error {
  response?: { status?: number };
}

export function QueryError({ error, onRetry, title, compact = false }: QueryErrorProps) {
  const status = (error as AxiosError)?.response?.status;
  const isUnauthorized = status === 401;

  const isNetworkError =
    !isUnauthorized &&
    (error?.message?.includes("Network") || error?.message?.includes("fetch") || error?.name === "TypeError");

  const isTimeoutError =
    !isUnauthorized && (error?.message?.includes("timeout") || error?.message?.includes("Timeout"));

  const isServerError =
    !isUnauthorized &&
    (error?.message?.includes("500") || error?.message?.includes("502") || error?.message?.includes("503"));

  const getErrorConfig = () => {
    if (isUnauthorized) {
      return {
        icon: AlertCircle,
        title: title || ERROR_MESSAGES.errorTitle,
        message: ERROR_MESSAGES.errorUnauthorized,
        color: "text-red-500",
        bgColor: "bg-red-500/10",
      };
    }

    if (isNetworkError) {
      return {
        icon: WifiOff,
        title: title || ERROR_MESSAGES.errorNoConnection,
        message: ERROR_MESSAGES.errorNetwork,
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
      };
    }

    if (isTimeoutError) {
      return {
        icon: Clock,
        title: title || ERROR_MESSAGES.errorTimeOutTitle,
        message: ERROR_MESSAGES.errorTimeout,
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
      };
    }

    if (isServerError) {
      return {
        icon: ServerCrash,
        title: title || ERROR_MESSAGES.errorServerTitle,
        message: ERROR_MESSAGES.errorServer,
        color: "text-red-500",
        bgColor: "bg-red-500/10",
      };
    }

    return {
      icon: AlertCircle,
      title: title || ERROR_MESSAGES.errorTitle,
      message: ERROR_MESSAGES.errorGeneric,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    };
  };

  const config = getErrorConfig();
  const Icon = config.icon;

  const devErrorMessage = isUnauthorized ? ERROR_MESSAGES.errorUnauthorized : error?.message;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg ${config.bgColor}`}>
        <Icon className={`h-5 w-5 ${config.color} shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${config.color}`}>{config.title}</p>
          <p className="text-xs text-gray-400 truncate">{config.message}</p>
        </div>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="bg-card">
      <CardContent className="p-8 text-center">
        <div className={`mx-auto mb-4 p-3 rounded-full w-fit ${config.bgColor}`}>
          <Icon className={`h-8 w-8 ${config.color}`} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{config.title}</h3>
        <p className="text-gray-400 text-sm mb-4">{config.message}</p>

        {process.env.NODE_ENV === "development" && error && (
          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg text-left overflow-auto max-h-24">
            <p className="text-xs font-mono text-gray-500">{devErrorMessage}</p>
          </div>
        )}

        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            {ERROR_MESSAGES.retry}
          </Button>
        )}
      </CardContent>
    </Card>
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

export function EmptyState({ icon: Icon = AlertCircle, title, description, action }: EmptyStateProps) {
  return (
    <Card className="bg-card">
      <CardContent className="p-8 text-center">
        <div className="mx-auto mb-4 p-3 bg-gray-800/50 rounded-full w-fit">
          <Icon className="h-8 w-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        {description && <p className="text-gray-400 text-sm mb-4">{description}</p>}
        {action && (
          <Button onClick={action.onClick} variant="outline">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
