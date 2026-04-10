"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";
import { appShellClasses } from "@/components/app/app-shell-primitives";
import { SidebarToggleIcon } from "@/components/icons/sidebar-toggle-icon";
import { MobileHeaderDropdown } from "./mobile-header-dropdown";

export function MobileNavTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={appShellClasses.mobileNavTrigger}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <Plus className="block size-6 -rotate-45 stroke-[1]" />
        ) : (
          <SidebarToggleIcon className="size-6" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <MobileHeaderDropdown onClose={() => setIsOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
