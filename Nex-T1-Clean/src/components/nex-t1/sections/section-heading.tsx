import { cn } from "@/lib/utils"

interface SectionHeadingProps {
  eyebrow?: string
  title: string
  description?: string
  align?: "left" | "center"
  className?: string
  eyebrowClassName?: string
  titleClassName?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  eyebrowClassName,
  titleClassName,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 mb-12 select-none",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className
      )}
    >
      {eyebrow && (
        <span
          className={cn(
            "text-xs font-medium uppercase tracking-widest text-neutral-500",
            eyebrowClassName
          )}
        >
          {eyebrow}
        </span>
      )}
      <h2
        className={cn(
          "text-3xl font-medium leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl lg:leading-[1.1]",
          titleClassName
        )}
      >
        {title}
      </h2>
      {description && (
        <p className="max-w-2xl text-lg text-neutral-400 leading-relaxed font-light">
          {description}
        </p>
      )}
    </div>
  )
}
