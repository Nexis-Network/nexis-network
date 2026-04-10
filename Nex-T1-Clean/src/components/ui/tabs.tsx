"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Transition } from "motion/react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { useTabs, type Tab } from "@/hooks/ui/use-tabs";
import { cn } from "@/lib/utils";

// Shadcn-compatible primitives (to avoid breaking existing imports)
const Tabs = TabsPrimitive.Root;
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      data-slot="tabs-list"
      className={cn(
      "inline-flex h-10 items-center justify-center gap-1 border-b border-border bg-transparent p-0",
        className,
      )}
      {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
      data-slot="tabs-trigger"
      className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-none px-4 py-2 text-sm font-medium ring-offset-background transition-colors disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground",
        className,
      )}
      {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    data-slot="tabs-content"
    className={cn("mt-4", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };

/* ─── Segmented Tabs (pill-style with sliding indicator) ─── */

interface SegmentedTabOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedTabsProps<T extends string = string> {
  options: SegmentedTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** Size variant — "sm" for compact contexts, "default" for standard */
  size?: "sm" | "default";
}

function SegmentedTabs<T extends string = string>({
  options,
  value,
  onChange,
  className,
  size = "default",
}: SegmentedTabsProps<T>) {
  const activeIndex = options.findIndex((o) => o.value === value);
  const count = options.length;

  return (
    <div
      className={cn(
        "tab-container",
        size === "sm" && "rounded-lg p-[2px]",
        className,
      )}
    >
      <div className="relative flex">
        {/* Sliding indicator */}
        <motion.div
          className="tab-indicator"
          initial={false}
          animate={{
            x: `${activeIndex * 100}%`,
          }}
          transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
          style={{ width: `${100 / count}%` }}
        />

        {/* Tab buttons */}
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "tab-trigger",
              size === "sm" && "h-7 text-xs",
              option.value === value ? "tab-active" : "",
            )}
          >
            {option.icon && (
              <span className="mr-1.5 flex items-center">{option.icon}</span>
            )}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { SegmentedTabs };
export type { SegmentedTabOption, SegmentedTabsProps };

// Animated tabs used by Settings overview (wallets/agents/tasks)
interface AnimatedTabsProps {
  tabs: Tab[];
  // Provide pre-rendered content keyed by tab value.
  // This avoids passing functions across the Server → Client boundary.
  content?: Partial<Record<string, React.ReactNode>>;
}

const transition: Transition = {
  type: "tween",
  ease: "easeOut",
  duration: 0.15,
};

const getHoverAnimationProps = (hoveredRect: DOMRect, navRect: DOMRect) => ({
  x: hoveredRect.left - navRect.left - 10,
  y: hoveredRect.top - navRect.top - 4,
  width: hoveredRect.width + 20,
  height: hoveredRect.height + 10,
});

function AnimatedTabContent({ children }: { children?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={transition}
      className="mt-4"
    >
      {children}
    </motion.div>
  );
}

const NavTabs = ({
  tabs,
  selectedTabIndex,
  setSelectedTab,
}: {
  tabs: Tab[];
  selectedTabIndex: number;
  setSelectedTab: (input: [number, number]) => void;
}) => {
  const [buttonRefs, setButtonRefs] = React.useState<
    Array<HTMLButtonElement | null>
  >([]);

  React.useEffect(() => {
    setButtonRefs((prev) => prev.slice(0, tabs.length));
  }, [tabs.length]);

  const navRef = React.useRef<HTMLDivElement>(null);
  const navRect = navRef.current?.getBoundingClientRect();

  const selectedRect = buttonRefs[selectedTabIndex]?.getBoundingClientRect();

  const [hoveredTabIndex, setHoveredTabIndex] = React.useState<number | null>(
    null,
  );
  const hoveredRect =
    buttonRefs[hoveredTabIndex ?? -1]?.getBoundingClientRect();

  return (
    <nav
      ref={navRef}
      className="flex flex-shrink-0 items-center relative z-0 py-2 gap-1"
      onPointerLeave={() => setHoveredTabIndex(null)}
    >
      {tabs.map((item, i) => {
        const isActive = selectedTabIndex === i;

        return (
          <button
            key={item.value}
            className="text-sm relative flex items-center h-8 px-4 z-20 bg-transparent cursor-pointer select-none transition-colors"
            onPointerEnter={() => setHoveredTabIndex(i)}
            onFocus={() => setHoveredTabIndex(i)}
            onClick={() => setSelectedTab([i, i > selectedTabIndex ? 1 : -1])}
          >
            <motion.span
              ref={(el) => {
                buttonRefs[i] = el as HTMLButtonElement;
              }}
              className={cn("block", {
                "text-muted-foreground": !isActive,
                "text-foreground font-regular": isActive,
              })}
            >
              <small
                className={item.value === "danger-zone" ? "text-destructive" : ""}
              >
                {item.label}
              </small>
            </motion.span>
          </button>
        );
      })}

      <AnimatePresence>
        {hoveredRect && navRect && (
          <motion.div
            key="hover"
            className={`absolute z-10 top-0 left-0 rounded-lg ${
              hoveredTabIndex ===
              tabs.findIndex(({ value }) => value === "danger-zone")
                ? "bg-destructive/10"
                : "bg-muted"
            }`}
            initial={{
              ...getHoverAnimationProps(hoveredRect, navRect),
              opacity: 0,
            }}
            animate={{
              ...getHoverAnimationProps(hoveredRect, navRect),
              opacity: 1,
            }}
            exit={{
              ...getHoverAnimationProps(hoveredRect, navRect),
              opacity: 0,
            }}
            transition={transition}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedRect && navRect && (
          <motion.div
            className={`absolute z-10 bottom-0 left-0 h-[2px] ${
              selectedTabIndex ===
              tabs.findIndex(({ value }) => value === "danger-zone")
                ? "bg-destructive"
                : "bg-foreground"
            }`}
            initial={false}
            animate={{
              width: selectedRect.width + 18,
              x: `calc(${selectedRect.left - navRect.left - 9}px)`,
              opacity: 1,
            }}
            transition={transition}
          />
        )}
      </AnimatePresence>
    </nav>
  );
};

export function AnimatedTabs({ tabs, content }: AnimatedTabsProps) {
  const [hookProps] = React.useState(() => {
    const initialTabId =
      tabs.find((tab) => tab.value === "home")?.value || tabs[0].value;

    return {
      tabs: tabs.map(({ label, value, subRoutes }) => ({
        label,
        value,
        subRoutes,
      })),
      initialTabId,
    };
  });

  const framer = useTabs(hookProps);

  return (
    <div className="w-full">
      <div className="relative flex w-full items-center justify-start border-b border-border overflow-x-auto overflow-y-hidden">
        <NavTabs {...framer.tabProps} />
      </div>
      <AnimatePresence mode="wait">
        <AnimatedTabContent>
          {content?.[framer.selectedTab.value] ?? null}
        </AnimatedTabContent>
      </AnimatePresence>
    </div>
  );
}
