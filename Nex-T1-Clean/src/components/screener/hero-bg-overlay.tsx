import { cn } from "@/lib/utils";

interface HeroBgOverlayProps {
  className?: string;
}

export function HeroBgOverlay({ className }: HeroBgOverlayProps) {
  return (
    <svg
      width="1366"
      height="1204"
      viewBox="0 0 1366 1204"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-auto object-cover", className)}
      aria-hidden="true"
    >
      <g opacity="0.5">
        <g filter="url(#filter0_f_5_423)">
          <path
            d="M499.174 229.345L708.675 349.979L499.174 919.297L333.91 858.481L499.174 229.345Z"
            fill="#D9D9D9"
          />
          <path
            d="M499.174 229.345L708.675 349.979L499.174 919.297L333.91 858.481L499.174 229.345Z"
            fill="url(#paint0_linear_5_423)"
          />
        </g>
        <g opacity="0.22" filter="url(#filter1_f_5_423)">
          <path
            d="M508.078 200.508L1164.54 500.883L566.755 1002.78L255.06 888.083L200.508 515.981L508.078 200.508Z"
            fill="url(#paint1_linear_5_423)"
          />
        </g>
        <g opacity="0.25" filter="url(#filter2_f_5_423)">
          <path
            d="M984.196 436.504L880.756 398.44L669.225 973.275L772.664 1011.34L984.196 436.504Z"
            fill="#D9D9D9"
          />
          <path
            d="M984.196 436.504L880.756 398.44L669.225 973.275L772.664 1011.34L984.196 436.504Z"
            fill="url(#paint2_linear_5_423)"
          />
        </g>
        <g style={{ mixBlendMode: "overlay" }} filter="url(#filter3_f_5_423)">
          <path
            d="M492.822 713.672C534.22 731.894 600.924 671.365 641.81 578.478C682.695 485.59 682.28 395.519 640.882 377.297C599.483 359.075 532.779 419.603 491.894 512.49C451.008 605.378 451.424 695.45 492.822 713.672Z"
            fill="white"
          />
        </g>
      </g>
      <defs>
        <filter
          id="filter0_f_5_423"
          x="133.402"
          y="28.8376"
          width="775.781"
          height="1090.97"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="100.254"
            result="effect1_foregroundBlur_5_423"
          />
        </filter>
        <filter
          id="filter1_f_5_423"
          x="-6.10352e-05"
          y="-6.10352e-05"
          width="1365.05"
          height="1203.29"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="100.254"
            result="effect1_foregroundBlur_5_423"
          />
        </filter>
        <filter
          id="filter2_f_5_423"
          x="502.135"
          y="231.35"
          width="649.15"
          height="947.079"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="83.5448"
            result="effect1_foregroundBlur_5_423"
          />
        </filter>
        <filter
          id="filter3_f_5_423"
          x="274.359"
          y="186.918"
          width="584.985"
          height="717.132"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="93.5702"
            result="effect1_foregroundBlur_5_423"
          />
        </filter>
        <linearGradient
          id="paint0_linear_5_423"
          x1="510.294"
          y1="455.895"
          x2="676.156"
          y2="522.763"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#B1C8FF" />
          <stop offset="1" stopColor="#002F66" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_5_423"
          x1="602.571"
          y1="291.146"
          x2="756.782"
          y2="515.373"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3773FF" />
          <stop offset="1" stopColor="#00224A" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_5_423"
          x1="837.776"
          y1="563.274"
          x2="942.098"
          y2="603.928"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#B1C8FF" />
          <stop offset="1" stopColor="#002F66" />
        </linearGradient>
      </defs>
    </svg>
  );
}
