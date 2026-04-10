"use client";

import { AnimatePresence, motion, useAnimation } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Globe,
  Info,
  Minus,
  Plus,
  SendHorizonal,
  TriangleAlert,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { useCspNonce } from "@/lib/security/client-nonce";

const Skiper42 = () => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="grid content-start justify-items-center gap-6 text-center">
        <span className="after:from-background after:to-foreground relative max-w-[12ch] text-xs uppercase leading-tight opacity-40 after:absolute after:left-1/2 after:top-full after:h-16 after:w-px after:bg-gradient-to-b after:content-['']">
          Try toggling the icons
        </span>
      </div>
      <div className="mt-25 flex w-full max-w-3xl flex-wrap items-center justify-center gap-2 px-5 text-justify">
        <div className="size-22 bg-background rounded-3xl">
          <SideBarIcon />
        </div>
        <div className="size-22 bg-background rounded-3xl">
          <SourceButton />
        </div>
        <div className="size-22 bg-background rounded-3xl">
          <LockSourceButton />
        </div>
        <div className="size-22 bg-background rounded-3xl">
          <LogoutIcon />
        </div>
        <div className="size-22 bg-background rounded-3xl">
          <DollerIcon />
        </div>
        <div className="size-22 bg-background rounded-3xl">
          <CopyIcon />
        </div>
        <div className="size-22 bg-background rounded-3xl">
          <MusicIcon />
        </div>
        <div className="size-22 bg-background rounded-3xl">
          <PlusIcon />
        </div>
        <div className="size-22 bg-background rounded-3xl">
          <HamMenuIcon />
        </div>
        <div className="size-22 bg-background rounded-3xl">
          <ChevIcon />
        </div>
        <div className="size-22 bg-background rounded-3xl">
          <MailIcon />
        </div>
        <div className="size-22 bg-background rounded-3xl">
          <WorldIcon />
        </div>
        <div className="size-22 bg-background rounded-3xl">
          <FileIcon />
        </div>
        <div className="size-22 bg-background rounded-3xl">
          <TrashIcon />
        </div>
        <div className="size-22 bg-background rounded-3xl">
          <SendIcon />
        </div>
        <div className="size-22 bg-background rounded-3xl">
          <SpinnerIcon color="var(--color-foreground)" />
        </div>
        <div className="size-22 bg-background rounded-3xl">
          <BellIcon />
        </div>
      </div>
    </div>
  );
};

export {
  BellIcon,
  ChevIcon,
  CopyIcon,
  DollerIcon,
  FileIcon,
  HamMenuIcon,
  InfoButton,
  LockSourceButton,
  LogoutIcon,
  MailIcon,
  MusicIcon,
  PlusIcon,
  SendIcon,
  SideBarIcon,
  Skiper42,
  SourceButton,
  SpinnerIcon,
  TrashIcon,
  WorldIcon,
};

const SideBarIcon = ({ className }: { className?: string }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleToggle = () => {
    setIsHovered((prev) => !prev);
  };

  return (
    <div
      onClick={handleToggle}
      className="flex size-full cursor-pointer items-center justify-center"
    >
      <div className="relative grid cursor-pointer items-center justify-center">
        <svg
          width="16"
          height="16"
          className={className}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0.32698 2.63803C0 3.27976 0 4.11984 0 5.8V10.2C0 11.8802 0 12.7202 0.32698 13.362C0.614601 13.9265 1.07354 14.3854 1.63803 14.673C2.27976 15 3.11984 15 4.8 15H11.2C12.8802 15 13.7202 15 14.362 14.673C14.9265 14.3854 15.3854 13.9265 15.673 13.362C16 12.7202 16 11.8802 16 10.2V5.8C16 4.11984 16 3.27976 15.673 2.63803C15.3854 2.07354 14.9265 1.6146 14.362 1.32698C13.7202 1 12.8802 1 11.2 1H4.8C3.11984 1 2.27976 1 1.63803 1.32698C1.07354 1.6146 0.614601 2.07354 0.32698 2.63803Z"
            fill="currentColor"
          ></path>
        </svg>
        <motion.div
          className="bg-background absolute left-[3px] h-[10px] w-[1.5px] rounded-[1px]"
          animate={{ width: isHovered ? "4.5px" : "1.5px" }}
        ></motion.div>
      </div>
    </div>
  );
};

