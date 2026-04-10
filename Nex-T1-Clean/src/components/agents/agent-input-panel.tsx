import NumberFlow from "@number-flow/react";
import { ArrowRight, Check, Info, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  fadeIn,
  slideInFromRight,
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/animations";
import type { AgentType, ExamplePrompt } from "@/lib/types";
import { formatDisplayText, getDisplayTextFromHistory } from "@/lib/utils";
import { GlowEffect, TextEffect } from "@/components/visuals/effects/effects";

interface InputPanelProps {
  selectedAgent: AgentType;
  inputs: Record<string, string>;
  onInputChange: (fieldName: string, value: string) => void;
  onExampleSelect: (example: ExamplePrompt, index: number) => void;
  examplePrompts: ExamplePrompt[];
  selectedExampleIndex: number;
  resetState: () => void;
  children?: ReactNode;
}

export function InputPanel({
  inputs,
  selectedAgent,
  onInputChange,
  onExampleSelect,
  examplePrompts,
  selectedExampleIndex,
  resetState,
  children,
}: InputPanelProps) {
  const hasMultipleTextAreas =
    selectedAgent.inputFields.filter((f) => f.type === "textarea").length > 1;
  const hasSingleInputField = selectedAgent.inputFields.length === 1;
  return (
    <motion.div
      animate="animate"
      className="mx-2 flex h-[calc(100dvh-6rem)] w-full flex-col rounded-t-sm rounded-b-2xl bg-white p-[1px]  md:min-h-0 md:w-1/2 lg:m-2 lg:h-auto lg:w-2/5 lg:rounded-2xl"
      exit="exit"
      initial="initial"
      variants={slideInFromRight}
    >
      {/* Examples */}
      <ExampleButtons
        examplePrompts={examplePrompts}
        onExampleSelect={onExampleSelect}
        resetState={resetState}
        selectedAgent={selectedAgent}
        selectedExampleIndex={selectedExampleIndex}
      />

      {/* Input Fields */}
      <ScrollArea className="w-full flex-1">
        <motion.div
          className="space-y-5 p-2 sm:p-4"
          key={selectedAgent.name}
          variants={staggerContainerVariants}
        >
          {selectedAgent.inputFields.map((field, index) => (
            <motion.div
              className="space-y-2.5"
              key={index}
              variants={staggerItemVariants}
            >
              <div className="flex items-center gap-1.5">
                <Label
                  className={cn(
                    "font-medium text-xs transition-all duration-200"
                  )}
                >
                  {field.label}
                </Label>
                <AnimatePresence>
                  {inputs[field.name]?.trim() && (
                    <motion.div
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        transition: {
                          type: "spring",
                          stiffness: 500,
                          damping: 15,
                          mass: 0.5,
                        },
                      }}
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500/10 ring-1 ring-green-500/30"
                      exit={{
                        opacity: 0,
                        scale: 0.6,
                        y: 5,
                        transition: {
                          duration: 0.2,
                          ease: "easeOut",
                        },
                      }}
                      initial={{ opacity: 0, scale: 0.6, y: 5 }}
                    >
                      <Check className="h-2.5 w-2.5 stroke-[3] text-green-500" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {field.type === "textarea" ? (
                <div className="group relative rounded-[9px] p-1 ">
                  <Textarea
                    className={cn(
                      "resize-none rounded-[5px] border-none text-[16px] leading-snug caret-blue-400 shadow-[0px_1px_0px_0px_hsla(0,_0%,_0%,_0.02)_inset,_0px_0px_0px_1px_hsla(0,_0%,_0%,_0.02)_inset,_0px_0px_0px_1px_rgba(255,_255,_255,_0.25)] ring-1 ring-[#F6F6F6] ring-offset-1 ring-offset-neutral-50 transition-all duration-200 ease-out focus-visible:ring-[#2B7BE5] focus-visible:ring-[1px] focus-visible:ring-offset-2 focus-visible:ring-offset-blue-100 md:text-[14px] md:leading-relaxed",
                      hasMultipleTextAreas
                        ? "min-h-[150px] lg:min-h-[130px]"
                        : "min-h-[220px] lg:min-h-[240px]",
                      hasSingleInputField && "min-h-[340px] lg:min-h-[300px]"
                    )}
                    onChange={(e) => onInputChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    value={inputs[field.name] || ""}
                  />
                  <div className="absolute right-3 bottom-3 rounded-[4px] bg-white/80 px-1.5 py-0.5 text-[11px] text-neutral-400 opacity-0  transition-opacity duration-200 group-hover:opacity-100">
                    {(inputs[field.name] || "").length} chars
                  </div>
                </div>
              ) : (
                <Input
                  className="border-none text-[13px] shadow-[0px_1px_0px_0px_hsla(0,_0%,_0%,_0.02)_inset,_0px_0px_0px_1px_hsla(0,_0%,_0%,_0.02)_inset,_0px_0px_0px_1px_rgba(255,_255,_255,_0.25)] ring-1 ring-[#F6F6F6] ring-offset-4 ring-offset-[#F6F6F6] transition-colors duration-200 focus:border-neutral-300 focus:ring-neutral-200 focus-visible:ring-neutral-300"
                  onChange={(e) => onInputChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  type="text"
                  value={inputs[field.name] || ""}
                />
              )}
            </motion.div>
          ))}
        </motion.div>
      </ScrollArea>

      {/* Agent Info Card */}
      <motion.div
        className="flex-none border-neutral-100/80 border-t bg-[#FCFCFC]"
        variants={fadeIn}
      >
        <div className="p-2 sm:p-4">
          <Card className="relative rounded-lg border-none px-2 pt-2 ">
            <div className="space-y-3 text-[10px] text-neutral-600">
              <div className="space-y-1.5 p-2">
                <h4 className="flex items-center gap-1 py-[2px] font-medium text-[10px] text-neutral-900">
                  <TextEffect>{selectedAgent.name}</TextEffect>{" "}
                  <span className="text-neutral-500">pattern is best for</span>
                </h4>

                <div className="text-[10px] leading-relaxed">
                  {selectedAgent.context}
                </div>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="absolute top-1.5 right-1.5 flex min-w-[100px] items-center gap-1 rounded-md px-[2px] py-[1px] pl-1">
                  <p className="font-medium text-[9px] text-muted-foreground/60">
                    Average Processing Time
                  </p>
                  <div className="inline-block rounded-sm border border-black/10 bg-neutral-50 px-1 py-0.5 text-[9px] text-neutral-800">
                    <NumberFlow value={selectedAgent.averageTime ?? 0} />s
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>
      {/* Action Buttons passed as children */}
      {children}
    </motion.div>
  );
}

function ExampleButtons({
  examplePrompts,
  onExampleSelect,
  selectedExampleIndex,
  resetState,
  selectedAgent,
}: {
  examplePrompts: ExamplePrompt[];
  onExampleSelect: (example: ExamplePrompt, index: number) => void;
  selectedExampleIndex: number;
  resetState: () => void;
  selectedAgent: AgentType;
}) {
  return (
    <motion.div
      animate="animate"
      className="flex-none rounded-t-2xl border-neutral-100/80 border-b bg-[#FAFAFA]/50 p-2 sm:p-3 md:p-4"
      initial="initial"
      variants={fadeIn}
    >
      <div className="space-y-2 sm:space-y-3">
        <motion.div
          className="flex items-center justify-between"
          variants={{
            initial: { opacity: 0, y: -10 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -10 },
          }}
        >
          <Label className="font-medium text-[11px] text-neutral-600 sm:text-xs">
            Quick Examples
          </Label>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                className="h-6 w-6 transition-colors duration-200"
                size="icon"
                variant="ghost"
              >
                <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              align="end"
              className="max-w-[200px] p-2 text-[11px] sm:max-w-[250px] sm:p-3 sm:text-xs"
              side="bottom"
            >
              <p className="leading-relaxed">
                This is the Input Panel for the Agent. Different agents have
                different input fields. Select an example to get started.
              </p>
            </TooltipContent>
          </Tooltip>
        </motion.div>
        <motion.div
          className="relative w-full"
          key={`${selectedAgent.id}-examples`}
          variants={{
            initial: { opacity: 0, y: 20, scale: 0.95 },
            animate: {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: {
                type: "spring",
                stiffness: 100,
                damping: 15,
              },
            },
            exit: {
              opacity: 0,
              y: 20,
              scale: 0.95,
              transition: {
                duration: 0.2,
              },
            },
          }}
        >
          <ScrollArea className="w-full whitespace-nowrap rounded-[9px] bg-muted shadow-[0px_1px_0px_0px_hsla(0,_0%,_0%,_0.02)_inset,_0px_0px_0px_1px_hsla(0,_0%,_0%,_0.02)_inset,_0px_0px_0px_1px_rgba(255,_255,_255,_0.25)] ring-[1px] ring-border">
            <div
              className="flex w-max space-x-2 p-1.5"
              key={`${selectedAgent.id}-examples-container`}
            >
              {examplePrompts.map((example, index) => (
                <motion.button
                  className={cn(
                    "group relative min-w-fit touch-manipulation whitespace-nowrap rounded-[6px] bg-white px-2.5 py-1 text-[11px] text-neutral-800  transition-all duration-200 hover:bg-neutral-50 active:scale-95 sm:text-xs",
                    index === selectedExampleIndex &&
                      "bg-black pr-7 text-white shadow-[0px_1px_2px_0px_rgba(38,_99,_235,_0.3),_0px_1px_1px_0px_rgba(38,_99,_235,_0.1)_inset,_0px_0px_0px_1px_rgba(38,_99,_235,_0.4)_inset] hover:bg-black/90 hover:shadow-[0px_2px_4px_0px_rgba(38,_99,_235,_0.25),_0px_1px_1px_0px_rgba(38,_99,_235,_0.1)_inset,_0px_0px_0px_1px_rgba(38,_99,_235,_0.4)_inset]"
                  )}
                  key={`${selectedAgent.id}-${index}`}
                  onClick={() => {
                    if (index === selectedExampleIndex) {
                      onExampleSelect(example, -1);
                      resetState();
                    } else {
                      onExampleSelect(example, index);
                    }
                  }}
                  type="button"
                  variants={{
                    initial: { opacity: 0, x: -20 },
                    animate: {
                      opacity: 1,
                      x: 0,
                      transition: {
                        delay: index * 0.05,
                      },
                    },
                  }}
                >
                  {(() => {
                    const text =
                      example.prompt ||
                      example.content ||
                      example.query ||
                      example.requirements ||
                      "";
                    return text.length > 30 ? `${text.slice(0, 30)}...` : text;
                  })()}
                  {index === selectedExampleIndex && (
                    <motion.div
                      animate={{
                        opacity: 1,
                        scale: 1,
                        rotate: 0,
                        transition: {
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        },
                      }}
                      className="-translate-y-1/2 absolute top-3 right-1.5 cursor-pointer rounded-full bg-white/20 p-0.5 shadow-[0px_1px_1px_0px_rgba(0,_0,_0,_0.2)] backdrop-blur-[2px] transition-colors duration-200 hover:bg-white/30"
                      exit={{
                        opacity: 0,
                        scale: 0.6,
                        rotate: 90,
                        transition: {
                          duration: 0.2,
                          ease: "easeInOut",
                        },
                      }}
                      initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onExampleSelect(example, -1);
                        resetState();
                      }}
                      whileHover={{
                        scale: 1.15,
                        rotate: 180,
                        transition: {
                          type: "spring",
                          stiffness: 400,
                          damping: 15,
                        },
                      }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="h-3 w-3" strokeWidth={2.5} />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
            <ScrollBar
              className="h-1 bg-neutral-100"
              orientation="horizontal"
            />
          </ScrollArea>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function ActionButtons({
  inputs,
  inputHistory,
  handleHistorySelect,
  handleInputSubmit,
  loading,
  isMobile,
  resetState,
  mobileReOpenOutputDrawer,
}: {
  inputs: Record<string, string>;
  inputHistory: string[];
  handleHistorySelect: (item: string) => void;
  handleInputSubmit: () => void;
  loading: boolean;
  isMobile: boolean;
  resetState: () => void;
  mobileReOpenOutputDrawer: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-[#FAFAFA]/50 px-4 py-4">
      <Button
        className="group h-9 gap-1.5 rounded-lg border border-[#E0E0E0] bg-[#FFFFFF] text-[#36322F] [box-shadow:inset_0px_-2.108433723449707px_0px_0px_#E0E0E0,_0px_1.2048193216323853px_6.325301647186279px_0px_rgba(0,_0,_0,_10%)] active:bg-[#F0F0F0] hover:enabled:bg-[#F8F8F8] disabled:bg-[#F0F0F0] disabled:shadow-none active:[box-shadow:inset_0px_-1.5px_0px_0px_#D8D8D8,_0px_0.5px_2px_0px_rgba(0,_0,_0,_15%)] hover:enabled:[box-shadow:inset_0px_-2.53012px_0px_0px_#E8E8E8,_0px_1.44578px_7.59036px_0px_rgba(0,_0,_0,_12%)]"
        disabled={loading || !Object.values(inputs).some((v) => v.trim())}
        onClick={() => {
          if (isMobile) {
            mobileReOpenOutputDrawer();
            return;
          }
          resetState();
        }}
        size="sm"
        variant="ghost"
      >
        {isMobile ? (
          <WorkHistoryIcon className="h-3.5 w-3.5" />
        ) : (
          <DeletePutBackIcon className="h-3.5 w-3.5 stroke-red-800" />
        )}
      </Button>
      {!isMobile && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="group h-9 gap-1.5 rounded-lg border border-[#E0E0E0] bg-[#FFFFFF] text-[#36322F] [box-shadow:inset_0px_-2.108433723449707px_0px_0px_#E0E0E0,_0px_1.2048193216323853px_6.325301647186279px_0px_rgba(0,_0,_0,_10%)] active:bg-[#F0F0F0] hover:enabled:bg-[#F8F8F8] disabled:bg-[#F0F0F0] disabled:shadow-none active:[box-shadow:inset_0px_-1.5px_0px_0px_#D8D8D8,_0px_0.5px_2px_0px_rgba(0,_0,_0,_15%)] hover:enabled:[box-shadow:inset_0px_-2.53012px_0px_0px_#E8E8E8,_0px_1.44578px_7.59036px_0px_rgba(0,_0,_0,_12%)]"
              disabled={inputHistory.length === 0}
              size="sm"
              variant="outline"
            >
              <WorkHistoryIcon className="h-3.5 w-3.5" />
              <span className="hidden text-xs md:block">History</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-[400px] w-[320px] overflow-y-auto"
          >
            {inputHistory.length === 0 ? (
              <div className="p-4 text-center text-neutral-500 text-sm">
                No history yet
              </div>
            ) : (
              inputHistory.map((item, index) => {
                try {
                  const parsedItem = JSON.parse(item) as Record<string, UntypedJson>;
                  const displayText = getDisplayTextFromHistory(parsedItem);

                  return (
                    <DropdownMenuItem
                      key={index}
                      className="cursor-pointer break-all px-3 py-2.5"
                      onClick={() => handleHistorySelect(item)}
                    >
                      <div className="flex w-full items-center gap-2">
                        <div className="flex-1 truncate text-sm">
                          {formatDisplayText(displayText)}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </DropdownMenuItem>
                  );
                } catch {
                  return null;
                }
              })
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="relative w-full">
        {Object.values(inputs).some((v) => v.trim()) && (
          <GlowEffect
            blur="soft"
            colors={["#FF5733", "#33FF57", "#3357FF", "#F1C40F"]}
            duration={3}
            mode="colorShift"
            scale={1.018}
          />
        )}
        <button
          className="relative inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg bg-[#36322F] px-2.5 py-1.5 text-center text-sm text-zinc-50 outline-1 outline-[#fff2f21f] [box-shadow:inset_0px_-2.108433723449707px_0px_0px_#171310,_0px_1.2048193216323853px_6.325301647186279px_0px_rgba(58,_33,_8,_58%)] hover:bg-[#4a4542] hover:[box-shadow:inset_0px_-2.53012px_0px_0px_#171310,_0px_1.44578px_7.59036px_0px_rgba(58,_33,_8,_64%)]"
          onClick={handleInputSubmit}
        >
          {loading ? (
            <>
              <Loader2 className="mr-1.5 size-5 animate-spin" />
              <span className="text-xs">Processing...</span>
            </>
          ) : (
            <>
              <ArtificialIntelligence04Icon className="mr-1.5 size-5 fill-black stroke-1 text-blue-400 transition-all duration-200 ease-in-out group-hover:rotate-12 group-hover:fill-blue-200 group-disabled:fill-white group-disabled:opacity-50" />
              <span className="text-xs">
                {isMobile ? "Run & View Output" : "Run Agent"}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

const ArtificialIntelligence04Icon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    color={"#000000"}
    fill={"none"}
    height={24}
    viewBox="0 0 24 24"
    width={24}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M4 12C4 8.22876 4 6.34315 5.17157 5.17157C6.34315 4 8.22876 4 12 4C15.7712 4 17.6569 4 18.8284 5.17157C20 6.34315 20 8.22876 20 12C20 15.7712 20 17.6569 18.8284 18.8284C17.6569 20 15.7712 20 12 20C8.22876 20 6.34315 20 5.17157 18.8284C4 17.6569 4 15.7712 4 12Z"
      fill="currentColor"
      opacity="0.4"
    />
    <path
      d="M4 12C4 8.22876 4 6.34315 5.17157 5.17157C6.34315 4 8.22876 4 12 4C15.7712 4 17.6569 4 18.8284 5.17157C20 6.34315 20 8.22876 20 12C20 15.7712 20 17.6569 18.8284 18.8284C17.6569 20 15.7712 20 12 20C8.22876 20 6.34315 20 5.17157 18.8284C4 17.6569 4 15.7712 4 12Z"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M7.5 15L9.34189 9.47434C9.43631 9.19107 9.7014 9 10 9C10.2986 9 10.5637 9.19107 10.6581 9.47434L12.5 15M8.5 13H11.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M15.5 9V15"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M8 2V4M16 2V4M12 2V4M8 20V22M12 20V22M16 20V22M22 16H20M4 8H2M4 16H2M4 12H2M22 8H20M22 12H20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

const WorkHistoryIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    color={"#000000"}
    fill={"none"}
    height={24}
    viewBox="0 0 24 24"
    width={24}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M9.60546 5.5H13.4082C16.9934 5.5 18.7861 5.5 19.8999 6.63496C20.7568 7.50819 20.9544 8.7909 21 11V13C21 13.6016 21 14.1551 20.9952 14.6655C20.1702 13.6493 18.9109 13 17.5 13C15.0147 13 13 15.0147 13 17.5C13 18.9109 13.6493 20.1702 14.6655 20.9952C14.1551 21 13.6015 21 13 21H9.60546C6.02021 21 4.22759 21 3.11379 19.865C2 18.7301 2 16.9034 2 13.25C2 9.59661 2 7.76992 3.11379 6.63496C4.22759 5.5 6.02021 5.5 9.60546 5.5Z"
      fill="currentColor"
      opacity="0.4"
    />
    <path
      d="M11.0065 21H9.60546C6.02021 21 4.22759 21 3.11379 19.865C2 18.7301 2 16.9034 2 13.25C2 9.59661 2 7.76992 3.11379 6.63496C4.22759 5.5 6.02021 5.5 9.60546 5.5H13.4082C16.9934 5.5 18.7861 5.5 19.8999 6.63496C20.7568 7.50819 20.9544 8.7909 21 11"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M18.85 18.85L17.5 17.95V15.7M13 17.5C13 19.9853 15.0147 22 17.5 22C19.9853 22 22 19.9853 22 17.5C22 15.0147 19.9853 13 17.5 13C15.0147 13 13 15.0147 13 17.5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M16 5.5L15.9007 5.19094C15.4056 3.65089 15.1581 2.88087 14.5689 2.44043C13.9796 2 13.197 2 11.6316 2H11.3684C9.80304 2 9.02036 2 8.43111 2.44043C7.84186 2.88087 7.59436 3.65089 7.09934 5.19094L7 5.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

const DeletePutBackIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    color={"#000000"}
    fill={"none"}
    height={24}
    viewBox="0 0 24 24"
    width={24}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 18.0008 20.2879C17.6833 20.7431 17.2747 21.1273 16.8007 21.416C15.8421 22 14.559 22 11.9927 22C9.42312 22 8.1383 22 7.17905 21.4149C6.7048 21.1257 6.296 20.7408 5.97868 20.2848C5.33688 19.3626 5.25945 18.0801 5.10461 15.5152L4.5 5.5H19.5Z"
      fill="currentColor"
      opacity="0.4"
    />
    <path
      d="M4.5 5.5L5.08671 15.1781C5.26178 18.066 5.34932 19.5099 6.14772 20.5018C6.38232 20.7932 6.65676 21.0505 6.96304 21.2662C8.00537 22 9.45801 22 12.3633 22H15.9867C17.4593 22 18.7162 20.9398 18.9583 19.4932C19.2643 17.6646 17.8483 16 15.9867 16H13.0357"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
    <path
      d="M14.5 18.5C13.9943 18.0085 12 16.7002 12 16C12 15.2998 13.9943 13.9915 14.5 13.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M21 5.5H3"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
    <path
      d="M16.0575 5.5L15.3748 4.09173C14.9213 3.15626 14.6946 2.68852 14.3035 2.39681C14.2167 2.3321 14.1249 2.27454 14.0288 2.2247C13.5957 2 13.0759 2 12.0363 2C10.9706 2 10.4377 2 9.99745 2.23412C9.89986 2.28601 9.80675 2.3459 9.71906 2.41317C9.3234 2.7167 9.10239 3.20155 8.66037 4.17126L8.05469 5.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
    <path
      d="M19 13.5L19.5 5.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
  </svg>
);
