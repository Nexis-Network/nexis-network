"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";

type ProfileMenuTriggerButtonProps = {
  displayName: string;
  secondaryLabel: string | null;
  connectedWalletIcon?: string | null;
  walletAddress?: string | null;
} & Omit<ComponentPropsWithoutRef<"button">, "children">;

export const ProfileMenuTriggerButton = forwardRef<HTMLButtonElement, ProfileMenuTriggerButtonProps>(
  ({ displayName, secondaryLabel, connectedWalletIcon: _connectedWalletIcon, walletAddress, className, type = "button", ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        data-testid="header-profile-trigger"
        className={cn(
          "inline-flex flex-row items-center rounded-full border bg-[var(--auth-user-chip-bg)] border-[var(--auth-user-chip-border)]",
          "h-[29.38px] w-[135.98px] px-[3.358px] pr-[10.074px] py-[3.358px]", // Exact padding and size
          "transition hover:bg-[var(--auth-user-chip-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-focus)]",
          className,
        )}
        {...rest}
      >
        <span className="sr-only">
          {secondaryLabel
            ? `Open user menu for ${displayName} (${secondaryLabel})`
            : `Open user menu for ${displayName}`}
        </span>
        
        {/* Blockie / Avatar Container */}
        <div className="mr-[6.716px] flex h-[20.15px] min-h-[20.15px] w-[20.15px] min-w-[20.15px] items-center justify-center overflow-hidden rounded-full">
          <UserAvatar
            walletAddress={walletAddress}
            className="h-[20.15px] w-[20.15px]"
            fallback={displayName.charAt(0)}
          />
        </div>

        {/* Username Text */}
        <span className="w-[94px] truncate font-[family-name:var(--font-funnel-display)] text-[13px] font-medium leading-[21px] tracking-[0.336px] text-[var(--auth-user-chip-fg)]">
          {displayName}
        </span>
      </button>
    );
  },
);

ProfileMenuTriggerButton.displayName = "ProfileMenuTriggerButton";
