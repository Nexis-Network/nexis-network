import type { ReactElement, ReactNode } from "react";

type StairsPageTransitionProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  overlayClassName?: string;
};

const combineClassNames = (
  ...classNames: Array<string | undefined | null | false>
) => classNames.filter(Boolean).join(" ");

export function StairsPageTransition({
  children,
  className,
  contentClassName,
  overlayClassName,
}: StairsPageTransitionProps): ReactElement {
  const outerClassName = combineClassNames("relative", className);
  const contentWrapperClassName = combineClassNames(
    "min-h-full w-full",
    contentClassName,
  );
  const hiddenOverlayClassName = combineClassNames("hidden", overlayClassName);

  return (
    <div className={outerClassName}>
      <div className={contentWrapperClassName}>{children}</div>
      <div className={hiddenOverlayClassName} aria-hidden />
    </div>
  );
}
