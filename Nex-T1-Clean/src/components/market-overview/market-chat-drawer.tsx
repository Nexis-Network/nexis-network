"use client";

import { useEffect, useRef, useState } from "react";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { PromptInput, PromptInputBody, PromptInputTextarea, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { useNexChat } from "@/modules/chat/hooks/use-ai-chat";


import { logger } from '@/lib/logger';
function getMessageText(message: {
    content?: string;
    parts?: Array<{ type: string; text?: string }>;
}) {
    const partText = (message.parts ?? [])
        .filter((part): part is { type: "text"; text: string } => part.type === "text" && typeof part.text === "string")
        .map((part) => part.text)
        .join("");

    return partText || message.content || "";
}

function getRenderableMessageParts(message: {
    content?: string;
    parts?: Array<{ type: string; text?: string }>;
}) {
    if (Array.isArray(message.parts) && message.parts.length > 0) {
        return message.parts;
    }

    const fallbackText = getMessageText(message);
    return fallbackText ? [{ type: "text", text: fallbackText }] : [];
}

interface MarketChatDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    marketContext?: string;
    onAction?: (action: string, params: string[]) => void;
}

export function MarketChatDrawer({ isOpen, onClose, marketContext, onAction }: MarketChatDrawerProps) {
    return (
        <MarketChatDrawerContent
            isOpen={isOpen}
            onClose={onClose}
            marketContext={marketContext}
            onAction={onAction}
        />
    );
}

function MarketChatDrawerContent({ isOpen, onClose, marketContext, onAction }: MarketChatDrawerProps) {
    const { messages, sendMessage, status } = useNexChat();
    const [input, setInput] = useState("");
    const lastProcessedMessageId = useRef<string | null>(null);

    // Parse actions from assistant messages
    useEffect(() => {
        if (!onAction || !messages.length) return;

        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === "assistant" && lastMessage.id !== lastProcessedMessageId.current) {
            const content = getMessageText(lastMessage);
            const actionRegex = /\[ACTION:([A-Z_]+)\|([^\]]+)\]/g;
            let match;

            while ((match = actionRegex.exec(content)) !== null) {
                const actionType = match[1];
                const params = match[2].split("|");
                logger.debug(`[MarketChat] Executing action: ${actionType}`, params); // Telemetry
                onAction(actionType, params);
            }

            lastProcessedMessageId.current = lastMessage.id;
        }
    }, [messages, onAction]);

    // Helper to strip action tags from display
    const cleanContent = (content: string) => {
        return content.replace(/\[ACTION:[^\]]+\]/g, "").trim();
    };

    return (
        <div
            className={cn(
                "relative flex h-full flex-col border-l border-border bg-background transition-all duration-300 ease-in-out",
                isOpen ? "w-[400px] opacity-100" : "w-0 opacity-0 overflow-hidden"
            )}
            role="dialog"
            aria-label="Market AI Assistant"
            aria-hidden={!isOpen}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-[#31B8C6]" />
                    <h3 className="font-medium text-sm">Market AI Assistant</h3>
                </div>
                <Button variant="ghost" size="icon" className="size-8" onClick={onClose} aria-label="Close chat">
                    <X className="size-4" />
                </Button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <Conversation className="flex-1 min-h-0 w-full no-scrollbar">
                    <ConversationContent>
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center h-full text-muted-foreground">
                                <Sparkles className="size-8 mb-3 opacity-50" />
                                <p className="text-sm font-medium">How can I help you analyze the market today?</p>
                                <p className="text-xs mt-1 opacity-70">Ask about trends, specific tokens, or market sentiment.</p>
                            </div>
                        ) : (
                            messages.map((message) => (
                                <Message from={message.role} key={message.id}>
                                    <MessageContent className={cn(message.role === "assistant" && "w-full")}>
                                        {getRenderableMessageParts(message).map((part, partIndex) => {
                                            if (part.type === "text") {
                                                const cleanedText = cleanContent(part.text ?? "");
                                                if (!cleanedText) return null; // Don't render empty messages if only action tag
                                                return <Response key={`${message.id}-part-${partIndex}`}>{cleanedText}</Response>;
                                            }
                                            return null;
                                        })}
                                    </MessageContent>
                                </Message>
                            ))
                        )}
                        {status === "streaming" && (
                            <div className="px-4 py-2 text-xs text-muted-foreground animate-pulse">
                                AI is thinking...
                            </div>
                        )}
                    </ConversationContent>
                    <ConversationScrollButton />
                </Conversation>
            </div>

            {/* Input Area */}
            <div className="border-t border-border p-4">
                <PromptInput
                    onSubmit={(message) => {
                        if (message.text?.trim()) {
                            void sendMessage({
                                text: message.text,
                                ...(marketContext
                                    ? { body: { marketContext } }
                                    : {}),
                            }).then(() => {
                                setInput("");
                            });
                        }
                    }}
                >
                    <PromptInputBody>
                        <PromptInputTextarea
                            disabled={status !== "ready"}
                            onChange={(event) => setInput(event.target.value)}
                            placeholder="Ask about the market..."
                            value={input}
                            className="min-h-[44px] max-h-[200px]"
                        />
                        <div className="absolute bottom-2 right-2">
                            <PromptInputSubmit status={status} />
                        </div>
                    </PromptInputBody>
                </PromptInput>
            </div>
        </div>
    );
}
