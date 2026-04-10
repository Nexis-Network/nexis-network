"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const RiveAnimation = dynamic(() => import("@/components/shared/rive-animation"), {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-transparent" />,
});


type RiveBgProps = {
    className?: string;
};

export function RiveBg({ className }: RiveBgProps) {
    return (
        <div className={cn("absolute inset-0 -z-10 overflow-hidden", className)}>
            <RiveAnimation
                className="absolute left-1/2 top-[60%] aspect-[1.87365] w-[1703px] -translate-x-1/2 -translate-y-1/2 xl:w-[1432px] lg:w-[1126px] sm:w-[818px]"
                src="/animations/shared/cta.riv"
                artboard="footer"
                intersectionRootMargin="0px 0px 600px 0px"
                animationRootMargin="0px 0px 300px 0px"
            />
        </div>
    );
}
