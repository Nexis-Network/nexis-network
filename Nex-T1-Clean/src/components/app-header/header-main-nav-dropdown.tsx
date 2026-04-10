"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  headerDropdownOverlayStyle,
  headerDropdownPanelStyle,
  headerDropdownTopStripStyle,
} from "@/components/navigation/header-dropdown-surface";

import {
  buildHeaderMainNavMenuSections,
  type HeaderMainNavMenuSection,
  type HeaderMainNavItem,
} from "./header-main-nav-data";

type HeaderMainNavDropdownProps = {
  activeItem: HeaderMainNavItem | null;
  onPointerEnterTray: () => void;
  onCloseImmediately: () => void;
  onCloseSoon: () => void;
  translateLabel: (label: string) => string;
};

const menuItemVariants = {
  hidden: { opacity: 0, y: "-20%" },
  visible: { opacity: 1, y: 0 },
};

const menuContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

type MenuSectionProps = {
  section: HeaderMainNavMenuSection;
  onCloseImmediately: () => void;
  translateLabel: (label: string) => string;
};

function MenuSection({
  section,
  onCloseImmediately,
  translateLabel,
}: MenuSectionProps) {
  return (
    <motion.ul
      className="space-y-2 font-sans"
      style={{ color: "var(--auth-nav-panel-fg, var(--auth-text-primary, var(--foreground)))" }}
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={menuContainerVariants}
    >
      <motion.li
        variants={menuItemVariants}
        transition={{ duration: 0.3 }}
        className="my-4 text-xs opacity-50"
      >
        {translateLabel(section.title)}
      </motion.li>

      {section.items.map((submenuItem) => {
        const isExternal = submenuItem.href.startsWith("http");

        return (
          <motion.li
            key={submenuItem.id}
            variants={menuItemVariants}
            transition={{ duration: 0.3 }}
            className={cn(
              "cursor-pointer tracking-tight",
              section.isLarge
                ? "group relative flex items-center text-2xl font-[600]"
                : "text-sm font-[500]",
            )}
          >
            <Link
              href={submenuItem.href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noreferrer noopener" : undefined}
              onClick={onCloseImmediately}
              className="block"
            >
              {translateLabel(submenuItem.title)}
            </Link>

            {section.isLarge ? (
              <ChevronRight className="absolute -right-10 size-6 opacity-0 transition-all duration-300 group-hover:translate-x-2 group-hover:opacity-100" />
            ) : null}
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

export function HeaderMainNavDropdown({
  activeItem,
  onPointerEnterTray,
  onCloseImmediately,
  onCloseSoon,
  translateLabel,
}: HeaderMainNavDropdownProps) {
  const sections = activeItem
    ? buildHeaderMainNavMenuSections(activeItem)
    : [];

  return (
    <>
      <motion.div
        data-testid="header-nav-menu-overlay"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: activeItem ? 1 : 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="pointer-events-none fixed left-0 top-0 z-40 h-screen w-screen"
        style={headerDropdownOverlayStyle}
      />

      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: activeItem ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="pointer-events-none fixed inset-x-0 top-0 z-[54] h-[var(--auth-header-height)] bg-transparent"
        style={headerDropdownTopStripStyle}
      />

      <motion.div
        data-testid="header-nav-dropdown-panel"
        initial={{ height: "0px" }}
        animate={{ height: activeItem ? "auto" : "0" }}
        transition={{ ease: [0.645, 0.045, 0.355, 1], duration: 0.5 }}
        onMouseEnter={onPointerEnterTray}
        onMouseLeave={onCloseSoon}
        className={cn(
          "fixed inset-x-0 top-[var(--auth-header-height)] z-[55] flex w-screen justify-center overflow-hidden rounded-none font-sans",
          activeItem ? undefined : "pointer-events-none",
        )}
        style={{
          ...headerDropdownPanelStyle,
          color: "var(--auth-nav-panel-fg, var(--auth-text-primary, var(--foreground)))",
        }}
      >
        <AnimatePresence>
          {activeItem ? (
            <motion.div
              data-testid="header-nav-dropdown-content"
              exit={{
                opacity: 0,
                transition: { duration: 0.4, delay: 0.5 },
              }}
              className="flex w-full max-w-[1024px] gap-32 pb-20 pt-10"
            >
              {sections.map((section) => (
                <MenuSection
                  key={`${activeItem.id}-${section.title}`}
                  section={section}
                  onCloseImmediately={onCloseImmediately}
                  translateLabel={translateLabel}
                />
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
