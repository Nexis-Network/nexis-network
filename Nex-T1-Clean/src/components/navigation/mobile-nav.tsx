"use client";

import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { ArrowRight, Code2, Menu as MenuIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useMeasure from "react-use-measure";

import { HeaderTheme } from "@/components/landing/header-types";
import { developerLinks } from "@/components/landing/navigation-config";
import { primaryNavLinks } from "@/components/landing/landing-primary-nav-links";
import { loginMobileButtonClass } from "@/components/navigation/login-button-classes";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  onNavigate: () => void;
  theme: HeaderTheme;
}

const transition = {
  type: "spring" as const,
  bounce: 0,
  duration: 0.4,
};

const variants = {
  initial: (direction: number) => {
    return { x: `${110 * direction}%`, opacity: 0 };
  },
  active: { x: "0%", opacity: 1 },
  exit: (direction: number) => {
    return { x: `${-110 * direction}%`, opacity: 0 };
  },
};

export const MobileNav = ({ onNavigate, theme }: MobileNavProps) => {
  // selectedTab: 0 -> Menu, 1 -> Developers
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [direction, setDirection] = useState<number>(0);
  const [ref, bounds] = useMeasure();

  const handleTabSelect = (index: number) => {
    if (selectedTab === index) return;
    const newDirection = index > selectedTab ? 1 : -1;
    setDirection(newDirection);
    setSelectedTab(index);
  };

  const currentContent = selectedTab === 0 ? (
    <div className="flex flex-col gap-2 p-2">
       {primaryNavLinks.map((link) => {
          const isCta = "variant" in link && link.variant === "cta";
          return isCta ? (
             <Link
                key={link.label}
                href={link.href}
                onClick={onNavigate}
                className={cn(loginMobileButtonClass, "w-full justify-center mt-2")}
              >
                {link.label}
              </Link>
          ) : (
             <Link
                key={link.label}
                href={link.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors",
                  theme.mobileNavigateLink
                )}
              >
                <span className={theme.mobileLinkText}>{link.label}</span>
                <ArrowRight className="size-4 opacity-50" />
              </Link>
          );
       })}
    </div>
  ) : (
    <div className="flex flex-col gap-2 p-2">
      {developerLinks.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          onClick={onNavigate}
          target={item.href.startsWith("http") ? "_blank" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors",
             theme.mobileDeveloperLink
          )}
        >
          <item.icon className={cn("size-4", theme.mobileDeveloperIcon)} />
          <span className={theme.mobileLinkText}>{item.label}</span>
        </Link>
      ))}
    </div>
  );

  return (
    <div className={cn("mt-4 flex flex-col overflow-hidden rounded-3xl border shadow-xl backdrop-blur-xl", theme.mobileNavContainer)}>
      <MotionConfig transition={transition}>
      <div className="bg-background/40 p-1">
        <div className="flex rounded-2xl bg-muted/20 p-1 relative">
             <div 
               className="absolute inset-y-1 bg-background rounded-xl shadow-sm transition-all duration-300 ease-spring"
               style={{
                 left: selectedTab === 0 ? "4px" : "50%",
                 width: "calc(50% - 4px)"
               }}
             />
             <button 
               onClick={() => handleTabSelect(0)}
               className={cn(
                 "relative z-10 flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors",
                 selectedTab === 0 ? "text-foreground" : "text-muted-foreground"
               )}
             >
               <MenuIcon className="size-4" />
               Menu
             </button>
             <button 
               onClick={() => handleTabSelect(1)}
               className={cn(
                 "relative z-10 flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors",
                 selectedTab === 1 ? "text-foreground" : "text-muted-foreground"
               )}
             >
               <Code2 className="size-4" />
               Developers
             </button>
        </div>
      </div>
      
      <motion.div
        animate={{ height: bounds.height || "auto" }}
        className="overflow-hidden"
      >
        <div ref={ref}>
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
             <motion.div
                key={selectedTab}
                custom={direction}
                variants={variants}
                initial="initial"
                animate="active"
                exit="exit"
                className="w-full"
             >
               {currentContent}
             </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
      </MotionConfig>
    </div>
  );
};
