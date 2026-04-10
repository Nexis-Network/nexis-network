"use client";

import { useMemo } from "react";
import { Component, type ReactNode } from "react";
import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity.config";


import { logger } from '@/lib/logger';
// Skip static prerender — React SSR context unavailable during build

class StudioErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message?: string }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, message: undefined };
    }

    static getDerivedStateFromError(error: UntypedJson) {
        return { hasError: true, message: error instanceof Error ? error.message : String(error) };
    }

    componentDidCatch(error: UntypedJson) {
        logger.error("Sanity Studio render error", error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
                    <p className="text-sm font-medium text-red-500">Unable to load Sanity Studio</p>
                    <p className="text-sm text-muted-foreground max-w-md">
                        {this.state.message ?? "Check your network connection and that CORS is allowed for this origin in your Sanity project settings."}
                    </p>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function StudioPage() {
    // Only trust env vars; don't fall back to baked config defaults, otherwise the Studio
    // will try to hit a placeholder project and throw network errors.
    const missingConfig = useMemo(() => {
        const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
        const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
        return !projectId || !dataset;
    }, []);

    if (missingConfig) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-sm font-medium text-red-500">Sanity configuration missing</p>
                <p className="text-sm text-muted-foreground max-w-md">
                    Add NEXT_PUBLIC_SANITY_PROJECT_ID and NEXT_PUBLIC_SANITY_DATASET to your environment and restart the dev server.
                </p>
            </div>
        );
    }

    return (
        <StudioErrorBoundary>
            <NextStudio config={config} />
        </StudioErrorBoundary>
    );
}
