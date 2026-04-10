"use client";

import { Alignment, Fit, Layout, useRive } from "@rive-app/react-canvas";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";
import { RiveErrorBoundary } from "./rive-error-boundary";

// Set the WASM URL to load from the local public directory
// RuntimeLoader.setWasmUrl("/wasm/rive.wasm");

// Simple hook to detect touch device (simplified version of what might be in the other project)
function useIsTouchDevice() {
    if (typeof window === "undefined") return false;
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

type RiveAnimationProps = {
    className?: string;
    intersectionClassName?: string;
    src: string;
    artboard: string;
    stateMachines?: string;
    autoplay?: boolean;
    fit?: keyof typeof Fit;
    alignment?: keyof typeof Alignment;
    intersectionRootMargin?: string;
    animationRootMargin?: string;
    onLoad?: () => void;
};

const RiveAnimation = ({
    className = "",
    intersectionClassName = "",
    src,
    artboard,
    stateMachines = "SM",
    autoplay = false,
    fit = "FitWidth",
    alignment = "TopCenter",
    intersectionRootMargin = "500px 0px",
    animationRootMargin = "300px 0px",
    onLoad,
}: RiveAnimationProps) => {
    const isTouch = useIsTouchDevice();
    const [containerRef, isIntersecting] = useInView({
        triggerOnce: true,
        rootMargin: intersectionRootMargin,
    });
    const [animationRef, isVisible] = useInView({ rootMargin: animationRootMargin });

    const { rive, RiveComponent } = useRive({
        src,
        artboard,
        autoplay,
        stateMachines,
        layout: new Layout({
            fit: Fit[fit],
            alignment: Alignment[alignment],
        }),
        onLoad: () => {
            rive?.resizeDrawingSurfaceToCanvas();
            onLoad?.();
        },
    });

    useEffect(() => {
        if (!rive) {
            return;
        }

        if (isVisible) {
            rive.play();
        } else {
            rive.pause();
        }
    }, [rive, isVisible]);

    return (
        <RiveErrorBoundary componentName="RiveAnimation">
            <span
                className={cn(intersectionClassName, "absolute left-1/2 top-0 -z-10 h-full w-px")}
                ref={containerRef}
                aria-hidden
            />
            <div
                className={cn(
                    className,
                    {
                        "pointer-events-none": isTouch,
                    },
                    "[&_canvas]:!h-auto [&_canvas]:!w-full"
                )}
                ref={animationRef}
                aria-hidden
            >
                {isIntersecting ? <RiveComponent /> : null}
            </div>
        </RiveErrorBoundary>
    );
};

export default RiveAnimation;
