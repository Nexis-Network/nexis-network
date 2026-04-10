"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";

import { HEADER_MAIN_NAV_MOBILE_ITEMS } from "./header-main-nav-data";

type MobileHeaderDropdownProps = {
  onClose: () => void;
};

const mobileMenuItemVariants = {
  hidden: { opacity: 0, y: "-10%" },
  visible: { opacity: 1, y: 0 },
};

const mobileMenuListVariants = {
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export function MobileHeaderDropdown({
  onClose,
}: MobileHeaderDropdownProps) {
  return (
    <motion.div
      data-testid="mobile-header-dropdown"
      initial={{ height: "0px" }}
      animate={{ height: "calc(100dvh - var(--auth-header-height))" }}
      exit={{ height: "0px" }}
      transition={{ ease: [0.645, 0.045, 0.355, 1], duration: 0.5 }}
      className="fixed inset-x-0 top-[var(--auth-header-height)] z-[100] overflow-hidden rounded-none border-0 font-sans shadow-none md:hidden"
      style={{
        backgroundColor:
          "var(--auth-nav-panel-bg, var(--auth-elevated-bg, var(--popover)))",
        color:
          "var(--auth-nav-panel-fg, var(--auth-text-primary, var(--foreground)))",
      }}
    >
      <div className="h-full w-screen bg-[var(--auth-nav-panel-bg,var(--auth-elevated-bg,var(--popover)))] pt-15 backdrop-blur-2xl">
        <motion.ul
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={mobileMenuListVariants}
          className="flex flex-col gap-5 text-3xl font-[600] tracking-tight"
        >
          {HEADER_MAIN_NAV_MOBILE_ITEMS.map((item) => (
            <motion.li
              key={item.id}
              variants={mobileMenuItemVariants}
            >
              <Link
                href={item.href}
                onClick={onClose}
                className="group relative flex cursor-pointer items-center justify-between px-8"
              >
                {item.title}
                <ChevronRight className="size-6 opacity-0 transition-all duration-300 group-hover:translate-x-2 group-hover:opacity-100" />
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </motion.div>
  );
}
