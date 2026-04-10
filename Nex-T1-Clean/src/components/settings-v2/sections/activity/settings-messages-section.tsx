"use client";

import { useSearchParams } from "next/navigation";

import MemoryContent from "@/components/settings/ai/memory-content";
import { SocialMessagesPage } from "@/components/settings/social/social-messages-page";

export function SettingsMessagesSection() {
  const searchParams = useSearchParams();
  const activeView = searchParams.get("view");

  if (activeView === "memory") {
    return <MemoryContent />;
  }

  return <SocialMessagesPage />;
}
