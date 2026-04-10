"use client";

import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Settings, Info } from "lucide-react";
import { useSwapStore } from "@/stores/use-swap-store";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AnimatedNumberInput } from "@/components/numbers/input-animation";

type SlippageSettingsProps = {
  buttonContent?: React.ReactNode;
  triggerClassName?: string;
  triggerAriaLabel?: string;
};

export function SlippageSettings({
  buttonContent,
  triggerClassName,
  triggerAriaLabel,
}: SlippageSettingsProps) {
  const { slippage, setSlippage, deadline, setDeadline } = useSwapStore(
    useShallow((s) => ({ slippage: s.slippage, setSlippage: s.setSlippage, deadline: s.deadline, setDeadline: s.setDeadline }))
  );
  const presets = [0.1, 0.5, 1.0];
  const [autoSlippage, setAutoSlippage] = useState(false);
  const [customSlippage, setCustomSlippage] = useState("");

  const handleAutoSlippageChange = (checked: boolean) => {
    setAutoSlippage(checked);
    if (checked) {
      setSlippage(0.5); // Default auto slippage
      setCustomSlippage("");
    }
  };

  const handleCustomSlippageChange = (value: string) => {
    setCustomSlippage(value);
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 50) {
      setSlippage(parsed);
      setAutoSlippage(false);
    }
  };

  const handlePresetClick = (val: number) => {
    setSlippage(val);
    setAutoSlippage(false);
    setCustomSlippage("");
  };

  const isHighSlippage = slippage > 5;
  const isLowSlippage = slippage < 0.05;

  return (
    <TooltipProvider>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={triggerAriaLabel}
            className={cn(
              "flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium",
              triggerClassName,
            )}
          >
            {buttonContent || (
              <>
                Advanced Settings
                <Settings className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[280px] max-h-[85vh] overflow-y-auto p-0"
          align="end"
          sideOffset={8}
        >
          {/* Header */}
          <div className="p-3 pb-2">
            <h4 className="font-semibold text-xs leading-none">Swap Settings</h4>
          </div>
          
          {/* Separator */}
          <div className="h-px bg-[#E8E8E3]/5 -mx-0" />
          
          {/* Slippage Section */}
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Slippage Tolerance</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[220px]">
                    <p className="text-[10px]">Your transaction will revert if the price changes unfavorably by more than this percentage.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Auto</span>
                <Switch
                  checked={autoSlippage}
                  onCheckedChange={handleAutoSlippageChange}
                  size="xs"
                />
              </div>
            </div>
            
            <div className="flex gap-1.5">
              {presets.map((val) => (
                <button
                  key={val}
                  onClick={() => handlePresetClick(val)}
                  disabled={autoSlippage}
                  className={cn(
                    "flex-1 rounded-[10px] border px-2 py-1.5 text-[11px] font-medium transition-all",
                    slippage === val && !autoSlippage
                      ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                      : "border-white/10 text-muted-foreground hover:bg-white/5 hover:border-white/20",
                    autoSlippage && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {val}%
                </button>
              ))}
              <div className={cn(
                "flex flex-1 items-center rounded-[10px] border px-2 transition-all",
                customSlippage && !autoSlippage 
                  ? "border-blue-500/50 bg-blue-500/10" 
                  : "border-white/10",
                autoSlippage && "opacity-40"
              )}>
                 <AnimatedNumberInput
                    align="right"
                    type="number"
                    value={customSlippage}
                    onChange={(e) => handleCustomSlippageChange(e.target.value)}
                    disabled={autoSlippage}
                    className="w-full bg-transparent py-1.5 text-right text-[11px] outline-none placeholder:text-muted-foreground/50 disabled:cursor-not-allowed"
                    placeholder="Custom"
                    min="0.01"
                    max="50"
                    step="0.1"
                 />
                 <span className="ml-0.5 text-[11px] text-muted-foreground">%</span>
              </div>
            </div>

            {/* Slippage Warnings */}
            {isHighSlippage && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 px-2.5 py-1.5 rounded-[10px] border border-amber-500/20">
                <Info className="h-3 w-3 shrink-0" />
                <span>High slippage increases front-running risk.</span>
              </div>
            )}
            {isLowSlippage && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-white/5 px-2.5 py-1.5 rounded-[10px] border border-white/10">
                <Info className="h-3 w-3 shrink-0" />
                <span>Low slippage may cause failed transactions.</span>
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="h-px bg-[#E8E8E3]/5 -mx-0" />

          {/* Deadline Section */}
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Transaction Deadline</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                <TooltipContent className="max-w-[220px]">
                    <p className="text-[10px]">Your transaction will revert if pending for more than this time.</p>
                  </TooltipContent>
                </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-[10px] border border-white/10 px-2.5 flex-1 hover:border-white/20 transition-colors">
                <AnimatedNumberInput
                  type="number"
                  value={deadline}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val > 0 && val <= 180) {
                      setDeadline(val);
                    }
                  }}
                  className="w-full bg-transparent py-1.5 text-[11px] outline-none placeholder:text-muted-foreground/50"
                  placeholder="30"
                  min="1"
                  max="180"
                />
              </div>
              <span className="text-[11px] text-muted-foreground">minutes</span>
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-[#E8E8E3]/5 -mx-0" />

          {/* Footer Summary */}
          <div className="p-3 pt-2">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Current:</span>
              <span className="text-foreground font-medium">
                {autoSlippage ? "Auto" : `${slippage}%`} slippage • {deadline}min
              </span>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
