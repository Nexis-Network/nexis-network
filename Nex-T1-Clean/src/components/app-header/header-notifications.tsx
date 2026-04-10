"use client";

import { Suspense, useMemo } from "react";

import { NotificationsPopover } from "@/components/navigation/nav-notifications";
import { useNotifications } from "@/hooks/user/use-notifications";

type HeaderNotificationsProps = {
  triggerClassName?: string;
  iconClassName?: string;
};

function NotificationsInnerBase({ triggerClassName, iconClassName }: HeaderNotificationsProps = {}) {
  const {
    data: notifications,
    isLoading,
    error,
    refetch,
  } = useNotifications();

  const errorMessage = useMemo(() => {
    if (!error) {
      return null;
    }
    return error instanceof Error ? error.message : "Unable to load notifications.";
  }, [error]);

  return (
    <NotificationsPopover
      notifications={notifications}
      isLoading={isLoading}
      error={errorMessage}
      triggerClassName={triggerClassName}
      iconClassName={iconClassName}
      onRefresh={() => {
        void refetch();
      }}
    />
  );
}

export function HeaderNotifications({ triggerClassName, iconClassName }: HeaderNotificationsProps = {}) {
  return (
    <Suspense
      fallback={
        <div className="size-9 animate-pulse rounded-full border border-[var(--auth-menu-subtle-border)] bg-[var(--auth-menu-subtle-bg)]" />
      }
    >
      <NotificationsInnerBase triggerClassName={triggerClassName} iconClassName={iconClassName} />
    </Suspense>
  );
}

export default HeaderNotifications;
