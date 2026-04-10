import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import React, { type ReactNode, type SVGProps } from "react";

import { cn } from "@/lib/utils";

export function BlockPreviewIntro({
  title = "Full Stack",
  description = "Blocks",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex w-full flex-col justify-start md:px-2">
      {/* Heading Stack */}
      <div className="w-full md:flex md:flex-col">
        <div className="flex items-center gap-2">
          <GradientHeading
            className="-ml-0 text-left tracking-wide"
            size="xxs"
            weight="semi"
          >
            {title}
          </GradientHeading>
          <div className="flex items-center gap-2">
            <OpenAIIcon className="size-6" />
          </div>
        </div>

        <div className="max-w-xs pt-4 lg:space-y-2 lg:pt-0">
          <GradientHeading
            className="text-left leading-[1.1] tracking-tight"
            size="xxs"
            weight="light"
          >
            {description}
          </GradientHeading>
        </div>
      </div>
    </div>
  );
}

export function SubBlockDescription({
  title = "Full Stack",
  description = "Blocks",
  link = "",
}: {
  title?: string;
  description?: string;

  link?: string;
}) {
  return (
    <div className="flex w-full flex-col justify-start md:px-2">
      {/* Heading Stack */}
      <div className="w-full md:flex md:flex-col">
        <div className="flex items-center gap-2">
          <GradientHeading
            className="-ml-0 text-left tracking-wide"
            size="xxs"
            weight="semi"
          >
            {title}
          </GradientHeading>
        </div>

        <div className="pt-4 lg:space-y-2 lg:pt-0">
          <p className="text-left leading-[1.1] tracking-tight">
            {description}
          </p>
        </div>
        {link && (
          <div className="pt-4 lg:pt-0">
            <a className="text-muted-foreground text-sm" href={link}>
              View Documentation
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

const headingVariants = cva(
  "bg-clip-text pb-3 text-transparent tracking-tight",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-t from-neutral-700 to-neutral-800 dark:from-stone-200 dark:to-neutral-200",
        helper:
          "bg-gradient-to-t from-stone-500 to-neutral-600 dark:from-stone-400 dark:to-neutral-600",
        accent:
          "bg-gradient-to-t from-neutral-600 to-neutral-700 dark:from-stone-500 dark:to-neutral-700",
        // pink: "bg-gradient-to-t from-accent to-accent/90 dark:from-pink-300 dark:to-pink-400",
        pink: "bg-gradient-to-t from-accent to-accent/90 dark:from-[#EC06FF] dark:to-pink-400",
        blue: "bg-gradient-to-t from-paint-blue-200 to-neutral-100 dark:from-blue-200 dark:to-cyan-200",
        // blue: "bg-gradient-to-t from-paint-blue-200 to-neutral-100 dark:from-stone-200 dark:to-neutral-200",
        light: "bg-gradient-to-t from-neutral-200 to-neutral-300",
        secondary:
          "bg-gradient-to-t from-primary-foreground to-muted-foreground",
      },
      size: {
        default: "text-2xl sm:text-3xl lg:text-4xl",
        xxs: "text-base sm:text-lg lg:text-lg",
        xs: "text-lg sm:text-xl lg:text-2xl",
        sm: "text-xl sm:text-2xl lg:text-3xl",
        md: "text-2xl sm:text-3xl lg:text-4xl",
        lg: "text-3xl sm:text-4xl lg:text-5xl",
        xl: "text-4xl sm:text-5xl lg:text-6xl",
        xxl: "text-5xl sm:text-6xl lg:text-[6rem]",
        xxxl: "text-[4.5rem] leading-5 sm:text-6xl lg:text-[8rem] lg:leading-8",
      },
      weight: {
        default: "font-bold",
        thin: "font-thin",
        light: "font-light",
        base: "font-base",
        semi: "font-regular",
        bold: "font-bold",
        black: "font-black",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      weight: "default",
    },
  }
);

export interface HeadingProps extends VariantProps<typeof headingVariants> {
  asChild?: boolean;
  children: ReactNode;
  className?: string;
}

export const GradientHeading = React.forwardRef<
  HTMLHeadingElement,
  HeadingProps
>(({ asChild, variant, weight, size, className, children, ...props }, ref) => {
  const Comp = asChild ? Slot : "h3"; // default to 'h3' if not a child
  return (
    <Comp ref={ref} {...props} className={className}>
      <span className={cn(headingVariants({ variant, size, weight }))}>
        {children}
      </span>
    </Comp>
  );
});

GradientHeading.displayName = "GradientHeading";

// Manually define the variant types
export type Variant = "default" | "pink" | "light" | "secondary" | "helper";
export type Size =
  | "default"
  | "xxs"
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "xxl"
  | "xxxl";
export type Weight = "default" | "thin" | "base" | "semi" | "bold" | "black";

const OpenAIIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    height="1em"
    preserveAspectRatio="xMidYMid"
    viewBox="0 0 256 260"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z" />
  </svg>
);
