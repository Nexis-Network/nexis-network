"use client";

import { ArrowUp, BookOpen } from "lucide-react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
} from "motion/react";
import { JSX, useEffect, useMemo } from "react";
import { useRef, useState } from "react";
import React from "react";

import { cn } from "@/lib/utils";

// Animation constants
const ANIMATION_DURATION = 0.1;
const PLACEHOLDER_ROTATION_MS = 2000;
const TYPE_INTERVAL_MS = 30;
const PLACEHOLDER_PROMPTS = [
  "Swap 0.5 ETH for USDC and bridge to Arbitrum...",
  "Find the highest yield for stablecoins on Base...",
  "Analyze the slippage on my last trade...",
  "Set a recurring buy for SOL every Monday...",
];

// Component for animated placeholder text with typewriter cycle
const AnimatedPlaceholder = () => {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    let charIndex = 0;
    let typingTimer: ReturnType<typeof setInterval> | null = null;
    let rotateTimer: ReturnType<typeof setTimeout> | null = null;

    setDisplayText("");

    typingTimer = setInterval(() => {
      const phrase = PLACEHOLDER_PROMPTS[phraseIndex];
      if (charIndex <= phrase.length) {
        setDisplayText(phrase.slice(0, charIndex));
        charIndex += 1;
      } else if (typingTimer) {
        clearInterval(typingTimer);
        rotateTimer = setTimeout(
          () => setPhraseIndex((prev) => (prev + 1) % PLACEHOLDER_PROMPTS.length),
          PLACEHOLDER_ROTATION_MS,
        );
      }
    }, TYPE_INTERVAL_MS);

    return () => {
      if (typingTimer) clearInterval(typingTimer);
      if (rotateTimer) clearTimeout(rotateTimer);
    };
  }, [phraseIndex]);

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={phraseIndex}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: ANIMATION_DURATION }}
        className="text-foreground/20 pointer-events-none absolute flex items-center gap-1"
      >
        <span>{displayText}</span>
        <span className="inline-block h-5 w-0.5 animate-pulse bg-foreground/30" aria-hidden />
      </motion.p>
    </AnimatePresence>
  );
};

// Message type definition
interface ChatMessage {
  id: number;
  message: string;
  isFromUser: boolean;
}

