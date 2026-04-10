"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { type ReactNode, useMemo, useState } from "react";
import useMeasure from "react-use-measure";

import { cn } from "@/lib/utils";

type Tab = {
  id: number;
  label: string;
  content: ReactNode;
};

interface OgImageSectionProps {
  tabs: Tab[];
  className?: string;
  rounded?: string;
  onChange?: () => void;
}

function DirectionAwareTabs({
  tabs,
  className,
  rounded,
  onChange,
}: OgImageSectionProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [ref, bounds] = useMeasure();

  const content = useMemo(() => {
    const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;
    return activeTabContent || null;
  }, [activeTab, tabs]);

  const handleTabClick = (newTabId: number) => {
    if (newTabId !== activeTab && !isAnimating) {
      const newDirection = newTabId > activeTab ? 1 : -1;
      setDirection(newDirection);
      setActiveTab(newTabId);
      if (onChange) {
        onChange();
      }
    }
  };

  const variants = {
    initial: (direction: number) => ({
      x: 300 * direction,
      opacity: 0,
      filter: "blur(4px)",
    }),
    active: {
      x: 0,
      opacity: 1,
      filter: "blur(0px)",
    },
    exit: (direction: number) => ({
      x: -300 * direction,
      opacity: 0,
      filter: "blur(4px)",
    }),
  };

  return (
    <div className="flex w-full flex-col items-start space-y-8">
      <div className="w-full">
        <div
          className={cn(
            "tab-container flex cursor-pointer space-x-1",
            rounded ? rounded : "rounded-full",
            className,
          )}
        >
          {tabs.map((tab) => (
            <button
              className={cn(
                "tab-trigger relative flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-1",
                rounded ? rounded : "rounded-full",
                activeTab === tab.id ? "tab-active" : "",
              )}
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {activeTab === tab.id && (
                <motion.span
                  className="tab-indicator !inset-0 !top-0 !left-0 !bottom-0"
                  layoutId="bubble"
                  style={rounded ? { borderRadius: 9 } : { borderRadius: 9999 }}
                  transition={{ type: "spring", bounce: 0.19, duration: 0.4 }}
                />
              )}
              {bounds.width < 400 ? (
                <span className="relative z-[1] text-lg">{tab.id}</span>
              ) : (
                <span className="relative z-[1] text-base">{tab.label}</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <MotionConfig transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}>
        <motion.div
          animate={{ height: bounds.height }}
          className="relative mx-auto h-full w-full overflow-hidden"
          initial={false}
        >
          <div className="p-1" ref={ref}>
            <AnimatePresence
              custom={direction}
              mode="popLayout"
              onExitComplete={() => setIsAnimating(false)}
            >
              <motion.div
                animate="active"
                custom={direction}
                exit="exit"
                initial="initial"
                key={activeTab}
                onAnimationComplete={() => setIsAnimating(false)}
                onAnimationStart={() => setIsAnimating(true)}
                variants={variants}
              >
                {content}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </MotionConfig>
    </div>
  );
}
export { DirectionAwareTabs };
