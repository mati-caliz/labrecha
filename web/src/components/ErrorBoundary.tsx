"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { reportError } from "@/lib/errorReporter";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error);
      console.error("Component stack:", errorInfo.componentStack);
    } else {
      void reportError("web-browser", error, window.location.pathname);
    }

    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };
  handleGoHome = (): void => {
    window.location.href = "/";
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="bg-card max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-500/10 rounded-full w-fit">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <CardTitle className="text-xl text-white">Algo salió mal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-400 text-center text-sm">
                Ha ocurrido un error inesperado. Podés intentar recargar la página o volver al inicio.
              </p>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="p-3 bg-gray-800/50 rounded-lg overflow-auto max-h-32">
                  <p className="text-xs font-mono text-red-400">{this.state.error.message}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={this.handleReset} variant="outline" className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar
                </Button>
                <Button onClick={this.handleGoHome} variant="default" className="flex-1">
                  <Home className="mr-2 h-4 w-4" />
                  Ir al inicio
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
