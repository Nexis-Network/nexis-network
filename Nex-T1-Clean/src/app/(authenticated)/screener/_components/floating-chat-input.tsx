"use client";

import { useChatController } from "@/components/dashboard/chat-shell/hooks/use-chat-controller";
import { useScreener } from "../_context/screener-context";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface FloatingChatInputProps {
    onExpand: () => void;
    isPanelOpen: boolean;
}

export function FloatingChatInput({ onExpand, isPanelOpen }: FloatingChatInputProps) {
    const { handleComposerSubmit, isBusy } = useChatController();
    const { currentViewData, selectedChain } = useScreener();
    const [input, setInput] = useState("");

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isBusy) return;
        
        // Construct a brief context string of what's on screen
        const visibleTokens = currentViewData.slice(0, 5).map((t: UntypedJson) => `${t.symbol} ($${t.currentPrice?.toFixed(3)})`).join(", ");

        // Include market context as part of the message for the AI
        const messageWithContext = `[Context: Viewing ${selectedChain} screener. Top tokens: ${visibleTokens}]\n\n${input}`;
        
        handleComposerSubmit({ 
            text: messageWithContext
        });
        setInput("");
        onExpand();
    };

    if (isPanelOpen) {
        return (
             <div className="absolute bottom-[calc(1.5rem+3%)] left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-[60]">
                 <div className="relative group p-1 rounded-full bg-transparent border border-border shadow-2xl flex items-center">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
                        placeholder="Ask follow-up..."
                        className="flex-1 bg-transparent border-none px-4 text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
                        disabled={isBusy}
                    />
                    <Button 
                        size="icon" 
                        onClick={() => handleSubmit()} 
                        disabled={!input.trim() || isBusy}
                        className={cn(
                          "rounded-full w-8 h-8 shrink-0",
                          input.trim()
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                    >
                        <ArrowUp className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute bottom-[calc(1.5rem+3%)] left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-[60]">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative group p-2 rounded-[2rem] bg-[color-mix(in_oklab,var(--background)_75%,transparent)] backdrop-blur-xl border border-border shadow-2xl transition-all hover:border-border/80"
            >
                <div className="flex items-center gap-2 px-2">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
                        placeholder="Ask Nex AI to analyze market..."
                        className="flex-1 bg-transparent border-none px-2 py-2 text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
                         disabled={isBusy}
                    />
                    <Button
                        size="icon"
                        onClick={() => handleSubmit()}
                        disabled={!input.trim() || isBusy}
                        className={cn(
                          "rounded-full transition-all",
                          input.trim()
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-muted text-muted-foreground"
                        )}
                    >
                        <ArrowUp className="w-5 h-5" />
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
