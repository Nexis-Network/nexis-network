import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type Collaboration = {
  name: string;
  url: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type IntroHeadingProps = {
  title: string;
  subtitle: string;
  collaborations: Collaboration[];
};

const iconShadowClass =
  "";

export const defaultCollaborations = [
  {
    name: "AI SDK Tools",
    url: "https://ai-sdk-tools.dev",
    Icon: AISDKToolsIcon,
  },
  {
    name: "AI SDK v5",
    url: "https://sdk.vercel.ai",
    Icon: AISdkIcon,
  },
];

export const IntroHeading = ({ title, subtitle, collaborations }: IntroHeadingProps) => (
  <div className="flex items-center gap-3">
    <div className={`flex items-center justify-center rounded-lg bg-muted p-1 ${iconShadowClass}`}>
      <div className="flex flex-col items-center gap-2 sm:flex-row">
        {defaultCollaborations.map((collab, index) => {
          const IconComponent = collab.Icon;
          return (
            <IconComponent
              className={`size-9 rounded-md bg-primary/10 p-1 text-foreground ${iconShadowClass}`}
              key={`${collab.name}-${index}`}
            />
          );
        })}
      </div>
    </div>
    <div className="flex flex-col items-start">
      <h1 className="font-regular text-foreground text-xl tracking-tight md:text-2xl">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-muted-foreground text-sm">{subtitle}</p>
        <div className="flex items-center gap-1">
          {collaborations.map((collab, index) => (
            <a
              className={cn(
                "group flex items-center gap-1 rounded-sm bg-muted/50 px-1 py-0.5 text-[10px] text-muted-foreground",
                iconShadowClass
              )}
              href={collab.url}
              key={`${collab.name}-${index}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <collab.Icon className="size-2" />

              <span className="block font-medium">{collab.name}</span>

              <svg
                className="ml-1 size-2 translate-x-[-2px] transform text-muted-foreground opacity-50 transition-all duration-150 ease-out group-hover:translate-x-0 group-hover:scale-110 group-hover:opacity-100"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>External link</title>
                <path
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </a>
          ))}
        </div>
      </div>
    </div>
  </div>
);

function AISDKToolsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" height={24} viewBox="0 0 95 83" width={18} xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>AISDK Tools</title>
      <path d="M22 .5l16 52L31 83H0L22 .5z" fill="url(#a)" />
      <path d="M62 .5H30l13 41.25L56 83h31L62 .5z" fill="#525252" />
      <defs>
        <linearGradient gradientUnits="userSpaceOnUse" id="a" x1={21.5} x2={21.5} y1={0.5} y2={83}>
          <stop stopColor="#737373" />
          <stop offset={1} stopColor="#D9D9D9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AISdkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <div className="text-foreground">
      <svg
        data-testid="geist-icon"
        height="16"
        strokeLinejoin="round"
        style={{ color: "currentcolor" }}
        viewBox="0 0 16 16"
        width="16"
        {...props}
      >
        <title>AISDK</title>
        <path
          d="M2.5 0.5V0H3.5V0.5C3.5 1.60457 4.39543 2.5 5.5 2.5H6V3V3.5H5.5C4.39543 3.5 3.5 4.39543 3.5 5.5V6H3H2.5V5.5C2.5 4.39543 1.60457 3.5 0.5 3.5H0V3V2.5H0.5C1.60457 2.5 2.5 1.60457 2.5 0.5Z"
          fill="currentColor"
        />
        <path
          d="M14.5 4.5V5H13.5V4.5C13.5 3.94772 13.0523 3.5 12.5 3.5H12V3V2.5H12.5C13.0523 2.5 13.5 2.05228 13.5 1.5V1H14H14.5V1.5C14.5 2.05228 14.9477 2.5 15.5 2.5H16V3V3.5H15.5C14.9477 3.5 14.5 3.94772 14.5 4.5Z"
          fill="currentColor"
        />
        <path
          d="M8.40706 4.92939L8.5 4H9.5L9.59294 4.92939C9.82973 7.29734 11.7027 9.17027 14.0706 9.40706L15 9.5V10.5L14.0706 10.5929C11.7027 10.8297 9.82973 12.7027 9.59294 15.0706L9.5 16H8.5L8.40706 15.0706C8.17027 12.7027 6.29734 10.8297 3.92939 10.5929L3 10.5V9.5L3.92939 9.40706C6.29734 9.17027 8.17027 7.29734 8.40706 4.92939Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
