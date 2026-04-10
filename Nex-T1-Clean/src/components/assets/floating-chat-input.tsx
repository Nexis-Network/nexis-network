"use client";

import { useChatController } from "@/components/dashboard/chat-shell/hooks/use-chat-controller";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp, Plus, FileText, Image as ImageIcon, AudioLines, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SiriOrb from "@/components/ai-elements/siri-orb";
import { useConversation } from "@elevenlabs/react";
import { fetchConversationToken } from "@/lib/elevenlabs/token";
import { useAudioVolume } from "@/components/ui/bar-visualizer";


import { logger } from '@/lib/logger';
interface FloatingChatInputProps {
    onExpand: () => void;
    isPanelOpen: boolean;
    marketContext?: string;
}

const UploadDropdown = () => (
    <DropdownMenu>
       <DropdownMenuTrigger asChild>
           <Button 
               variant="ghost" 
               size="icon" 
               className="rounded-full w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
           >
               <Plus className="w-5 h-5" />
           </Button>
       </DropdownMenuTrigger>
       <DropdownMenuContent 
           align="start" 
           sideOffset={10}
           className="w-48 z-[70] rounded-xl"
       >
           <DropdownMenuItem className="cursor-pointer rounded-xl py-2.5">
               <FileText className="w-4 h-4 mr-2" />
               Upload Document
           </DropdownMenuItem>
           <DropdownMenuItem className="cursor-pointer rounded-xl py-2.5">
               <ImageIcon className="w-4 h-4 mr-2" />
               Upload Image
           </DropdownMenuItem>
       </DropdownMenuContent>
   </DropdownMenu>
);

export function FloatingChatInput({ onExpand, isPanelOpen, marketContext }: FloatingChatInputProps) {
    const { handleComposerSubmit, isBusy } = useChatController();
    const [input, setInput] = useState("");
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState<"connecting" | "listening" | "speaking" | "thinking" | "inactive">("inactive");
    const [micStream, setMicStream] = useState<MediaStream | null>(null);
    
    // Audio volume analysis for orb visualization
    const micVolume = useAudioVolume(micStream, { smoothingTimeConstant: 0.1 });

    const conversation = useConversation({
        onConnect: () => {
             setVoiceStatus("listening");
        },
        onDisconnect: () => {
             setVoiceStatus("inactive");
             setIsVoiceMode(false);
             setMicStream(null);
        },
        onMessage: (message) => {
             const msg = message as { source: "user" | "ai"; message: string };
             if (msg.source === "user") setVoiceStatus("thinking");
             if (msg.source === "ai") setVoiceStatus("speaking");
        },
        onError: (error) => {
             logger.error("Voice Error:", error);
             setVoiceStatus("inactive");
             setIsVoiceMode(false);
             setMicStream(null);
        }
    });

    const startVoiceSession = useCallback(async () => {
         try {
             setVoiceStatus("connecting");
             // Request mic access
             const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
             setMicStream(stream);

             // Start ElevenLabs session
             const token = await fetchConversationToken({}); // Uses default agent ID from API
             if (token) {
                 await conversation.startSession({
                     conversationToken: token,
                 });
             } else {
                 const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
                if (!agentId) {
                    throw new Error("NEXT_PUBLIC_ELEVENLABS_AGENT_ID is not configured");
                }
                await conversation.startSession({ 
                    agentId,
                    connectionType: "webrtc" 
                });
             }
         } catch (err) {
             logger.error("Failed to start voice:", err);
             setVoiceStatus("inactive");
             setIsVoiceMode(false);
             setMicStream(null);
         }
    }, [conversation]);

    const stopVoiceSession = useCallback(async () => {
         await conversation.endSession();
         if (micStream) {
             micStream.getTracks().forEach(track => track.stop());
             setMicStream(null);
         }
         setVoiceStatus("inactive");
    }, [conversation, micStream]);

    const toggleVoiceMode = () => {
        if (isVoiceMode) {
            stopVoiceSession();
            setIsVoiceMode(false);
        } else {
            setIsVoiceMode(true);
            startVoiceSession();
        }
    };
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (conversation.status === "connected") {
                conversation.endSession();
            }
             if (micStream) {
                 micStream.getTracks().forEach(track => track.stop());
             }
        }
    }, [conversation, micStream]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isBusy) return;

        const success = await handleComposerSubmit({ 
            text: input,
            ...(marketContext ? { marketContext } : {}),
        });
        
        if (success !== false) {
             setInput("");
             onExpand();
        }
    };

    // Simple state-based label
    const statusLabel = {
        inactive: "",
        connecting: "Connecting...",
        listening: "Listening...",
        thinking: "Thinking...",
        speaking: "Speaking..."
    }[voiceStatus];

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-[60]">
            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={cn(
                    "relative group rounded-[2rem] bg-card/70 backdrop-blur-xl border border-border/60 shadow-2xl transition-all hover:border-border",
                    isPanelOpen ? "p-1 rounded-full bg-transparent" : "p-2"
                )}
            >
                 <div className="flex items-center gap-2 px-2 min-h-[44px]">
                    {/* Left Side: Upload or Voice Cancel */}
                     {!isVoiceMode ? (
                         <UploadDropdown />
                     ) : (
                         /* Placeholder to keep alignment or could be empty */
                         <div className="w-8 shrink-0" />
                     )}

                    {/* Center: Input or SiriOrb */}
                    <div className="flex-1 flex items-center justify-center relative overflow-hidden h-[44px]">
                        <AnimatePresence mode="wait">
                            {isVoiceMode ? (
                                <motion.div
                                    key="voice-orb"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="absolute inset-0 flex items-center justify-center p-1"
                                >
                                    <SiriOrb 
                                        size="40px" 
                                        colors={{ volume: voiceStatus === "speaking" ? 0.5 : micVolume * 5 }} 
                                    />
                                    <span className={cn(
                                        "ml-3 text-sm font-medium transition-colors duration-300",
                                        voiceStatus === "listening" ? "text-foreground animate-pulse" : "text-muted-foreground"
                                    )}>
                                        {statusLabel}
                                    </span>
                                </motion.div>
                            ) : (
                                <motion.input
                                    key="text-input"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
                                    placeholder="Ask Nex AI to analyze asset..."
                                    className="w-full bg-transparent border-none px-2 text-sm text-foreground focus:outline-none placeholder:text-muted-foreground/60 h-full"
                                    disabled={isBusy}
                                />
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right Side: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleVoiceMode}
                            className={cn(
                                "rounded-full w-8 h-8 transition-colors",
                                isVoiceMode ? "text-destructive hover:text-destructive/90 hover:bg-destructive/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                        >
                             {isVoiceMode ? <X className="w-4 h-4" /> : <AudioLines className="w-4 h-4" />}
                        </Button>

                        {!isVoiceMode && (
                            <Button 
                                size="icon" 
                                onClick={(e) => handleSubmit(e)}
                                disabled={!input.trim() || isBusy}
                                className={cn(
                                    "rounded-full w-8 h-8 transition-all", 
                                    input.trim()
                                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                      : "bg-muted/40 text-muted-foreground/60"
                                )}
                            >
                                <ArrowUp className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