const Ai02Landing = () => {
  // Input and UI state
  const [userInput, setUserInput] = useState("");
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [isSubmit, setIsSubmit] = useState(false);

  // Chat messages state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  // Deep Mind state
  const [isDeepMindMode, setIsDeepMindMode] = useState(false);

  // Handle message submission
  const handleMessageSubmit = async () => {
    if (isSubmit) {
      setIsSubmit(false);
      return;
    }

    if (userInput.trim() === "") {
      return;
    }

    setIsSubmit(true);
    const currentInput = userInput;
    setUserInput("");

    // Add user message
    const userMessage: ChatMessage = {
      id: chatMessages.length + 1,
      message: currentInput,
      isFromUser: true,
    };
    setChatMessages([...chatMessages, userMessage]);

    // Show thinking state
    setIsThinking(true);

    // Wait before showing response
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Add bot response
    const botMessage: ChatMessage = {
      id: chatMessages.length + 2,
      message: "Welcome to Nex-T1",
      isFromUser: false,
    };
    setChatMessages((prev) => [...prev, botMessage]);

    setIsThinking(false);
    setIsSubmit(false);
  };

  return (
    <MotionConfig
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
    >
      <div className="relative mx-auto flex h-full w-full max-w-3xl items-center justify-center px-2 py-4 sm:px-4">
        {/* Chat Messages Container */}
        <motion.div className="no-scroll flex h-full max-w-2xl flex-1 flex-col overflow-scroll scroll-smooth px-3 py-6 justify-center items-center">
          {chatMessages.map((message, messageId) => (
            <motion.div
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              key={messageId}
              className={cn(
                "bg-muted my-2 w-fit max-w-xs wrap-break-word rounded-2xl px-4 py-2",
                message.isFromUser ? "self-end" : "self-start",
              )}
            >
              {message.message}
            </motion.div>
          ))}
          {isThinking && (
            <motion.div
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{ delay: 0.25 }}
              className="bg-muted/50 my-2 w-fit max-w-xs self-start rounded-2xl px-4 py-2"
            >
              <TextShimmer>Thinking...</TextShimmer>
            </motion.div>
          )}
        </motion.div>

        {/* Input Container */}
        <div
          ref={inputContainerRef}
          className="rounded-t-4xl w-full max-w-3xl px-3 pb-3"
        >
          <div className="relative rounded-2xl p-px bg-[radial-gradient(circle_220px_at_50%_-40px,#f4f4f4,#0c0d0d)]">
            <div className="bg-[#0f0f10]/90 rounded-2xl border dark:border-white/10 backdrop-blur-md relative overflow-hidden">
              <span className="pointer-events-none absolute -left-2 -top-2 h-2 w-2 rounded-full bg-white shadow-[0_0_10px_#ffffff] animate-[ping_2s_linear_infinite]" />
              <div className="bg-background/40 backdrop-blur-md outline-border relative rounded-2xl outline dark:outline-[#181818]!">
                {/* Text Input Area */}
                <div className="relative">
                  <textarea
                    value={userInput}
                    placeholder=""
                    className="field-sizing-content pr-15 max-h-52 w-full resize-none rounded-none bg-transparent! p-4 text-base! leading-[1.2] shadow-none focus-visible:outline-0 focus-visible:ring-0"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleMessageSubmit();
                      }
                    }}
                    onChange={(e) => {
                      setUserInput(e.target.value);
                    }}
                  />
                  {!userInput && (
                    <div className="pointer-events-none absolute left-0 top-0 h-full w-full p-4">
                      <AnimatedPlaceholder />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleMessageSubmit()}
                  className="hover:bg-muted hover:border-border absolute right-2 top-2 flex size-10 items-center justify-center rounded-xl border border-transparent p-2"
                >
                  {!isSubmit ? (
                    <ArrowUp className="size-5" />
                  ) : (
                    <div className="size-3.5 rounded-[4px] bg-current"></div>
                  )}
                </button>
              </div>
              <div className="flex h-10 items-center justify-between px-1.5">
                <button
                  onClick={() => setIsDeepMindMode(!isDeepMindMode)}
                  className={cn(
                    "text-muted-foreground hover:bg-background/50 hover:text-foreground flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all duration-100 active:scale-95",
                    isDeepMindMode && "text-foreground",
                  )}
                >
                  <BookOpen className="size-4" />

                  {isDeepMindMode ? (
                    <TextShimmer className="text-xs font-medium">
                      Deep Thinking Now
                    </TextShimmer>
                  ) : (
                    <span className="text-xs font-medium">Try Deep Thinking</span>
                  )}
                </button>
                <p className="text-muted-foreground/50 pr-2 text-xs">
                  AGI is here
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
};

export type TextShimmerProps = {
  children: UntypedJson;
  as?: React.ElementType;
  className?: string;
  duration?: number;
  spread?: number;
};

function TextShimmerComponent({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) {
  const MotionComponent = motion.create(
    Component as keyof JSX.IntrinsicElements,
  );

  const dynamicSpread = useMemo(() => {
    return children.length * spread;
  }, [children, spread]);

  return (
    <MotionComponent
      className={cn(
        "relative inline-block bg-size-[250%_100%,auto] bg-clip-text",
        "text-transparent [--base-color:#a1a1aa] [--base-gradient-color:#000]",
        "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
        "dark:[--base-color:#71717a] dark:[--base-gradient-color:#ffffff] dark:[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]",
        className,
      )}
      initial={{ backgroundPosition: "100% center" }}
      animate={{ backgroundPosition: "0% center" }}
      transition={{
        repeat: Infinity,
        duration,
        ease: "linear",
      }}
      style={
        {
          "--spread": `${dynamicSpread}px`,
          backgroundImage: `var(--bg), linear-gradient(var(--base-color), var(--base-color))`,
        } as React.CSSProperties
      }
    >
      {children}
    </MotionComponent>
  );
}

export const TextShimmer = React.memo(TextShimmerComponent);

export { Ai02Landing };
