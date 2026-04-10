import { cn } from "@/lib/utils"

interface ContentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  // No specific props needed yet, mostly styling wrapper
}

export function ContentCard({ className, children, ...props }: ContentCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-neutral-800/60 bg-neutral-900/20 p-6 backbackdrop-blur-lg transition-all duration-300 hover:border-neutral-700/80 hover:bg-neutral-900/40",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
