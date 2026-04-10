"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Volume2, VolumeX } from "lucide-react";
import {
  useConversation,
  type Status as ConversationStatus,
} from "@elevenlabs/react";

import {
  BarVisualizer,
  type AgentState as VoiceAgentState,
  useAudioVolume,
} from "@/components/ui/bar-visualizer";
import { configureLivekitLogging } from "@/lib/livekit/logging";
import { cn } from "@/lib/utils";
import { useProfileAggregate } from "@/hooks/user/use-profile-aggregate";

import { logger } from "@/lib/logger";
import {
  COMPOSER_EMPHASIZED_ICON_BUTTON_CLASS,
  COMPOSER_GLASS_CONTROL_ICON_COLOR_CLASS,
  COMPOSER_ICON_CLASS,
} from "@/components/chat-composer/composer-theme";
type VoiceRenderProps = {
  isPanelOpen: boolean;
  panel: ReactNode | null;
  badge: ReactNode | null;
  muteButton: ReactNode | null;
  toggleButton: ReactNode;
  voiceError: string | null;
};

type VoiceModuleProps = {
  voiceAgentId: string;
  voiceId?: string | null;
  userId?: string | null;
  children: (props: VoiceRenderProps) => ReactNode;
};

const VoiceStateBadge = ({ state }: { state: VoiceAgentState }) => {
  const meta: Record<
    VoiceAgentState,
    { label: string; dot: string; text: string }
  > = {
    connecting: {
      label: "Connecting",
      dot: "bg-sky-400",
      text: "text-sky-400",
    },
    initializing: {
      label: "Initializing",
      dot: "bg-sky-400",
      text: "text-sky-400",
    },
    listening: {
      label: "Listening",
      dot: "bg-emerald-400",
      text: "text-emerald-400",
    },
    thinking: {
      label: "Thinking",
      dot: "bg-violet-400",
      text: "text-violet-400",
    },
    speaking: { label: "Speaking", dot: "bg-sky-400", text: "text-sky-400" },
  };

  const c = meta[state];

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md border border-border/0 px-1.5 py-0.5 text-sm",
        "bg-background/0",
      )}
      aria-live="polite"
    >
      <span className={cn("h-2 w-2 rounded-full", c.dot)} />
      <span className={cn("hidden sm:inline text-[11px] font-medium", c.text)}>
        {c.label}
      </span>
    </div>
  );
};

export function VoiceModule({
  voiceAgentId,
  voiceId,
  userId,
  children,
}: VoiceModuleProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const voiceIcon = (
    <Image
      src={
        isDark
          ? "/assets/chat-composer-icons/voice-mode-dark.svg"
          : "/assets/chat-composer-icons/voice-mode-light.svg"
      }
      alt=""
      width={20}
      height={20}
      className={COMPOSER_ICON_CLASS}
    />
  );

  if (!voiceAgentId) {
    return children({
      isPanelOpen: false,
      panel: null,
      badge: null,
      muteButton: null,
      toggleButton: (
        <button
          type="button"
          disabled
          className={cn(
            COMPOSER_EMPHASIZED_ICON_BUTTON_CLASS,
            COMPOSER_GLASS_CONTROL_ICON_COLOR_CLASS,
            "opacity-40",
          )}
          title="Voice agent unavailable"
        >
          {voiceIcon}
        </button>
      ),
      voiceError: null,
    });
  }

  const hasVoiceAgent = Boolean(voiceAgentId);
  return (
    <VoiceModuleInternal
      hasVoiceAgent={hasVoiceAgent}
      voiceAgentId={voiceAgentId}
      voiceId={voiceId}
      userId={userId}
      render={children}
      voiceIcon={voiceIcon}
    />
  );
}

type VoiceModuleInternalProps = {
  hasVoiceAgent: boolean;
  voiceAgentId: string;
  voiceId?: string | null;
  userId?: string | null;
  render: VoiceModuleProps["children"];
  voiceIcon: ReactNode;
};

