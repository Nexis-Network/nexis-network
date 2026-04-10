"use client";

import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onEnhance: () => void;
  onAIEnhance: () => void;
  enhancingPrompt: boolean;
  className?: string;
}

export function PromptInput({
  prompt,
  setPrompt,
  onEnhance,
  onAIEnhance,
  enhancingPrompt,
  className,
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    setCharCount(prompt.length);
  }, [prompt]);

  return (
    <div className={className}>
      <div className="relative space-y-1">
        <Label
          className="text-[11px] text-muted-foreground sm:text-xs"
          htmlFor="prompt"
        >
          Prompt
        </Label>
        <Textarea
          className={`min-h-[150px] resize-none rounded-xl border-black/10 font-medium text-base transition-all duration-200 focus-visible:ring-0 focus-visible:ring-offset-0 ${
            isFocused ? "border-black shadow-sm" : ""
          }`}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => setPrompt(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Describe your advertisement..."
          ref={textareaRef}
          required
          value={prompt}
        />

        <AnimatePresence>
          {prompt.trim().length > 0 && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-3 bottom-3 flex items-center gap-2"
              exit={{ opacity: 0, y: 10 }}
              initial={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="h-8 w-8 rounded-full bg-black/5 p-0"
                      onClick={onEnhance}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="sr-only">Add quality terms</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Add quality terms</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="h-8 rounded-full border-black/20 hover:border-black/30"
                      disabled={enhancingPrompt || !prompt.trim()}
                      onClick={onAIEnhance}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {enhancingPrompt ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                          <span className="text-xs">Enhance</span>
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Enhance with AI</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <div className="text-muted-foreground text-xs">
          {charCount > 0 && (
            <span>
              {charCount} character{charCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
