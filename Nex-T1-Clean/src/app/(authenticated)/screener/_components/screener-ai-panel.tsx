"use client";

import { useChatController } from "@/components/dashboard/chat-shell/hooks/use-chat-controller";
import { Conversation, ConversationContent, ConversationEmptyState } from "@/components/dashboard/lazy-components";
import { AssistantMessage, UserMessage } from "@/components/chat/message";
import type { ConversationMessage } from "@/components/chat/types";
import { useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ScreenerAiPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ScreenerAiPanel({ isOpen, onClose }: ScreenerAiPanelProps) {
    const controller = useChatController();
    const { messages, chatStatus, isAutoScrollActive } = controller;
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages
    useEffect(() => {
        if (isAutoScrollActive && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages.length, isAutoScrollActive]);

    const renderMessage = useCallback(
        (message: ConversationMessage, index: number) => {
            const isLatestAssistant =
                message.role === "assistant" &&
                index === messages.length - 1 &&
                (chatStatus === "streaming" || chatStatus === "submitted");
            
            const augmentedMessage = isLatestAssistant
                ? { ...message, status: "pending" as const }
                : message;

            if (message.role === "assistant") {
                return (
                    <AssistantMessage
                        key={message.id}
                        message={augmentedMessage}
                        onFollowUpDecision={(suggestionId, decision) =>
                            controller.handleFollowUpDecision(message.id, suggestionId, decision)
                        }
                        onFollowUpQuestion={controller.handleFollowUpQuestion}
                        onRegenerate={() => controller.handleRegenerate(message.id)}
                        onEdit={() => controller.handleEditMessage(message.id)}
                        onDelete={() => controller.handleDeleteMessage(message.id)}
                        onShare={() => controller.handleShareMessage(message.id)}
                    />
                );
            }
            return <UserMessage key={message.id} message={augmentedMessage} />;
        },
        [controller, messages.length, chatStatus]
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 400, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="border-l border-border bg-card h-full flex flex-col overflow-hidden relative z-50 shadow-2xl shrink-0"
                >
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <span className="text-sm font-medium text-foreground">Nex AI Assistant</span>
                         <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-hidden relative flex flex-col">
                         <Conversation className="h-full w-full flex flex-col">
                            <ConversationContent className="h-full">
                                {messages.length === 0 ? (
                                    <ConversationEmptyState
                                        title="Nex Screener Assistant"
                                        description="Ask about tokens, trends, or request analysis."
                                        className="h-full items-center justify-center text-center p-6"
                                    />
                                ) : (
                                    <div 
                                        ref={scrollRef}
                                        className="h-full overflow-y-auto pb-24 px-4"
                                    >
                                        <div className="flex flex-col gap-4 py-4">
                                            {messages.map((msg, idx) => renderMessage(msg, idx))}
                                        </div>
                                    </div>
                                )}
                            </ConversationContent>
                        </Conversation>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