function VoiceModuleInternal({
  hasVoiceAgent,
  voiceAgentId,
  voiceId,
  userId,
  render,
  voiceIcon,
}: VoiceModuleInternalProps) {
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);
  const [voiceSessionActive, setVoiceSessionActive] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceAgentState, setVoiceAgentState] =
    useState<VoiceAgentState>("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const speakingTimeoutRef = useRef<number | null>(null);
  const initTimeoutRef = useRef<number | null>(null);
  const firstAiMessageRef = useRef<boolean>(true);
  const isStartingVoiceRef = useRef(false);

  const preferredVoiceId = useMemo(() => {
    if (!voiceId) return undefined;
    const trimmed = voiceId.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, [voiceId]);

  const { data: profile } = useProfileAggregate();
  const userName = useMemo(
    () =>
      profile?.identity?.username ??
      profile?.identity?.displayName ??
      undefined,
    [profile],
  );

  const workletPaths = useMemo(
    () => ({
      rawAudioProcessor: "/audio-worklets/raw-audio-processor.js",
      audioConcatProcessor: "/audio-worklets/audio-concat-processor.js",
    }),
    [],
  );

  const conversation = useConversation({
    workletPaths,
    onConnect: () => {
      setVoiceSessionActive(true);
      setVoiceError(null);
      setVoiceAgentState("initializing");
      if (initTimeoutRef.current) window.clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    },
    onDisconnect: () => {
      setVoiceSessionActive(false);
      setVoiceAgentState("connecting");
      try {
        window.dispatchEvent(
          new CustomEvent("nex:voiceModeChanged", {
            detail: { active: false },
          }),
        );
      } catch {}
    },
    onMessage: (message) => {
      const msg = message as { source: "user" | "ai"; message: string };
      if (msg.source === "user") setVoiceAgentState("thinking");
      if (msg.source === "ai") {
        setVoiceAgentState("speaking");
        if (speakingTimeoutRef.current)
          window.clearTimeout(speakingTimeoutRef.current);
        const delay = firstAiMessageRef.current ? 3500 : 2000;
        speakingTimeoutRef.current = window.setTimeout(
          () => setVoiceAgentState("listening"),
          delay,
        );
        firstAiMessageRef.current = false;
        if (initTimeoutRef.current) {
          window.clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }
      }
    },
    micMuted: isMuted,
    onError: (error: UntypedJson) => {
      const err = error instanceof Error ? error : new Error(String(error));
      setVoiceSessionActive(false);
      setVoiceAgentState("connecting");
      setVoiceError(err.message || "Unable to start voice call.");
      try {
        window.dispatchEvent(
          new CustomEvent("nex:voiceModeChanged", {
            detail: { active: false },
          }),
        );
      } catch {}
    },
  });
  useEffect(() => {
    configureLivekitLogging();
  }, []);

  useEffect(() => {
    try {
      window.dispatchEvent(
        new CustomEvent("nex:voiceAgentStateChanged", {
          detail: {
            state: voiceAgentState,
            active: voicePanelOpen,
            sessionActive: voiceSessionActive,
          },
        }),
      );
    } catch {}
  }, [voiceAgentState, voicePanelOpen, voiceSessionActive]);
  const fetchConversationToken = useCallback(async (): Promise<
    string | null
  > => {
    if (!voiceAgentId) {
      return null;
    }

    try {
      const response = await fetch("/api/support/elevenlabs/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ agentId: voiceAgentId }),
        cache: "no-store",
      });

      if (!response.ok) {
        if (process.env.NODE_ENV !== "production") {
          let errorBody: string | null = null;
          try {
            errorBody = await response.text();
          } catch (error) {
            logger.error("voice_token_body_read_failed", error);
          }
          logger.error(
            "voice_token_fetch_failed",
            response.status,
            errorBody ?? undefined,
          );
        }
        return null;
      }

      const payload = (await response.json().catch(() => ({}))) as {
        token?: string | null;
      };
      return payload?.token ?? null;
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        logger.error("voice_token_request_failed", error);
      }
      return null;
    }
  }, [voiceAgentId]);

  const micVolume = useAudioVolume(micStream, {
    fftSize: 32,
    smoothingTimeConstant: 0,
  });

  const lastSilenceStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!voiceSessionActive || voiceAgentState !== "listening") {
      lastSilenceStartRef.current = null;
      return;
    }

    const now = Date.now();
    const isQuiet = micVolume < 0.02; // tuned low to catch near-silence

    if (isQuiet) {
      if (lastSilenceStartRef.current === null) {
        lastSilenceStartRef.current = now;
      } else if (now - lastSilenceStartRef.current >= 2000) {
        // User has been quiet for ~2s: hint the agent to respond sooner
        try {
          conversation.sendUserActivity();
        } catch {
          /* noop */
        }
        setVoiceAgentState("thinking");
        lastSilenceStartRef.current = null;
      }
    } else {
      lastSilenceStartRef.current = null;
    }
  }, [conversation, micVolume, voiceAgentState, voiceSessionActive]);

  useEffect(() => {
    const outputLevel =
      voiceAgentState === "speaking"
        ? Math.min(1, 0.6 + micVolume * 0.4)
        : voiceAgentState === "thinking"
          ? 0.2
          : 0.05;
    try {
      window.dispatchEvent(
        new CustomEvent("nex:voiceVolumesChanged", {
          detail: { input: Math.min(1, micVolume), output: outputLevel },
        }),
      );
    } catch {}
  }, [micVolume, voiceAgentState]);

  useEffect(() => {
    if (!micStream) return;
    micStream.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
    });
  }, [isMuted, micStream]);

  const startVoiceSession = useCallback(async () => {
    if (isStartingVoiceRef.current) {
      return;
    }
    isStartingVoiceRef.current = true;
    if (!hasVoiceAgent) {
      setVoiceError("Voice agent unavailable.");
      setVoicePanelOpen(false);
      isStartingVoiceRef.current = false;
      return;
    }

    let micRequestStream: MediaStream | null = null;

    try {
      // Request mic access first for better UX and permission consistency
      micRequestStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setMicStream(micRequestStream);
      setVoiceError(null);

      // Notify listeners that voice mode is active
      try {
        window.dispatchEvent(
          new CustomEvent("nex:voiceModeChanged", { detail: { active: true } }),
        );
      } catch {}

      const conversationToken = await fetchConversationToken();
      const sessionOverrides = preferredVoiceId
        ? { overrides: { tts: { voiceId: preferredVoiceId } } }
        : undefined;
      const dynamicVariables = userName
        ? { dynamicVariables: { user_name: userName } }
        : undefined;
      const baseOptions = {
        connectionType: "webrtc" as const,
        onStatusChange: (status: { status: ConversationStatus }) => {
          if (status.status === "connecting") setVoiceAgentState("connecting");
          if (status.status === "connected") setVoiceAgentState("listening");
        },
        ...(userId ? { userId } : {}),
        ...(dynamicVariables ?? {}),
        ...(sessionOverrides ?? {}),
      };

      const sessionOptions = conversationToken
        ? { ...baseOptions, conversationToken }
        : { ...baseOptions, agentId: voiceAgentId };

      await conversation.startSession(sessionOptions);
    } catch (err) {
      logger.error("Error starting voice session:", err);
      const fallbackMessage =
        err instanceof Error && err.message
          ? err.message
          : "Microphone or connection error.";
      setVoiceError(fallbackMessage);
      setVoicePanelOpen(false);
      setVoiceSessionActive(false);
      setVoiceAgentState("connecting");
      if (micRequestStream) {
        micRequestStream.getTracks().forEach((track) => track.stop());
      }
      setMicStream((current) => {
        if (current && current !== micRequestStream) {
          current.getTracks().forEach((track) => track.stop());
        }
        return null;
      });
      try {
        window.dispatchEvent(
          new CustomEvent("nex:voiceModeChanged", {
            detail: { active: false },
          }),
        );
      } catch {}
    } finally {
      isStartingVoiceRef.current = false;
    }
  }, [
    conversation,
    fetchConversationToken,
    hasVoiceAgent,
    preferredVoiceId,
    userId,
    userName,
    voiceAgentId,
  ]);

  const endVoiceSession = useCallback(async () => {
    if (isStartingVoiceRef.current) {
      isStartingVoiceRef.current = false;
    }
    if (conversation.status !== "disconnected") {
      try {
        await conversation.endSession();
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          logger.warn("voice_session_end_failed", error);
        }
      }
    }
    setVoiceSessionActive(false);
    setVoiceAgentState("connecting");
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
    }
    setMicStream(null);
    setIsMuted(false);
    firstAiMessageRef.current = true;
    if (speakingTimeoutRef.current) {
      window.clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }
    if (initTimeoutRef.current) {
      window.clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
  }, [conversation, micStream]);

  const handleVoiceToggle = useCallback(() => {
    if (!hasVoiceAgent) return;
    if (voiceSessionActive) {
      endVoiceSession();
      setVoicePanelOpen(false);
      return;
    }
    if (voiceError) {
      setVoiceError(null);
    }
    setVoicePanelOpen(true);
    startVoiceSession();
  }, [
    endVoiceSession,
    hasVoiceAgent,
    startVoiceSession,
    voiceError,
    voiceSessionActive,
  ]);

  const handleMicToggle = useCallback(() => {
    const muted = !isMuted;
    setIsMuted(muted);
    if (!muted) {
      setVoiceAgentState("listening");
    }
  }, [isMuted]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (conversation.status !== "disconnected") {
        conversation.endSession().catch(() => {});
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [conversation]);

  useEffect(() => {
    if (voicePanelOpen && !voiceSessionActive) {
      // Delayed init indicator
      initTimeoutRef.current = window.setTimeout(() => {
        if (!voiceSessionActive) {
          setVoiceAgentState("initializing");
        }
      }, 600);
    }
  }, [voicePanelOpen, voiceSessionActive]);

  const voicePanel = (
    <div className="mb-2 w-full rounded-none border-b border-white/10 bg-transparent p-0">
      <BarVisualizer
        state={voiceAgentState}
        mediaStream={micStream}
        className="h-16 w-full rounded-none bg-transparent"
      />
    </div>
  );

  const toggleButton = (
    <button
      type="button"
      onClick={handleVoiceToggle}
      className={cn(
        COMPOSER_EMPHASIZED_ICON_BUTTON_CLASS,
        COMPOSER_GLASS_CONTROL_ICON_COLOR_CLASS,
        voiceSessionActive ? "text-sky-400" : "",
      )}
      aria-pressed={voiceSessionActive}
      aria-label={
        voiceSessionActive ? "End voice session" : "Start voice session"
      }
    >
      {voiceIcon}
    </button>
  );

  const muteButton = (
    <button
      type="button"
      onClick={handleMicToggle}
      className={cn(
        COMPOSER_EMPHASIZED_ICON_BUTTON_CLASS,
        isMuted ? "text-rose-500" : COMPOSER_GLASS_CONTROL_ICON_COLOR_CLASS,
      )}
      aria-pressed={isMuted}
      aria-label={isMuted ? "Unmute" : "Mute"}
    >
      {isMuted ? (
        <VolumeX className={COMPOSER_ICON_CLASS} />
      ) : (
        <Volume2 className={COMPOSER_ICON_CLASS} />
      )}
    </button>
  );

  const voiceModeActive = voicePanelOpen;

  return (
    <>
      {render({
        isPanelOpen: voicePanelOpen,
        panel: voicePanelOpen ? voicePanel : null,
        badge: voiceModeActive ? (
          <VoiceStateBadge state={voiceAgentState} />
        ) : null,
        muteButton: voiceModeActive ? muteButton : null,
        toggleButton,
        voiceError,
      })}
    </>
  );
}
