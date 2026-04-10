"use client";

/**
 * Message Thinking Component
 * Displays AI reasoning steps with chain-of-thought
 * Extracted from chat-interface.tsx for reusability
 * 
 * Only renders when there's actual thinking content to display.
 */

import { memo, useState } from "react";
import {
  ChainOfThought,
  ChainOfThoughtStep,
  ChainOfThoughtContent,
} from "@/components/ui/chain-of-thought";
import { CollapsibleTrigger } from "@/components/ui/collapsible";
import type { AIAgentStream } from "@/components/chat/types";
import { ThinkingBlock } from "./thinking-block";

type MessageThinkingProps = {
  thoughts: AIAgentStream[];
  isStreaming?: boolean;
};

export const MessageThinking = memo(function MessageThinking({
  thoughts,
  isStreaming = true,
}: MessageThinkingProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render if there are no thoughts
  if (!thoughts || thoughts.length === 0) {
    return null;
  }

  // Combine all thoughts into a single string for display
  const thoughtsText = thoughts
    .map((t) => t.thought)
    .filter(Boolean)
    .join("\n");

  // Get current step text
  const currentStep = thoughts.length > 0 
    ? thoughts[thoughts.length - 1]?.thought || "Processing..."
    : "Processing...";

  // Single thought - use simple display
  if (thoughts.length === 1) {
    const thought = thoughts[0];
    return (
      <ThinkingBlock
        isStreaming={isStreaming}
        thoughts={thought.thought || ""}
        currentStep={thought.thought || "Thinking..."}
        expanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
      />
    );
  }

  // Multiple thoughts - use ThinkingBlock with expandable chain-of-thought
  return (
    <div className="mb-3 space-y-2">
      <ThinkingBlock
        isStreaming={isStreaming}
        thoughts={thoughtsText}
        currentStep={currentStep}
        expanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
      />
      
      {isExpanded && (
        <div className="animate-in slide-in-from-top-2 fade-in duration-200">
          <ChainOfThought>
            <ChainOfThoughtStep>
              <CollapsibleTrigger asChild>
                <div className="sr-only">Toggle thought details</div>
              </CollapsibleTrigger>
              <ChainOfThoughtContent>
                {thoughts.map((thought, index) => (
                  <div key={index} className="mb-2 last:mb-0">
                    <div className="font-medium text-sm text-foreground">{thought.thought}</div>
                    {thought.ideaFragment && (
                      <div className="text-muted-foreground text-sm mt-1 pl-2 border-l-2 border-border/50">
                        {thought.ideaFragment}
                      </div>
                    )}
                  </div>
                ))}
              </ChainOfThoughtContent>
            </ChainOfThoughtStep>
          </ChainOfThought>
        </div>
      )}
    </div>
  );
});
