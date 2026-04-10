"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type LandingHeaderMenuItem = {
  label: string;
  href: string;
  icon?: ReactNode;
};

type LandingHeaderMenuColumn = {
  title: string;
  items: LandingHeaderMenuItem[];
};

export type LandingHeaderDropdownContent = {
  firstUl: LandingHeaderMenuColumn;
  secondUl?: LandingHeaderMenuColumn;
  thirdUl?: LandingHeaderMenuColumn;
};

type LandingHeaderV2DropdownProps = {
  activeKey: string | null;
  currentContent: LandingHeaderDropdownContent | null;
  loginHref: string;
  onClose: () => void;
  onOpen: (itemId: string) => void;
  showDropdown: boolean;
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

function MenuSection({
  title,
  items,
  isLarge = false,
  translateLabel,
}: {
  title: string;
  items: LandingHeaderMenuItem[];
  isLarge?: boolean;
  translateLabel: (label: string) => string;
}) {
  return (
    <motion.ul
      className="space-y-3 font-sans"
      style={{ color: "var(--menubar-dropdown-item-fg)" }}
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={menuContainerVariants}
    >
      <motion.li
        variants={menuItemVariants}
        transition={{ duration: 0.3 }}
        className="mb-4 text-[11px] font-semibold uppercase tracking-wider opacity-50"
      >
        {translateLabel(title)}
      </motion.li>

      {items.map((item) => (
        <motion.li
          key={item.label}
          variants={menuItemVariants}
          transition={{ duration: 0.3 }}
          className={cn(
            "tracking-tight transition-colors",
            isLarge
              ? "group relative flex items-center text-xl font-medium"
              : "text-[13px] font-medium opacity-75 hover:opacity-100",
          )}
        >
          <Link href={item.href} className="menubar-dropdown-item !p-0 !text-inherit">
            {item.icon ? (
              <span className="menubar-dropdown-item-icon flex items-center justify-center opacity-70 transition-opacity group-hover:opacity-100">
                {item.icon}
              </span>
            ) : null}

            <span>{translateLabel(item.label)}</span>

            {isLarge ? (
              <ChevronRight className="absolute -right-6 size-4 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" style={{ color: "var(--menubar-dropdown-item-icon-fg)" }} />
            ) : null}
          </Link>
        </motion.li>
      ))}
    </motion.ul>
  );
}

export function LandingHeaderV2Dropdown({
  activeKey,
  currentContent,
  loginHref,
  onClose,
  onOpen,
  showDropdown,
  translateLabel,
}: LandingHeaderV2DropdownProps) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showDropdown ? 1 : 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className={cn(
          "pointer-events-none fixed inset-0 top-[60px] z-40 h-screen w-screen backdrop-blur-sm",
          showDropdown ? undefined : "opacity-0",
        )}
        style={{
          backgroundColor: "color-mix(in oklab, var(--menubar-solid-bg) 22%, transparent)",
        }}
      />

      <motion.div
        initial={{ height: "0px" }}
        animate={{ height: showDropdown ? "auto" : "0px" }}
        transition={{ ease: [0.645, 0.045, 0.355, 1], duration: 0.5 }}
        className={cn(
          "menubar-dropdown absolute left-0 top-[60px] z-[55] w-full overflow-hidden !rounded-none !border-x-0",
          showDropdown ? undefined : "pointer-events-none",
        )}
        onMouseEnter={() => {
          if (activeKey) {
            onOpen(activeKey);
          }
        }}
        onMouseLeave={onClose}
      >
        <div className="mx-auto w-full px-16">
          <AnimatePresence mode="wait">
            {currentContent ? (
              <motion.div
                key={activeKey}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid w-full grid-cols-4 gap-12 py-12"
              >
                <div className="col-span-1">
                  <MenuSection
                    title={currentContent.firstUl.title}
                    items={currentContent.firstUl.items}
                    isLarge
                    translateLabel={translateLabel}
                  />
                </div>

                <div className="col-span-1 border-l border-[var(--menubar-dropdown-separator)] pl-12">
                  {currentContent.secondUl ? (
                    <MenuSection
                      title={currentContent.secondUl.title}
                      items={currentContent.secondUl.items}
                      translateLabel={translateLabel}
                    />
                  ) : null}
                </div>

                <div className="col-span-1 border-l border-[var(--menubar-dropdown-separator)] pl-12">
                  {currentContent.thirdUl ? (
                    <MenuSection
                      title={currentContent.thirdUl.title}
                      items={currentContent.thirdUl.items}
                      translateLabel={translateLabel}
                    />
                  ) : (
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--menubar-dropdown-item-fg)", opacity: 0.5 }}>
                        Featured
                      </span>
                      <div className="w-[90%] overflow-hidden rounded-xl border border-white/8 bg-white/5 transition-transform hover:scale-[1.02]">
                        <Link href={loginHref} className="block h-full w-full" onClick={onClose}>
                          <Image
                            src="/assets/header-feature-card.jpg"
                            alt="Featured Protocol"
                            width={300}
                            height={150}
                            className="h-auto w-full object-cover"
                          />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                <div className="col-span-1" />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
