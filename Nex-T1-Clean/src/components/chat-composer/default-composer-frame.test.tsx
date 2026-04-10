import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DefaultComposerFrame } from "@/components/chat-composer/default-composer-frame";

vi.mock("@/components/ui/border-glow", () => ({
  BorderGlow: ({
    children,
    className,
    contentClassName,
  }: {
    children?: ReactNode;
    className?: string;
    contentClassName?: string;
  }) => (
    <div className={className} data-border-glow="true">
      <div className={contentClassName}>{children}</div>
    </div>
  ),
}));

describe("DefaultComposerFrame", () => {
  it("wraps the Nex Instant app composer in the border glow shell", () => {
    render(
      <DefaultComposerFrame
        composerCardMinHeightClass="min-h-10"
        composerCardRadiusClass="rounded-[20px]"
        composerWidthClass="w-full"
        useNexInstantSurface
      >
        <div>composer content</div>
      </DefaultComposerFrame>,
    );

    expect(screen.getByText("composer content").closest("[data-border-glow='true']")).not.toBeNull();
  });

  it("keeps the standard frame for non-Nex Instant surfaces", () => {
    render(
      <DefaultComposerFrame
        composerCardMinHeightClass="min-h-10"
        composerCardRadiusClass="rounded-[20px]"
        composerWidthClass="w-full"
        useNexInstantSurface={false}
      >
        <div>composer content</div>
      </DefaultComposerFrame>,
    );

    expect(screen.getByText("composer content").closest("[data-border-glow='true']")).toBeNull();
  });
});
