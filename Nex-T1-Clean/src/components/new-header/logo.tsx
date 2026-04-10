import Image from "next/image";

import { cn } from "@/lib/utils";

const LOGO_WIDTH = 101;
const LOGO_HEIGHT = 17;
const LOGO_ASPECT_RATIO = LOGO_WIDTH / LOGO_HEIGHT;

type HeaderLogoProps = {
	progress?: number;
	className?: string;
};

const interpolate = (from: number, to: number, progress: number) => from + (to - from) * progress;
const normalize = (value: number) => Math.min(1, Math.max(0, value));

export function HeaderLogo({ progress = 0, className }: HeaderLogoProps) {
	const clampedProgress = normalize(progress);
	const containerHeight = interpolate(18, 14, clampedProgress);
	const containerWidth = containerHeight * LOGO_ASPECT_RATIO;
	const logoScale = interpolate(1, 0.97, clampedProgress);
	const logoTranslateY = interpolate(0, -0.25, clampedProgress);

	return (
		<span
			aria-hidden="true"
			className={cn("inline-flex shrink-0 items-center justify-start overflow-visible", className)}
			style={{ width: `${containerWidth}px`, height: `${containerHeight}px` }}
		>
			<Image
				src="/assets/nzt-logoo-only.svg"
				alt=""
				priority
				width={LOGO_WIDTH}
				height={LOGO_HEIGHT}
				draggable={false}
				className="pointer-events-none block h-full w-full select-none object-contain object-left transition-transform duration-300 ease-out"
				style={{
					transform: `translateY(${logoTranslateY}px) scale(${logoScale})`,
					transformOrigin: "left center",
				}}
			/>
		</span>
	);
}
