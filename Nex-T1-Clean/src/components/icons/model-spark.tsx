import type { SVGProps } from "react";

export function ModelSparkIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      {...props}
    >
      <path
        d="M11.92 1.889a7.035 7.035 0 0 1 7.034 7.032 7.033 7.033 0 0 1-3.694 6.184v3.053a.876.876 0 0 1-.875.875h-4.052v1.317h4.052l.089.003a.876.876 0 0 1 0 1.742l-.09.005H9.459a.876.876 0 0 1-.875-.875v-3.067c0-.483.392-.875.875-.875h4.052v-2.722c0-.347.205-.662.523-.801l.343-.164a5.286 5.286 0 0 0 2.828-4.675 5.285 5.285 0 0 0-5.283-5.282A5.285 5.285 0 0 0 6.639 8.92a5.286 5.286 0 0 0 2.828 4.675l.342.164.08.04a.875.875 0 0 1-.698 1.595l-.084-.032-.23-.105A7.036 7.036 0 0 1 4.89 8.92a7.035 7.035 0 0 1 7.032-7.032Zm.014 5.732a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z"
        fill="oklch(0.9296 0.007 106.53 / 0.55)"
        fillRule="evenodd"
        strokeWidth="1.75"
      />
    </svg>
  );
}
