"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MenuGridIcon } from "@/components/icons/menu-grid-icon";

interface AppsDropdownProps {
  className?: string;
}

const APPS_ITEMS = [
  {
    title: "On-chain COPILOT",
    href: "/app",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-6 text-foreground/75 transition-colors group-hover/item:text-foreground">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    description: "Advanced AI trading assistant",
    badge: null,
  },
  {
    title: "AI SCREENER",
    href: "/screener",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-6 text-foreground/75 transition-colors group-hover/item:text-foreground">
        <path d="M21 21H3V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M21 9L13 17L9 13L3 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    description: "Real-time market analysis",
    badge: null,
  },
  {
    title: "Create Agent",
    href: "#", // Placeholder
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-6 text-foreground/75 transition-colors group-hover/item:text-foreground">
        <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    description: "Launch your own AI agent",
    badge: "New",
  },
  {
    title: "AI Leaderboard",
    href: "#", // Placeholder - maybe /leaderboard
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-6 text-foreground/75 transition-colors group-hover/item:text-foreground">
        <path d="M18 20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 20V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 20V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    description: "Top performing agents",
    badge: null,
  },
  {
    title: "Nex Trader",
    href: "#",
    icon: null, // Placeholder or specific icon
    description: "Browser Extension",
    badge: "Coming Soon",
    disabled: true,
  },
  {
    title: "Nex-T1 Mobile App",
    href: "#",
    icon: null,
    description: "iOS & Android",
    badge: "Coming Soon",
    disabled: true,
  },
];

export function AppsDropdownMenu({ className }: Omit<AppsDropdownProps, "isScrolled">) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "group flex h-[30px] items-center gap-2 rounded-xl border border-border/10 bg-card/60 px-3 text-[10px] font-medium text-foreground/75 transition-all duration-300 backdrop-blur-xl drop-shadow-sm hover:bg-card/80 hover:text-foreground",
          isOpen && "bg-card/80 text-foreground"
        )}
      >
        <div className="flex size-[15px] items-center justify-center">
          <MenuGridIcon className="size-full border-none p-0 text-foreground/75 transition-colors group-hover:text-foreground" />
        </div>
        <span className="hidden md:block">Apps</span>
      </button>

      {/* Dropdown Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "absolute right-0 top-full mt-3 w-[360px] md:w-[450px]",
              "flex flex-col gap-0 overflow-hidden rounded-xl border border-border/10 bg-card/60 backdrop-blur-xl drop-shadow-sm",
            )}
          >
            <div className="grid grid-cols-1 gap-2 p-2 md:grid-cols-2">
              {APPS_ITEMS.map((item, index) => (
                <Link
                  key={index}
                  href={item.disabled ? "#" : item.href}
                  onClick={(event) => {
                    if (item.disabled) {
                      event.preventDefault();
                      return;
                    }
                    setIsOpen(false);
                  }}
                  className={cn(
                    "group/item relative flex flex-col gap-4 rounded-xl border border-border/10 bg-muted/20 px-4 py-4 text-foreground/75 backdrop-blur-xl transition-all duration-200 hover:bg-muted/30 hover:text-foreground",
                    item.disabled && "cursor-not-allowed opacity-60 hover:bg-muted/20",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full bg-muted/30 text-foreground/75 transition-colors group-hover/item:bg-muted/50 group-hover/item:text-foreground",
                          item.disabled && "bg-muted/20 text-foreground/40",
                        )}
                      >
                        {item.icon || <div className="size-4 rounded-sm bg-current opacity-50" />}
                      </div>
                      <span className="font-mono text-[13px] uppercase text-foreground/75 group-hover/item:text-foreground">
                        {item.title}
                      </span>
                    </div>

                    {!item.disabled && !item.badge ? (
                      <div className="text-foreground/30 transition-all group-hover/item:text-foreground/75">
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1.38529 0.764055L4.7783 0.797736C5.72494 0.783173 6.31703 0.622697 6.91887 0.263732C7.2426 0.0706351 7.68075 0.0937786 7.97156 0.381825C8.30459 0.711694 8.34788 1.24098 8.00183 1.58373C7.6558 1.92649 0.00520208 9.50447 0.00520208 9.50447C-0.00173385 9.5113 -0.00173386 9.52251 0.00520105 9.52934L0.553599 10.0725C0.560534 10.0794 0.571779 10.0794 0.578714 10.0725L8.57535 2.1518C9.27916 1.45467 10.4088 2.40899 9.90416 3.22694C9.52645 3.83921 9.35315 4.44607 9.35362 5.45796L9.40105 8.70559C9.40119 8.7151 9.40893 8.72278 9.41854 8.72292L10.1555 8.73348C10.1656 8.73362 10.1737 8.72549 10.1735 8.71554L10.1909 0.0172419C10.1907 0.0077878 10.183 0.000173117 10.1735 2.92861e-06H1.37514C1.36512 -0.000176431 1.35692 0.00790601 1.35707 0.0178452L1.36772 0.74671C1.36786 0.756259 1.37565 0.763953 1.38529 0.764055Z" fill="#636363" />
                        </svg>
                      </div>
                    ) : null}
                  </div>

                  {item.description ? <p className="text-[11px] text-muted-foreground/70 group-hover/item:text-foreground/75">{item.description}</p> : null}

                  {item.badge ? (
                    <div className="absolute right-4 top-4">
                      <span className="rounded-full bg-muted/30 px-2 py-0.5 text-[9px] font-medium text-foreground/75">
                        {item.badge}
                      </span>
                    </div>
                  ) : null}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
