import Link from "next/link";
import { cn } from "@/lib/utils";

interface HackerNewsLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  href?: string;
  className?: string;
  withText?: boolean;
}

export function HackerNewsLogo({
  size = "md",
  href = "https://news.ycombinator.com",
  className,
  withText = false,
}: HackerNewsLogoProps) {
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
    xl: "w-12 h-12 text-lg",
  };

  const Logo = (
    <div className={cn("flex items-center", className)}>
      <div
        className={cn(
          "flex items-center justify-center bg-[#ff6600] font-bold text-white",
          sizeClasses[size]
        )}
      >
        Y
      </div>
      {withText && (
        <span
          className={cn("ml-2 font-regular text-[#ff6600]", {
            "text-xs": size === "sm",
            "text-sm": size === "md",
            "text-base": size === "lg",
            "text-lg": size === "xl",
          })}
        >
          Hacker News
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link aria-label="Hacker News" href={href}>
        {Logo}
      </Link>
    );
  }

  return Logo;
}

export function TriggerDevLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      height={130}
      viewBox="0 0 750 130"
      width={750}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M194.576 16.268h-59.577 2.354V32.51h20.059v69.89h16.982V32.51h20.182V16.268z"
        fill="url(#paint0_linear_173_70)"
      />
      <path
        d="M210.819 51.459V40.877h-15.874V102.4h15.874V72.992c0-12.92 10.461-16.612 18.706-15.627V39.646c-7.753 0-15.506 3.446-18.706 11.813z"
        fill="url(#paint1_linear_173_70)"
      />
      <path
        d="M246.508 33.494c5.414 0 9.845-4.43 9.845-9.72 0-5.292-4.431-9.844-9.845-9.844-5.292 0-9.722 4.552-9.722 9.843s4.43 9.721 9.722 9.721zm-7.876 68.906h15.875V40.877h-15.875V102.4z"
        fill="url(#paint2_linear_173_70)"
      />
      <path
        d="M314.807 40.877v7.629c-4.307-5.784-10.952-9.352-19.69-9.352-17.474 0-30.641 14.273-30.641 31.5 0 17.35 13.167 31.5 30.641 31.5 8.738 0 15.383-3.569 19.69-9.352v6.645c0 9.72-6.153 15.134-16.121 15.134-9.475 0-13.536-3.814-16.121-8.613l-13.536 7.752c5.414 9.967 15.998 15.011 29.165 15.011 16.244 0 32.118-9.105 32.118-29.284v-58.57h-15.505zM297.579 87.51c-9.968 0-17.229-7.013-17.229-16.857 0-9.72 7.261-16.734 17.229-16.734 9.967 0 17.228 7.013 17.228 16.734 0 9.844-7.261 16.857-17.228 16.857z"
        fill="url(#paint3_linear_173_70)"
      />
      <path
        d="M390.49 40.877v7.629c-4.307-5.784-10.953-9.352-19.69-9.352-17.474 0-30.642 14.273-30.642 31.5 0 17.35 13.168 31.5 30.642 31.5 8.737 0 15.383-3.569 19.69-9.352v6.645c0 9.72-6.153 15.134-16.121 15.134-9.476 0-13.537-3.814-16.121-8.613l-13.537 7.752c5.415 9.967 15.998 15.011 29.166 15.011 16.243 0 32.118-9.105 32.118-29.284v-58.57H390.49zM373.261 87.51c-9.968 0-17.228-7.013-17.228-16.857 0-9.72 7.26-16.734 17.228-16.734 9.968 0 17.229 7.013 17.229 16.734 0 9.844-7.261 16.857-17.229 16.857z"
        fill="url(#paint4_linear_173_70)"
      />
      <path
        d="M432.454 78.16h46.394c.369-2.092.615-4.184.615-6.522 0-18.088-12.921-32.484-31.134-32.484-19.321 0-32.488 14.15-32.488 32.484 0 18.334 13.044 32.484 33.718 32.484 11.814 0 21.044-4.798 26.827-13.166l-12.798-7.382c-2.707 3.568-7.63 6.152-13.783 6.152-8.368 0-15.136-3.445-17.351-11.566zm-.246-12.305c1.846-7.875 7.63-12.428 16.121-12.428 6.645 0 13.29 3.569 15.259 12.428h-31.38z"
        fill="url(#paint5_linear_173_70)"
      />
      <path
        d="M504.753 51.459V40.877h-15.875V102.4h15.875V72.992c0-12.92 10.46-16.612 18.705-15.627V39.646c-7.753 0-15.506 3.446-18.705 11.813z"
        fill="url(#paint6_linear_173_70)"
      />
      <path
        d="M529.488 103.999c5.783 0 10.46-4.675 10.46-10.459a10.451 10.451 0 00-10.46-10.459 10.45 10.45 0 00-10.46 10.46 10.45 10.45 0 0010.46 10.458z"
        fill="url(#paint7_linear_173_70)"
      />
      <path
        d="M596.186 16.268v31.868c-4.43-5.66-10.953-8.982-19.936-8.982-16.49 0-30.026 14.15-30.026 32.484 0 18.334 13.536 32.484 30.026 32.484 8.983 0 15.506-3.322 19.936-8.982v7.26h15.875V16.268h-15.875zm-16.982 72.72c-9.845 0-17.106-7.014-17.106-17.35 0-10.336 7.261-17.35 17.106-17.35 9.721 0 16.982 7.014 16.982 17.35 0 10.336-7.261 17.35-16.982 17.35z"
        fill="url(#paint8_linear_173_70)"
      />
      <path
        d="M637.534 78.16h46.393c.37-2.092.616-4.184.616-6.522 0-18.088-12.922-32.484-31.134-32.484-19.321 0-32.488 14.15-32.488 32.484 0 18.334 13.044 32.484 33.718 32.484 11.814 0 21.043-4.799 26.827-13.166l-12.798-7.382c-2.707 3.568-7.63 6.152-13.783 6.152-8.368 0-15.136-3.445-17.351-11.566zm-.246-12.305c1.846-7.875 7.629-12.428 16.121-12.428 6.645 0 13.29 3.569 15.259 12.428h-31.38z"
        fill="url(#paint9_linear_173_70)"
      />
      <path
        d="M732.413 40.877L717.4 83.943l-14.891-43.066h-17.474l23.381 61.523h18.09l23.381-61.523h-17.474z"
        fill="url(#paint10_linear_173_70)"
      />
      <path
        clipRule="evenodd"
        d="M35.218 42.395L58.965 1.269l58.853 101.925H.113L23.86 62.066l16.799 9.698-6.948 12.033H84.22L58.965 40.061l-6.947 12.033-16.8-9.7z"
        fill="url(#paint11_linear_173_70)"
        fillRule="evenodd"
      />
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint0_linear_173_70"
          x1={329.229}
          x2={329.229}
          y1={150.079}
          y2={13.9297}
        >
          <stop stopColor="#41FF54" />
          <stop offset={1} stopColor="#E7FF52" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint1_linear_173_70"
          x1={329.229}
          x2={329.229}
          y1={150.079}
          y2={13.9297}
        >
          <stop stopColor="#41FF54" />
          <stop offset={1} stopColor="#E7FF52" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint2_linear_173_70"
          x1={329.229}
          x2={329.229}
          y1={150.079}
          y2={13.9297}
        >
          <stop stopColor="#41FF54" />
          <stop offset={1} stopColor="#E7FF52" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint3_linear_173_70"
          x1={329.229}
          x2={329.229}
          y1={150.079}
          y2={13.9297}
        >
          <stop stopColor="#41FF54" />
          <stop offset={1} stopColor="#E7FF52" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint4_linear_173_70"
          x1={329.229}
          x2={329.229}
          y1={150.079}
          y2={13.9297}
        >
          <stop stopColor="#41FF54" />
          <stop offset={1} stopColor="#E7FF52" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint5_linear_173_70"
          x1={329.229}
          x2={329.229}
          y1={150.079}
          y2={13.9297}
        >
          <stop stopColor="#41FF54" />
          <stop offset={1} stopColor="#E7FF52" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint6_linear_173_70"
          x1={329.229}
          x2={329.229}
          y1={150.079}
          y2={13.9297}
        >
          <stop stopColor="#41FF54" />
          <stop offset={1} stopColor="#E7FF52" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint7_linear_173_70"
          x1={634.457}
          x2={650.99}
          y1={139.717}
          y2={25.9719}
        >
          <stop stopColor="#2563EB" />
          <stop offset={1} stopColor="#A855F7" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint8_linear_173_70"
          x1={634.457}
          x2={650.99}
          y1={139.717}
          y2={25.9719}
        >
          <stop stopColor="#2563EB" />
          <stop offset={1} stopColor="#A855F7" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint9_linear_173_70"
          x1={634.457}
          x2={650.99}
          y1={139.717}
          y2={25.9719}
        >
          <stop stopColor="#2563EB" />
          <stop offset={1} stopColor="#A855F7" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint10_linear_173_70"
          x1={634.457}
          x2={650.99}
          y1={139.717}
          y2={25.9719}
        >
          <stop stopColor="#2563EB" />
          <stop offset={1} stopColor="#A855F7" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint11_linear_173_70"
          x1={95.4134}
          x2={94.3148}
          y1={103.194}
          y2={31.238}
        >
          <stop stopColor="#41FF54" />
          <stop offset={1} stopColor="#E7FF52" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function TriggerDevIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      height={95}
      viewBox="0 0 109 95"
      width={109}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        clipRule="evenodd"
        d="M32.569 38.191L54.53.158l54.426 94.26H.104l21.961-38.035L37.6 65.352l-6.425 11.127h46.71L54.53 36.034l-6.425 11.128-15.536-8.97z"
        fill="url(#paint0_linear_173_9378)"
        fillRule="evenodd"
      />
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint0_linear_173_9378"
          x1={88.2367}
          x2={87.2207}
          y1={94.4175}
          y2={27.8737}
        >
          <stop stopColor="#41FF54" />
          <stop offset={1} stopColor="#E7FF52" />
        </linearGradient>
      </defs>
    </svg>
  );
}
