"use client";

/**
 * Chat Error Boundary
 * Production-grade error handling for chat system
 */

import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";


import { logger } from '@/lib/logger';
type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ChatErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      logger.error("Chat Error Boundary caught error:", error);
      logger.error("Chat Error Boundary stack:", error?.stack ?? "No error stack available");
      logger.error("Chat Error Boundary component stack:", errorInfo.componentStack ?? "No component stack");
    }

    // Capture for production observability
    try {
      Sentry.captureException(error, {
        contexts: { react: { componentStack: errorInfo.componentStack } },
        tags: { area: "chat", boundary: "ChatErrorBoundary" },
      });
    } catch (captureError) {
      if (process.env.NODE_ENV === "development") {
        logger.warn("Sentry capture failed", captureError);
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.handleReset);
      }

      return <ChatErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

function ChatErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertCircle className="size-8 text-destructive" />
      </div>

      <div className="space-y-2 text-center">
        <h3 className="font-regular text-lg text-foreground">Something went wrong</h3>
        <p className="text-muted-foreground text-sm max-w-md">
          The chat encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
        </p>

        {process.env.NODE_ENV === "development" && error && (
          <details className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-left">
            <summary className="cursor-pointer font-mono text-xs text-muted-foreground">
              Error Details (Dev Only)
            </summary>
            <pre className="mt-2 overflow-auto text-[10px] text-destructive">
              {error.message}
              {"\n"}
              {error.stack}
            </pre>
          </details>
        )}
      </div>

      <Button onClick={onReset} className="gap-2">
        <RefreshCw className="size-4" />
        Try Again
      </Button>
    </div>
  );
}
