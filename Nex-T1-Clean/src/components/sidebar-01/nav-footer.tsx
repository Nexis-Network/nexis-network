"use client";

import { UserProfileMenu } from "@/components/app-header/user-profile-menu";
import { SidebarFooter } from "@/components/ui/sidebar";

export function NavFooter() {
  return (
    <SidebarFooter className="border-t border-white/6 px-4 py-4">
      <div className="flex w-full items-center rounded-lg border border-white/6 p-1.5">
        <UserProfileMenu showTriggerDuringLoad />
      </div>
    </SidebarFooter>
  );
}
