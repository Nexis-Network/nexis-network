import type { ReactElement, ReactNode } from "react";

import { StairsPageTransition } from "./stairs-page-transition";

type TransitionShellProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  overlayClassName?: string;
};

export function StairsPageTransitionShell({
  children,
  className,
  contentClassName,
  overlayClassName,
}: TransitionShellProps): ReactElement {
  return (
    <StairsPageTransition
      className={className}
      contentClassName={contentClassName}
      overlayClassName={overlayClassName}
    >
      {children}
    </StairsPageTransition>
  );
}
