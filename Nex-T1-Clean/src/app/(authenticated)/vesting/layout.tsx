"use client";

import { useEffect, type ReactNode } from "react";
import { SettingsNavigation } from "@/components/settings/settings-navigation";
import { cn } from "@/lib/utils";

const SETTINGS_BODY_CLASS = "settings-surface";

export default function VestingLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.body.classList.add(SETTINGS_BODY_CLASS);
    return () => {
      document.body.classList.remove(SETTINGS_BODY_CLASS);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#0f0f10] text-white">
      <SettingsNavigation />
      <main
        className={cn(
          "mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-32 sm:px-6 lg:px-8",
        )}
      >
        {children}
      </main>
    </div>
  );
}
