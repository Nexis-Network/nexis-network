// Domain: gamification
// Responsibility: Daily XP claim popup card displayed in bottom-left of /app page
// Depends on: use-daily-xp hook, framer-motion

"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Flame, Gift, Loader2, Check } from "lucide-react";
import { useDailyXp } from "@/lib/hooks/xp";
import { cn } from "@/lib/utils";


import { logger } from '@/lib/logger';
const POPUP_IMAGE_URL = "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/popup/next1.jpg";
const DISMISS_STORAGE_KEY = "nex-xp-popup-dismissed";

export function DailyXpPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const {
    canClaim,
    currentStreak,
    nextReward,
    totalXp,
    level,
    claimXp,
    isClaiming,
    isLoading,
    lastClaimResult,
  } = useDailyXp();

  // Check if popup should be shown
  useEffect(() => {
    const checkVisibility = () => {
      // Don't show if already claimed today
      if (!canClaim && !isLoading) {
        setIsVisible(false);
        return;
      }

      // Check if dismissed today
      const dismissed = localStorage.getItem(DISMISS_STORAGE_KEY);
      if (dismissed) {
        const dismissedDate = new Date(dismissed).toDateString();
        const today = new Date().toDateString();
        if (dismissedDate === today) {
          setIsVisible(false);
          return;
        }
      }

      // Show popup with slight delay for better UX
      const timer = setTimeout(() => {
        if (canClaim) {
          setIsVisible((prev) => {
            if (prev) return prev;
            return true;
          });
        }
      }, 2000);

      return () => clearTimeout(timer);
    };

    checkVisibility();
  }, [canClaim, isLoading]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_STORAGE_KEY, new Date().toISOString());
    setIsVisible(false);
  }, []);

  const handleClaim = useCallback(async () => {
    try {
      await claimXp();
      setShowSuccess(true);
      
      // Auto-dismiss after success animation
      setTimeout(() => {
        handleDismiss();
      }, 3000);
    } catch (error) {
      logger.error("[XP Popup] Claim failed:", error);
    }
  }, [claimXp, handleDismiss]);

  // Don't render if not visible or loading
  if (isLoading || (!isVisible && !showSuccess)) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-6 right-6 z-50"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl",
              "w-[320px]",
              // Background + Shadow from provided styles
              "bg-card/95",
              "shadow-[0px_32px_64px_-12px_rgba(0,0,0,0.45),0px_16px_32px_-8px_rgba(0,0,0,0.35),0px_8px_16px_-4px_rgba(0,0,0,0.25),0px_0px_1px_0px_rgba(255,255,255,0.15)_inset]",
              // Border from provided styles
              "border border-border/10",
              // Backdrop blur
              "backdrop-blur-xl"
            )}
          >
            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="absolute right-3 top-3 z-20 rounded-full bg-muted/10 p-1.5 text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground"
              type="button"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Image section */}
            <div className="relative h-[140px] w-full overflow-hidden">
              <Image
                src={POPUP_IMAGE_URL}
                alt="Daily XP Reward"
                fill
                className="object-cover"
                priority
                sizes="320px"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-card/95 via-transparent to-transparent" />
              
              {/* XP Badge */}
              <div className="absolute bottom-3 left-4 flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full border border-border/10 bg-muted/10 px-2.5 py-1 backdrop-blur-lg">
                  <Zap className="w-3.5 h-3.5 text-[#00FF88]" />
                  <span className="text-xs font-medium text-foreground/90">+{nextReward} XP</span>
                </div>
                {currentStreak > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/20 border border-orange-500/30">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span className="text-xs font-medium text-orange-300">{currentStreak}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Content section */}
            <div className="p-4 pt-2">
              {/* Title - Brand voice: Precise, command-focused */}
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                Daily Protocol Reward
              </h3>
              
              {/* Description - Brand voice: Minimal, high-signal */}
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {currentStreak > 1 
                  ? `${currentStreak}-day streak active. Sync your daily 100 XP to maintain momentum.`
                  : "Execute your daily check-in. 100 XP synchronized to your account."
                }
              </p>

              {/* Stats row */}
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span>Level {level}</span>
                <span className="h-3 w-px bg-border/40" />
                <span>{totalXp.toLocaleString()} total XP</span>
              </div>

              {/* Claim button */}
              <motion.button
                onClick={handleClaim}
                disabled={isClaiming || showSuccess}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "mt-4 w-full py-3 px-4 rounded-xl font-medium text-sm",
                  "flex items-center justify-center gap-2",
                  "transition-all duration-200",
                  showSuccess
                    ? "bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/30"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                type="button"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : showSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{lastClaimResult?.message ?? "XP Claimed"}</span>
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4" />
                    <span>Claim {nextReward} XP</span>
                  </>
                )}
              </motion.button>

              {/* Streak hint */}
              {currentStreak > 0 && !showSuccess && (
                <p className="mt-2 text-center text-xs text-muted-foreground/60">
                  Streak bonus: +{Math.min(100, (currentStreak) * 10)} XP tomorrow
                </p>
              )}
            </div>

            {/* Glow effect on hover */}
            <motion.div
              className="absolute inset-0 pointer-events-none rounded-2xl"
              animate={{
                boxShadow: isHovered
                  ? "0 0 60px rgba(0,255,136,0.15) inset"
                  : "0 0 0px rgba(0,255,136,0) inset",
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DailyXpPopup;
