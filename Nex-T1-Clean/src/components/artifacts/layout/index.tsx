import { cn } from "@/lib/utils";
import { HTMLAttributes, ReactNode, forwardRef } from "react";
import { X } from "lucide-react";

export interface ArtifactContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const ArtifactContainer = forwardRef<
  HTMLDivElement,
  ArtifactContainerProps
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden border bg-[var(--artifact-surface)] transition-all duration-300",
        className,
      )}
      style={{
        borderColor: "var(--artifact-border)",
        borderRadius: "var(--artifact-radius-shell)",
        boxShadow: "var(--artifact-shadow)",
      }}
      {...props}
    >
      {children}
    </div>
  );
});
ArtifactContainer.displayName = "ArtifactContainer";

export interface ArtifactHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
}

export const ArtifactHeader = forwardRef<HTMLDivElement, ArtifactHeaderProps>(
  ({ className, title, icon, actions, onClose, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between border-b px-3 py-2",
          className,
        )}
        style={{
          borderColor: "var(--artifact-border)",
          backgroundColor: "var(--artifact-panel)",
        }}
        {...props}
      >
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--artifact-muted)]">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          {title && <span>{title}</span>}
          {children}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-[var(--artifact-radius-control)] p-1 text-[var(--artifact-muted)] transition-colors hover:bg-[var(--artifact-control-hover)] hover:text-[var(--artifact-foreground)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  },
);
ArtifactHeader.displayName = "ArtifactHeader";

export interface ArtifactBodyProps extends HTMLAttributes<HTMLDivElement> {}

export const ArtifactBody = forwardRef<HTMLDivElement, ArtifactBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex-1 overflow-auto bg-[var(--artifact-surface)] p-4 custom-scrollbar",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
ArtifactBody.displayName = "ArtifactBody";