const SourceButton = ({ className }: { className?: string }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleToggle = () => {
    setIsHovered((prev) => !prev);
  };

  return (
    <div
      onClick={handleToggle}
      className={cn(
        "flex size-full cursor-pointer items-center justify-center",
        className,
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
      >
        <motion.path
          d="m18 16 4-4-4-4"
          animate={{
            x: isHovered ? 2 : 0,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />
        <motion.path
          d="m6 8-4 4 4 4"
          animate={{
            x: isHovered ? -2 : 0,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />
        <motion.path
          d="m14.5 4-5 16"
          animate={{
            y: isHovered ? 22 : 0,
            x: isHovered ? -5 : 0,
          }}
          transition={{
            duration: 0.3,
            ease: "easeInOut",
          }}
        />
        <motion.path
          d="m14.5 4-5 16"
          animate={{
            y: isHovered ? 0 : -22,
            x: isHovered ? 0 : 5,
          }}
          transition={{
            duration: 0.3,
            ease: "easeInOut",
          }}
        />
      </svg>
    </div>
  );
};

const LockSourceButton = ({ className }: { className?: string }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleToggle = () => {
    setIsHovered((prev) => !prev);
  };

  return (
    <div
      onClick={handleToggle}
      className={cn(
        "flex size-full cursor-pointer items-center justify-center",
        className,
      )}
    >
      <button style={{ transformStyle: "preserve-3d", perspective: "500px" }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          overflow="visible"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
        >
          <motion.path
            style={{ originX: 1 }}
            animate={{
              rotateY: isHovered ? 180 : 0,
            }}
            transition={{
              duration: 0.4,
              ease: "easeInOut",
            }}
            d="M7 11V7a5 5 0 0 1 10 0v12"
          />
          <motion.rect
            width="18"
            height="11"
            x="3"
            y="11"
            rx="2"
            ry="2"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  );
};

const InfoButton = ({ className }: { className?: string }) => {
  const [loading, setLoading] = useState(false);
  const rotateY = useAnimation();
  const handleRotateY = async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    await rotateY.start({
      rotateY: 360,
      transition: { duration: 1, ease: "easeInOut" },
    });
    setLoading(false);
    rotateY.set({ rotateY: 0 });
  };
  return (
    <button
      onClick={handleRotateY}
      className={cn(
        "text-foreground bg-foreground/5 group flex h-[30px] w-fit cursor-pointer items-center justify-center gap-2 self-end rounded-xl px-3 text-[13px] text-sm font-medium transition-all ease-in-out hover:opacity-60",
        className,
      )}
    >
      <motion.span animate={rotateY}>
        <Info className="size-4" />
      </motion.span>
    </button>
  );
};

const LogoutIcon = ({ className }: { className?: string }) => {
  const logoutAnimate = useAnimation();
  const handleLogoutAnimate = async () => {
    await logoutAnimate.start({
      x: [0, -3, 0],
      transition: {
        duration: 0.4,
        ease: "easeInOut",
      },
    });
  };
  return (
    <div
      onClick={handleLogoutAnimate}
      className={cn(
        "flex size-full cursor-pointer items-center justify-center",
        className,
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
      >
        <motion.g animate={logoutAnimate}>
          <path d="m10 17 5-5-5-5" />
          <path d="M15 12H3" />
        </motion.g>
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      </svg>
    </div>
  );
};

const DollerIcon = ({ className }: { className?: string }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleToggle = () => {
    setIsHovered((prev) => !prev);
  };

  return (
    <div
      onClick={handleToggle}
      className={cn(
        "flex size-full cursor-pointer items-center justify-center",
        className,
      )}
    >
      <motion.svg
        animate={{
          rotateY: isHovered ? 360 : 0,
          transition: { duration: 0.7, ease: "easeInOut" },
        }}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
      >
        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 18V6" />
      </motion.svg>
    </div>
  );
};

const CopyIcon = ({
  className,
  copyText = "copied Hello form skiper ui",
}: {
  className?: string;
  copyText?: string;
}) => {
  const [isUsageCopied, setIsUsageCopied] = useState(false);

  const handleCopyUsage = async () => {
    await navigator.clipboard.writeText(copyText);
    setIsUsageCopied(true);
    setTimeout(() => setIsUsageCopied(false), 1000);
  };

  return (
    <span
      onClick={handleCopyUsage}
      className={cn(
        "flex size-full cursor-pointer items-center justify-center",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {!isUsageCopied ? (
          <motion.svg
            key="copy"
            exit={{ scale: 0 }}
            animate={{ scale: 1 }}
            initial={{ scale: 0 }}
            transition={{ duration: 0.1, ease: "easeInOut" }}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4 transition group-hover:opacity-100"
          >
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </motion.svg>
        ) : (
          <motion.svg
            key="copied"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="size-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              initial={{ pathLength: 0, pathOffset: 1 }}
              animate={{ pathLength: 1, pathOffset: 0 }}
              d="M20 6 9 17l-5-5"
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </span>
  );
};

const MusicIcon = ({ className }: { className?: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const bars = 9;
  const [heights, setHeights] = useState(Array(bars).fill(0.1));
  const frame = useRef(0);

  useEffect(() => {
    if (!isPlaying) {
      setHeights(Array(bars).fill(0.1));
      return;
    }

    let animationId: number;
    const animate = () => {
      frame.current += 1;
      setHeights(
        Array.from({ length: bars }, () => Math.random() * 0.8 + 0.2),
      );
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying]);

  return (
    <span
      onClick={() => setIsPlaying((x) => !x)}
      aria-label={isPlaying ? "Pause waveform" : "Play waveform"}
      aria-pressed={isPlaying}
      tabIndex={0}
      className={cn(
        "flex size-full cursor-pointer items-center justify-center gap-px",
        className,
      )}
      role="button"
    >
      {heights.map((height, index) => (
        <motion.div
          key={index}
          className="bg-foreground w-[2px] rounded-full"
          animate={{
            height: Math.max(3, height * 26),
          }}
          transition={{
            type: "spring",
            stiffness: 250,
            damping: 10,
          }}
        />
      ))}
    </span>
  );
};

const PlusIcon = ({ className }: { className?: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      data-state={isOpen ? "open" : "closed"}
      onClick={() => setIsOpen((prev) => !prev)}
      className={cn(
        "relative flex size-full cursor-pointer items-center justify-center",
        className,
      )}
    >
      <Plus
        strokeWidth={2}
        opacity={0.2}
        stroke="currentColor"
        className={`absolute size-[18px] shrink-0 cursor-pointer transition-all duration-200 sm:size-[22px] ${isOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"}`}
      />
      <Minus
        strokeWidth={2}
        opacity={0.2}
        stroke="currentColor"
        className={`absolute size-[18px] shrink-0 cursor-pointer transition-all duration-200 sm:size-[22px] ${isOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"}`}
      />
    </div>
  );
};

const HamMenuIcon = ({ className }: { className?: string }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={() => setIsHovered((x) => !x)}
      className={cn(
        "relative flex size-full cursor-pointer items-center justify-center",
        className,
      )}
    >
      <motion.div
        transition={{ duration: 1, bounce: 0.6, type: "spring" }}
        className={cn(
          "text-foreground/50 relative flex size-4 h-fit cursor-pointer items-center justify-center gap-2 text-sm",
          isHovered && "text-foreground",
        )}
        // onMouseEnter={() => setIsHovered(true)}
      >
        <div className="group flex w-4 flex-col items-end justify-end gap-1">
          <span
            className={cn(
              "bg-foreground h-[1.5px] w-4 rounded-3xl transition-all ease-in-out group-hover:w-2",
              isHovered && "w-2",
            )}
          />
          <span
            className={cn(
              "bg-foreground h-[1.5px] w-2 rounded-3xl transition-all ease-in-out group-hover:w-4",
              isHovered && "w-4",
            )}
          />
          <span
            className={cn(
              "bg-foreground h-[1.5px] w-3 rounded-3xl transition-all ease-in-out group-hover:w-2",
              isHovered && "w-2",
            )}
          />
        </div>
      </motion.div>
    </div>
  );
};

const ChevIcon = ({ className }: { className?: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      data-state={isOpen ? "open" : "closed"}
      onClick={() => setIsOpen((prev) => !prev)}
      className={cn(
        "relative flex size-full cursor-pointer items-center justify-center",
        className,
      )}
    >
      <ChevronDown
        strokeWidth={2}
        opacity={0.2}
        stroke="currentColor"
        className={`absolute size-[18px] shrink-0 cursor-pointer transition-all duration-200 sm:size-[22px] ${isOpen ? "-rotate-90 opacity-0" : "rotate-0 opacity-100"}`}
      />
      <ChevronUp
        strokeWidth={2}
        opacity={0.2}
        stroke="currentColor"
        className={`absolute size-[18px] shrink-0 cursor-pointer transition-all duration-200 sm:size-[22px] ${isOpen ? "rotate-0 opacity-100" : "rotate-90 opacity-0"}`}
      />
    </div>
  );
};

const MailIcon = ({ className }: { className?: string }) => {
  const [isShaking, setIsShaking] = useState(false);

  const handleShake = () => {
    setIsShaking(true);
  };

  return (
    <motion.div
      onClick={handleShake}
      className={cn(
        "flex size-full cursor-pointer items-center justify-center",
        className,
      )}
      animate={isShaking ? { x: [0, -5, 5, -5, 5, 0] } : { x: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      onAnimationComplete={() => setIsShaking(false)}
    >
      <TriangleAlert className="size-4" />
    </motion.div>
  );
};

const WorldIcon = ({ className }: { className?: string }) => {
  const [isClicked, setIsClicked] = useState(true);

  return (
    <div
      onClick={() => setIsClicked((prev) => !prev)}
      className={cn(
        "flex size-full cursor-pointer items-center justify-center",
        className,
      )}
    >
      <Globe
        className={cn("size-4 animate-spin")}
        style={isClicked ? { animationPlayState: "paused" } : undefined}
      />
    </div>
  );
};

const FileIcon = ({ className }: { className?: string }) => {
  const [isClicked, setIsClicked] = useState(true);

  return (
    <div
      onClick={() => setIsClicked((prev) => !prev)}
      className={cn(
        "flex size-full cursor-pointer items-center justify-center",
        className,
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        className="size-4"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          animate={{
            opacity: isClicked ? 1 : 0,
            pathLength: isClicked ? 1 : 0,
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          d="m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551"
        />
      </svg>
    </div>
  );
};

const TrashIcon = ({ className }: { className?: string }) => {
  const [isClicked, setIsClicked] = useState(false);

  return (
    <div
      onClick={() => setIsClicked((prev) => !prev)}
      className={cn(
        "flex size-full cursor-pointer items-center justify-center",
        className,
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        overflow="visible"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
      >
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <motion.g
          animate={{
            rotate: isClicked ? 180 : 0,
            y: isClicked ? 2 : 0,
            transformOrigin: "right",
          }}
          className="border-2"
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </motion.g>
      </svg>
    </div>
  );
};

const SendIcon = ({ className }: { className?: string }) => {
  const controls = useAnimation();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = async () => {
    if (isAnimating) return;

    setIsAnimating(true);

    await controls.start({
      scale: 0.8,
      x: 0,
      transition: { duration: 0.18, ease: "easeInOut" },
    });

    await new Promise((res) => setTimeout(res, 200));

    await controls.start({
      scale: 0.8,
      x: 100,
      transition: { duration: 0.28, ease: "easeInOut" },
    });

    await controls.set({ scale: 1, x: -100 });

    await controls.start({
      scale: 1,
      x: 0,
      transition: { duration: 0.28, ease: "easeInOut" },
    });
    setIsAnimating(false);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex size-full cursor-pointer items-center justify-center overflow-hidden",
        className,
      )}
    >
      <motion.span animate={controls} style={{ willChange: "transform" }}>
        <SendHorizonal className="size-4" />
      </motion.span>
    </div>
  );
};

const SpinnerIcon = ({
  color = "white",
  size = 20,
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}) => {
  const nonce = useCspNonce();
  const bars = Array(12).fill(0);

  const getBarStyle = (i: number) => ({
    animation: "spinner-fade 1.2s linear infinite",
    animationDelay: `${-1.2 + i * 0.1}s`,
    transform: `rotate(${i * 30}deg) translate(146%)`,
    background: color,
    borderRadius: "6px",
    height: "8%",
    position: "absolute" as const,
    width: "24%",
  });

  return (
    <div
      className={cn(
        "flex size-full cursor-pointer items-center justify-center",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex items-center justify-center",
          `h-[${size}px] w-[${size}px]`,
        )}
        style={{ height: size, width: size }}
      >
        {bars.map((_, i) => (
          <div
            key={`spinner-bar-${i}`}
            className="absolute"
            style={getBarStyle(i)}
          />
        ))}
        <style nonce={nonce ?? undefined}>{`
          @keyframes spinner-fade {
            0% { opacity: 1; }
            100% { opacity: 0.15; }
          }
        `}</style>
      </div>
    </div>
  );
};

const BellIcon = ({ className }: { className?: string }) => {
  const [isClicked, setIsClicked] = useState(false);

  return (
    <div
      onClick={() => setIsClicked((prev) => !prev)}
      className={cn(
        "flex size-full cursor-pointer items-center justify-center",
        className,
      )}
    >
      <motion.div
        initial={false}
        className="relative flex size-5 items-center justify-center"
        animate={{
          rotate: isClicked
            ? [0, -15, 5, -2, 0]
            : [0, 20, -15, 12.5, -10, 10, -7.5, 7.5, -5, 5, 0],
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 15 17"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1.17969 13.3125H13.5625C14.2969 13.3125 14.7422 12.9375 14.7422 12.3672C14.7422 11.5859 13.9453 10.8828 13.2734 10.1875C12.7578 9.64844 12.6172 8.53906 12.5547 7.64062C12.5 4.64062 11.7031 2.57812 9.625 1.82812C9.32812 0.804688 8.52344 0 7.36719 0C6.21875 0 5.40625 0.804688 5.11719 1.82812C3.03906 2.57812 2.24219 4.64062 2.1875 7.64062C2.125 8.53906 1.98438 9.64844 1.46875 10.1875C0.789062 10.8828 0 11.5859 0 12.3672C0 12.9375 0.4375 13.3125 1.17969 13.3125ZM7.36719 16.4453C8.69531 16.4453 9.66406 15.4766 9.76562 14.3828H4.97656C5.07812 15.4766 6.04688 16.4453 7.36719 16.4453Z"
            fill="currentColor"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rotate-[-40deg] overflow-hidden">
            <motion.div
              animate={{ scaleY: isClicked ? 1 : 0 }}
              transition={{
                ease: "easeInOut",
                duration: isClicked ? 0.125 : 0.05,
                delay: isClicked ? 0.15 : 0,
              }}
              style={{
                transformOrigin: "top",
              }}
              className="h-[28px] w-fit rounded-full"
            >
              <div className="bg-background flex h-full w-[3px] items-center justify-center rounded-full">
                <div className="bg-foreground h-full w-[0.75px] rounded-full" />
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
