import type { ReactNode } from "react";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { ArrowRight, Clock, ExternalLink, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCompleteAgentCode } from "@/lib/agent-code-extractor";
import {
  fadeIn,
  fadeInScale,
  pulseVariants,
  springTransition,
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/animations";
import type { AgentType } from "@/lib/types";
import { TextEffect, TextRoll } from "@/components/visuals/effects/effects";
import { AgentCodePreview } from "./agent-code-preview";

function LoadingState({
  agent,
  elapsedTime = 0,
}: {
  agent: AgentType;
  elapsedTime?: number;
}) {
  // Calculate progress percentage
  const progress = Math.min(
    (elapsedTime / (agent.averageTime || 30)) * 100,
    100,
  );

  return (
    <motion.div
      animate="animate"
      className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center"
      exit="exit"
      initial="initial"
      variants={{
        initial: { opacity: 0 },
        animate: {
          opacity: 1,
          transition: {
            duration: 0.4,
            ease: [0.32, 0.72, 0, 1],
            when: "beforeChildren",
            staggerChildren: 0.1,
          },
        },
        exit: {
          opacity: 0,
          transition: {
            duration: 0.2,
            ease: [0.32, 0.72, 0, 1],
            when: "afterChildren",
            staggerChildren: 0.05,
            staggerDirection: -1,
          },
        },
      }}
    >
      <div className="w-full max-w-2xl space-y-8">
        {/* Header Section */}
        <motion.div className="space-y-1" variants={staggerItemVariants}>
          <div className="space-y-1">
            <motion.h3
              className="relative mx-auto mb-1 w-fit rounded-full bg-blue-600 px-1.5 font-medium text-[10px] text-white tracking-wide shadow-[0_1px_2px_rgba(0,0,0,0.15),_inset_0_1px_0.5px_rgba(255,255,255,0.2),_0_-0.5px_1px_rgba(0,0,0,0.08)_inset,_0_0_0_1px_rgba(0,0,0,0.08)_inset]"
              variants={fadeIn}
            >
              <span className="relative z-10">Agent Pattern</span>
            </motion.h3>

            <TextRoll className="font-bold text-lg lg:text-3xl">{`${agent.name}`}</TextRoll>
          </div>
          {/* Tools & Time */}
          <motion.div
            className="inline-flex min-w-24 items-center gap-3 rounded-full border border-blue-100 p-1 px-1.5 font-medium text-xs"
            transition={springTransition}
            whileHover={{ y: -2 }}
          >
            <CircularProgress progress={progress} size={30} strokeWidth={2}>
              <motion.div
                animate={{ rotate: 360 }}
                className="size-5 text-blue-600"
                transition={{
                  duration: 3,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
              >
                <svg className="h-full w-full" fill="none" viewBox="0 0 24 24">
                  <motion.path
                    animate={{ pathLength: 1 }}
                    className="drop-shadow-sm"
                    d="M12 4.75v1.5M17.127 6.873l-1.061 1.061M19.25 12h-1.5M17.127 17.127l-1.061-1.061M12 17.75v1.5M7.873 17.127l1.061-1.061M4.75 12h1.5M7.873 6.873l1.061 1.061"
                    initial={{ pathLength: 0 }}
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    transition={{
                      duration: 1.5,
                      ease: "easeInOut",
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                  />
                </svg>
              </motion.div>
            </CircularProgress>
            <div className="font-medium text-blue-600 text-sm">
              {Math.round(progress)}%
            </div>

            <span className="font-medium text-neutral-800 text-sm">
              Estimated Time
            </span>
            <div className="h-1 w-1 rounded-full bg-blue-200" />
            <span className="flex items-center font-medium text-blue-600 text-sm">
              <Clock className="mr-1.5 h-4 w-4 text-blue-500" />
              {agent.averageTime}s
            </span>
          </motion.div>
        </motion.div>

        {/* Progress Section */}
        <motion.div className="w-full" variants={staggerItemVariants}>
          <motion.div
            className="overflow-hidden rounded-2xl border border-neutral-100/80 bg-white/95 shadow-sm transition-all duration-300 hover:shadow-md"
            variants={fadeInScale}
          >
            {/* Card Header */}
            <div className="border-neutral-100 border-b bg-neutral-50/50 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                <div className="font-medium text-neutral-700 text-xs sm:text-sm">
                  Agent Details
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-4 text-left sm:p-6">
              <motion.div
                animate="animate"
                className="space-y-6"
                initial="initial"
                variants={staggerContainerVariants}
              >
                {agent.description && (
                  <motion.div
                    className="space-y-2"
                    variants={staggerItemVariants}
                  >
                    <h4 className="font-medium text-neutral-500 text-xs">
                      Description
                    </h4>
                    <p className="text-neutral-600 text-xs leading-relaxed sm:text-sm">
                      {agent.description}
                    </p>
                  </motion.div>
                )}

                {agent.capabilities && (
                  <motion.div
                    className="space-y-3"
                    variants={staggerItemVariants}
                  >
                    <h4 className="font-medium text-neutral-500 text-xs">
                      Capabilities
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {agent.capabilities.map((capability, index) => (
                        <motion.div
                          className="group flex items-center gap-2 rounded-full border border-neutral-200/80 bg-neutral-50 px-2.5 py-1 text-neutral-600 text-xs transition-colors duration-200 hover:border-sky-500/20 hover:bg-sky-500/10 hover:text-blue-600"
                          key={index}
                          variants={staggerItemVariants}
                        >
                          <span className="size-1 rounded-full bg-current" />
                          <span>{capability}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function EmptyState({ agent }: { agent: AgentType }) {
  return (
    <motion.div
      animate="animate"
      exit="exit"
      initial="initial"
      variants={{
        initial: { opacity: 0 },
        animate: {
          opacity: 1,
          transition: {
            duration: 0.4,
            ease: [0.32, 0.72, 0, 1],
            when: "beforeChildren",
            staggerChildren: 0.1,
          },
        },
        exit: {
          opacity: 0,
          transition: {
            duration: 0.2,
            ease: [0.32, 0.72, 0, 1],
            when: "afterChildren",
            staggerChildren: 0.05,
            staggerDirection: -1,
          },
        },
      }}
    >
      <Card className="mt-1 space-y-8 rounded-2xl border-none p-0 pt-1 ">
        <div className="space-y-6 p-4">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div>
                <div className="flex items-center gap-2 pb-1">
                  <div className="relative rounded-full bg-blue-600 px-1.5 py-[2px] font-medium text-[10px] text-white tracking-wide shadow-[0_1px_2px_rgba(0,0,0,0.15),_inset_0_1px_0.5px_rgba(255,255,255,0.2),_0_-0.5px_1px_rgba(0,0,0,0.08)_inset,_0_0_0_1px_rgba(0,0,0,0.08)_inset]">
                    <span className="relative z-10">Agent</span>
                  </div>
                  <div
                    className="flex items-center gap-1 font-medium text-sm lg:font-regular lg:text-xl"
                    key={agent.name}
                  >
                    <TextEffect>{agent.name}</TextEffect>
                  </div>
                </div>

                {/* Model & Input fields */}
                <div className="flex items-center gap-1 px-[2px] py-[2px] pl-1">
                  <div className="flex items-center space-x-2 text-neutral-500 text-sm">
                    <div className="flex flex-col rounded-sm bg-neutral-50 px-1 py-[1px] text-[9px] text-neutral-800 ring-[1px] ring-black/10">
                      <div className="flex items-center gap-1">
                        <div className="flex size-4 items-center justify-center rounded-full bg-black">
                          <OpenAIIcon className="size-3 text-white" />
                        </div>
                        <span className="tracking-wide">gpt-5-nano</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-[2px] py-[1px] pl-1">
                      <p className="font-medium text-[9px] text-muted-foreground/60 tracking-wide">
                        Input fields
                      </p>
                      <div className="inline-block rounded-sm border border-black/10 bg-neutral-50 px-1 text-[9px] text-neutral-800">
                        <NumberFlow value={agent.inputFields.length ?? 0} />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 px-[2px] py-[1px] pl-1">
                      <p className="font-medium text-[9px] text-muted-foreground/60 tracking-wide">
                        Average Loading Time
                      </p>
                      <div className="inline-block rounded-sm border border-black/10 bg-neutral-50 px-1 text-[9px] text-neutral-800">
                        <NumberFlow value={agent.averageTime ?? 0} />s
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <motion.p
              className="text-pretty text-neutral-600 text-sm lg:pr-6"
              key={agent.description}
              variants={staggerItemVariants}
            >
              {agent.description}
            </motion.p>
          </div>

          {/* Details */}
          <motion.div
            className="space-y-4 text-sm"
            key={`${agent.name}-details`}
            variants={staggerItemVariants}
          >
            <div className="space-y-4 rounded-lg bg-neutral-50 p-4 ">
              <div>
                <h4 className="mb-1 font-medium text-neutral-900 text-xs">
                  Best Use Cases
                </h4>
                <p className="text-neutral-600 text-xs">{agent.context}</p>
              </div>
              <div className="space-y-4 border-neutral-200 border-t pt-4">
                <div>
                  <h4 className="mb-2 font-medium text-neutral-900 text-xs">
                    Inputs
                  </h4>
                  <div className="space-y-2 text-xs">
                    {agent.inputFields.map((field, index) => (
                      <div
                        className="flex items-center gap-2 text-neutral-600"
                        key={index}
                      >
                        <Badge className="mt-0.5" variant="outline">
                          {`<${field.type} />`}
                        </Badge>
                        <div>
                          <span className="font-medium">{field.label}</span>
                          <p className="mt-0.5 text-neutral-500 text-xs">
                            {field.placeholder.split("\n")[0]}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1 font-medium text-neutral-900 text-xs">
                    Output
                  </div>
                  <p className="text-neutral-600 text-xs">{agent.output}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            className="space-y-3"
            key={`${agent.name}-features`}
            variants={staggerItemVariants}
          >
            <h4 className="font-medium text-neutral-900 text-xs">
              Capabilities
            </h4>
            <div className="flex flex-wrap gap-2">
              {agent.capabilities?.map((capability) => (
                <Badge
                  className="rounded-full border border-black/10 bg-muted shadow-sm"
                  key={capability}
                  variant="secondary"
                >
                  {capability}
                </Badge>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between rounded-b-2xl border-neutral-100 border-t bg-[#F7F7F8] px-8 py-4">
          <div className="flex items-center gap-2">
            <Button
              className="text-neutral-500 text-xs hover:text-neutral-900"
              size="sm"
              variant="ghost"
            >
              <ExternalLink className="mr-2 size-3" />
              Documentation
            </Button>
            <Button
              className="text-neutral-500 text-xs hover:text-neutral-900"
              size="sm"
              variant="ghost"
            >
              View Examples
              <ArrowRight className="ml-2 size-3" />
            </Button>
          </div>
          <AgentCodePreview
            agentType={agent.id}
            code={getCompleteAgentCode(agent.id)}
          />
        </div>
      </Card>
    </motion.div>
  );
}

function CircularProgress({
  progress,
  size = 80,
  strokeWidth = 4,
  children,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="group relative inline-flex">
      {/* Background blur effect */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        className="-inset-4 absolute rounded-full bg-sky-500/100/5 blur-lg"
        transition={{
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      {/* Static circle */}
      <svg
        className="-rotate-90 transform rounded-full"
        height={size}
        width={size}
      >
        <circle
          className="transition-all duration-300"
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="rgba(59, 130, 246, 0.1)"
          strokeWidth={strokeWidth}
        />

        {/* Animated progress circle */}
        <motion.circle
          animate={{ strokeDashoffset: offset }}
          className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
          cx={size / 2}
          cy={size / 2}
          fill="none"
          initial={{ strokeDashoffset: circumference }}
          r={radius}
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center rounded-full">
        <motion.div
          animate="animate"
          className="flex flex-col items-center rounded-full"
          variants={pulseVariants}
        >
          {children}
          {/* <OpenAIIcon className="size-6  drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300" /> */}
        </motion.div>
      </div>
    </div>
  );
}

function Countdown({
  seconds,
  milliseconds,
  loading,
  className,
}: {
  seconds: number;
  milliseconds: number;
  loading?: boolean;
  className?: string;
}) {
  const ss = seconds;
  const ms = Math.floor(milliseconds / 10); // Convert to centiseconds (2 digits)

  return (
    <motion.div
      className={cn(
        "flex items-center gap-2 rounded-full bg-white/90 px-2.5 py-1.5 font-medium text-xs",
        "shadow-[0_2px_4px_rgba(0,0,0,0.02),_0_1px_2px_rgba(0,0,0,0.04)]",
        "h-7 min-w-24",
        "shadow-[inset_0px_-2.10843px_0px_0px_rgb(244,241,238),_0px_1.20482px_6.3253px_0px_rgb(244,241,238)]",
        "border border-[#E9E3DD] text-[#36322F]",
        loading ? "text-blue-500" : "text-neutral-500",
        className,
      )}
      key={seconds === 0 ? "countdown-0" : "countdown"}
      layoutId="countdown"
    >
      <Clock02Icon
        className={cn(
          "h-3.5 w-3.5",
          loading && "animate-[spin_3s_linear_infinite]",
        )}
      />
      <NumberFlowGroup>
        <div
          className="flex items-baseline font-medium tracking-tight"
          style={{ fontVariantNumeric: "tabular-nums" } as React.CSSProperties}
        >
          <div className="flex items-baseline gap-[2px]">
            <NumberFlow
              className={cn(
                "text-sm transition-colors duration-200",
                loading ? "text-blue-600" : "text-neutral-600",
              )}
              format={{ minimumIntegerDigits: 2 }}
              value={ss}
            />
            <span
              className={cn(
                "font-medium text-[10px] transition-colors duration-200",
                loading ? "text-blue-400" : "text-neutral-400",
              )}
            >
              s
            </span>
          </div>
          <span
            className={cn(
              "mx-0.5 transition-colors duration-200",
              loading ? "text-blue-400/70" : "text-neutral-300",
            )}
          >
            .
          </span>
          <div className="flex items-baseline">
            <NumberFlow
              className={cn(
                "text-sm transition-colors duration-200",
                loading ? "text-blue-500" : "text-neutral-500",
              )}
              format={{ minimumIntegerDigits: 2 }}
              value={ms}
            />
            <span
              className={cn(
                "ml-0.5 font-medium text-[10px] transition-colors duration-200",
                loading ? "text-blue-400" : "text-neutral-400",
              )}
            >
              ms
            </span>
          </div>
        </div>
      </NumberFlowGroup>
    </motion.div>
  );
}

function OpenAIIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="260"
      preserveAspectRatio="xMidYMid"
      viewBox="0 0 256 260"
      width="256"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        className="fill-neutral-200"
        d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z"
      />
    </svg>
  );
}

const Clock02Icon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    color={"#000000"}
    fill={"none"}
    height={24}
    viewBox="0 0 24 24"
    width={24}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="12" cy="12" fill="currentColor" opacity="0.4" r="10" />
    <path
      d="M5.04798 8.60657L2.53784 8.45376C4.33712 3.70477 9.503 0.999914 14.5396 2.34474C19.904 3.77711 23.0904 9.26107 21.6565 14.5935C20.2227 19.926 14.7116 23.0876 9.3472 21.6553C5.36419 20.5917 2.58192 17.2946 2 13.4844"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M12 8V12L14 14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

export { LoadingState, EmptyState, OpenAIIcon, Countdown };
