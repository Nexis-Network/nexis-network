"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2Icon, PhoneIcon, PhoneOffIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { configureLivekitLogging } from "@/lib/livekit/logging";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import dynamic from "next/dynamic";
const Orb = dynamic(
  () => import("@/components/ui/orb").then((mod) => mod.Orb),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 w-40 rounded-full bg-muted/20 animate-pulse" />
    ),
  },
);
import { ShimmeringText } from "@/components/ui/shimmering-text";
import { usePreferredVoiceId } from "@/lib/hooks/user/use-preferred-voice";
import { useProfileAggregate } from "@/hooks/user/use-profile-aggregate";
import { fetchConversationToken } from "@/lib/elevenlabs/token";

import { logger } from "@/lib/logger";
export type SupportAgentConfig = {
  agentId: string;
  name: string;
  description?: string;
};

type AgentState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "disconnecting"
  | null;

type VoiceSupportAgentCardProps = {
  agent?: SupportAgentConfig;
  className?: string;
  agentId?: string | null;
};

const FALLBACK_AGENT: SupportAgentConfig = {
  agentId: "",
  name: "Customer Support",
  description: "Tap to start voice chat",
};

export function VoiceSupportAgentCard({
  agent,
  className,
  agentId: propAgentId,
}: VoiceSupportAgentCardProps) {
  const config = useMemo(() => {
    return {
      ...FALLBACK_AGENT,
      ...agent,
      agentId: propAgentId ?? agent?.agentId ?? FALLBACK_AGENT.agentId,
    };
  }, [agent, propAgentId]);

  const workletPaths = useMemo(
    () => ({
      rawAudioProcessor: "/audio-worklets/raw-audio-processor.js",
      audioConcatProcessor: "/audio-worklets/audio-concat-processor.js",
    }),
    [],
  );

  const { data: profile } = useProfileAggregate();
  const userName = useMemo(
    () =>
      profile?.identity?.username ??
      profile?.identity?.displayName ??
      undefined,
    [profile],
  );

  const [agentState, setAgentState] = useState<AgentState>("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const agentStateRef = useRef<AgentState>("disconnected");
  const safeEndSessionRef = useRef<() => Promise<void>>(() =>
    Promise.resolve(),
  );
  const isStartingRef = useRef(false);

  const conversation = useConversation({
    workletPaths,
    onConnect: () => logger.debug("Connected"),
    onDisconnect: () => {
      logger.debug("Disconnected");
      setAgentState("disconnected");
      agentStateRef.current = "disconnected";
    },
    onMessage: (message) => logger.debug("Message:", message),
    onError: (error) => {
      logger.error("Error:", error);
      const previousAgentState = agentStateRef.current;
      setAgentState("disconnected");
      agentStateRef.current = "disconnected";

      if (previousAgentState === "connected") {
        setErrorMessage("The call ended unexpectedly. Please try again.");
        void safeEndSessionRef.current();
      }
    },
  });

  const { data: preferredVoiceId } = usePreferredVoiceId();

  const safeEndSession = useCallback(async () => {
    if (conversation.status === "disconnected") {
      return;
    }

    try {
      await conversation.endSession();
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        logger.warn("voice_support_end_session_failed", error);
      }
    }
  }, [conversation]);

  useEffect(() => {
    safeEndSessionRef.current = safeEndSession;
  }, [safeEndSession]);

  useEffect(() => {
    configureLivekitLogging();
  }, []);

  useEffect(() => {
    agentStateRef.current = agentState;
  }, [agentState]);

  useEffect(() => {
    return () => {
      void safeEndSessionRef.current();
    };
  }, []);

  const startConversation = useCallback(async () => {
    if (isStartingRef.current) {
      return;
    }

    if (conversation.status !== "disconnected") {
      return;
    }

    isStartingRef.current = true;
    try {
      setErrorMessage(null);
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const resolvedVoiceId = preferredVoiceId ?? null;

      let conversationToken: string | null = null;
      if (config.agentId) {
        try {
          conversationToken = await fetchConversationToken({
            agentId: config.agentId,
            voiceId: resolvedVoiceId,
          });
        } catch (error) {
          logger.error("Error fetching conversation token:", error);
        }
      }

      const baseOptions = {
        connectionType: "webrtc" as const,
        ...(userName ? { dynamicVariables: { user_name: userName } } : {}),
        onStatusChange: (status: { status: AgentState | null }) => {
          setAgentState(status.status);
          agentStateRef.current = status.status;
        },
      };

      let sessionOptions: Parameters<typeof conversation.startSession>[0];
      if (conversationToken) {
        sessionOptions = {
          ...baseOptions,
          conversationToken,
        };
      } else if (config.agentId) {
        sessionOptions = {
          ...baseOptions,
          agentId: config.agentId,
        };
      } else {
        throw new Error("No ElevenLabs agent configured.");
      }

      await conversation.startSession(sessionOptions);
    } catch (error) {
      logger.error("Error starting conversation:", error);
      await safeEndSession();
      setAgentState("disconnected");
      agentStateRef.current = "disconnected";
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setErrorMessage(
          "Please enable microphone permissions in your browser.",
        );
      } else {
        setErrorMessage("Unable to start the call. Please try again.");
      }
    } finally {
      isStartingRef.current = false;
    }
  }, [
    config.agentId,
    conversation,
    preferredVoiceId,
    safeEndSession,
    userName,
  ]);

  const handleCall = useCallback(() => {
    if (
      agentStateRef.current === "connecting" ||
      agentStateRef.current === "disconnecting"
    ) {
      return;
    }

    if (agentState === "disconnected" || agentState === null) {
      agentStateRef.current = "connecting";
      setAgentState("connecting");
      void startConversation();
    } else if (agentState === "connected") {
      agentStateRef.current = "disconnecting";
      setAgentState("disconnecting");
      void safeEndSession().finally(() => {
        agentStateRef.current = "disconnected";
        setAgentState("disconnected");
      });
    }
  }, [agentState, safeEndSession, startConversation]);

  const isCallActive = agentState === "connected";
  const isTransitioning =
    agentState === "connecting" || agentState === "disconnecting";

  const getInputVolume = useCallback(() => {
    const rawValue = conversation.getInputVolume?.() ?? 0;
    return Math.min(1.0, Math.pow(rawValue, 0.5) * 2.5);
  }, [conversation]);

  const getOutputVolume = useCallback(() => {
    const rawValue = conversation.getOutputVolume?.() ?? 0;
    return Math.min(1.0, Math.pow(rawValue, 0.5) * 2.5);
  }, [conversation]);

  return (
    <Card
      className={cn(
        "flex h-[400px] w-full flex-col items-center justify-center overflow-hidden p-6",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative size-32">
          <div className="bg-muted relative h-full w-full rounded-full p-1 shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
            <div className="bg-background h-full w-full overflow-hidden rounded-full shadow-[inset_0_0_12px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_12px_rgba(0,0,0,0.3)]">
              <Orb
                className="h-full w-full"
                colors={["#12AAFF", "#4ECDC4"]}
                volumeMode="manual"
                getInputVolume={getInputVolume}
                getOutputVolume={getOutputVolume}
                agentState={
                  agentState === "disconnected"
                    ? null
                    : agentState === "connecting"
                      ? "thinking"
                      : agentState === "connected"
                        ? "talking"
                        : "listening"
                }
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-xl font-regular">{config.name}</h2>
          <AnimatePresence mode="wait">
            {errorMessage ? (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-destructive text-sm"
              >
                {errorMessage}
              </motion.p>
            ) : agentState === "disconnected" || agentState === null ? (
              <motion.p
                key="disconnected"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-muted-foreground text-sm"
              >
                {config.description}
              </motion.p>
            ) : (
              <motion.div
                key="status"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-2"
              >
                <div
                  className={cn(
                    "h-2 w-2 rounded-full transition-all duration-300",
                    agentState === "connected" && "bg-green-500",
                    isTransitioning && "bg-primary/60 animate-pulse",
                  )}
                />
                <span className="text-sm capitalize">
                  {isTransitioning ? (
                    <ShimmeringText text={agentState} />
                  ) : (
                    <span className="text-green-600">Connected</span>
                  )}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          onClick={handleCall}
          disabled={isTransitioning}
          size="icon"
          variant={isCallActive ? "secondary" : "default"}
          className="h-12 w-12 rounded-full"
        >
          <AnimatePresence mode="wait">
            {isTransitioning ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, rotate: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{
                  rotate: { duration: 1, repeat: Infinity, ease: "linear" },
                }}
              >
                <Loader2Icon className="h-5 w-5" />
              </motion.div>
            ) : isCallActive ? (
              <motion.div
                key="end"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <PhoneOffIcon className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div
                key="start"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <PhoneIcon className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </Card>
  );
}
