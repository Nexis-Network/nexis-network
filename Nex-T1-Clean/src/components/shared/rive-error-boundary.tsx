"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";


import { logger } from '@/lib/logger';
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
}

export class RiveErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(`RiveErrorBoundary caught an error in ${this.props.componentName || "Rive Component"}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || <div className="hidden" aria-hidden="true" />;
    }

    return this.props.children;
  }
}
