"use client";

import NumberFlow from "@number-flow/react";
import { ChevronDown, Equal, ArrowDownUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import React, { useRef, useState } from "react";
import useMeasure from "react-use-measure";

import { AnimatedNumberInput } from "@/components/numbers/input-animation";
import { cn } from "@/lib/utils";

import { MotionConfig } from "framer-motion";
type NztStakingSwapModuleProps = {
  apyPct: number;
  tokenPriceUsd: number;
  walletBalanceNzt: number;
  stakedNzt: number;
  claimableRewardsNzt: number;
  nztLogoUrl: string;
  className?: string;
};

const MAX_INPUT_VALUE = 111_111;

function formatBalance(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function NztStakingSwapModule({
  apyPct,
  tokenPriceUsd,
  walletBalanceNzt,
  stakedNzt,
  claimableRewardsNzt,
  nztLogoUrl,
  className,
}: NztStakingSwapModuleProps) {
  const [value, setValue] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [useLabelRef, useLabelBounds] = useMeasure();
  const [usdRef, usdBounds] = useMeasure();

  const usdValue = value * tokenPriceUsd;
  const isInsufficient = value > walletBalanceNzt;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;

    if (!/^[0-9]*\\.?[0-9]*$/.test(next) && next !== "") return;

    if (next === "" || next === ".") {
      setValue(0);
      setInputValue(next);
      return;
    }

    if (next.startsWith(".")) {
      setValue(0);
      setInputValue(next);
      return;
    }

    const parsed = Number.parseFloat(next) || 0;
    const clamped = Math.min(parsed, MAX_INPUT_VALUE);
    setValue(clamped);
    setInputValue(parsed > MAX_INPUT_VALUE ? clamped.toString() : next);
  };

  const handleUseMax = () => {
    setValue(walletBalanceNzt);
    setInputValue(walletBalanceNzt.toString());
  };

  const handleClear = () => {
    setValue(0);
    setInputValue("");
    inputRef.current?.blur();
  };

  return (
    <MotionConfig transition={{ type: "spring", stiffness: 400, damping: 35 }}>
      <div
        className={cn(
          "flex h-full w-full flex-col gap-3 bg-transparent text-[var(--bento-text-primary)]",
          className,
        )}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/[0.03] px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-[var(--bento-text-muted)]">Staked</div>
            <div className="mt-1 font-mono text-sm text-[var(--bento-text-primary)]">{formatBalance(stakedNzt)} NZT</div>
          </div>
          <div className="rounded-lg bg-white/[0.03] px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-[var(--bento-text-muted)]">Rewards</div>
            <div className="mt-1 font-mono text-sm text-[var(--bento-text-primary)]">{formatBalance(claimableRewardsNzt)} NZT</div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative flex w-full flex-col items-center justify-center gap-5 rounded-3xl border border-[var(--bento-border)] bg-transparent px-3 py-3">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-3">
                <Image src={nztLogoUrl} alt="NZT" width={28} height={28} className="h-7 w-7 rounded-full object-contain" />
                <div>
                  <h2 className="text-base font-semibold">NZT</h2>
                  <p className="text-sm text-[var(--bento-text-muted)]">{formatBalance(walletBalanceNzt)} NZT</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleUseMax}
                className="flex items-center gap-1 rounded-full bg-white/[0.03] px-3 py-1 text-sm font-semibold transition-colors hover:bg-white/5"
              >
                <motion.span animate={{ width: useLabelBounds.width > 0 ? useLabelBounds.width : "auto" }}>
                  <span ref={useLabelRef} className="inline-flex overflow-hidden">
                    <AnimatePresence mode="popLayout">
                      {value > walletBalanceNzt * 0.9 ? (
                        <motion.span
                          key="using"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          Using{" "}
                        </motion.span>
                      ) : (
                        <motion.span key="use" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          Use{" "}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </motion.span>
                Max
              </button>
            </div>

            <div className="w-full border-t border-[var(--bento-border)]" />

            <div className="mb-6 flex w-full flex-col items-center justify-center gap-4">
              <div className="w-full text-center">
                <AnimatedNumberInput
                  ref={inputRef}
                  align="center"
                  inputMode="decimal"
                  className={cn(
                    "w-full cursor-pointer bg-transparent text-center text-[45px] font-semibold tracking-tight caret-white outline-none",
                  )}
                  hideCaretWhenEmpty
                  placeholder="0"
                  value={inputValue}
                  onChange={handleInputChange}
                />
              </div>

              <div className="flex w-full items-center justify-center gap-2">
                <AnimatePresence initial={false} mode="popLayout">
                  {!isInsufficient ? (
                    <motion.div
                      key="usd-value"
                      style={{ transformOrigin: "top center" }}
                      initial={{ opacity: 0, y: "100%", scale: 0 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0 }}
                      className="flex items-center justify-center gap-2"
                    >
                      <div className="rounded-full bg-white/[0.03] p-1">
                        <Equal className="size-5" />
                      </div>
                      <motion.div animate={{ width: usdBounds.width }} className="flex items-center gap-2 overflow-hidden">
                        <div ref={usdRef} className="font-lg flex justify-between font-semibold tracking-tight">
                          <span>$</span>
                          {(() => {
                            const charCount: Record<string, number> = {};
                            return usdValue
                              .toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              .split("")
                              .map((char) => {
                                charCount[char] = (charCount[char] || 0) + 1;
                                const isDuplicate = charCount[char] > 1;
                                const key = isDuplicate
                                  ? `usd-${char}-dupChar-${charCount[char]}`
                                  : `usd-${char}`;
                                return (
                                  <motion.span key={key} layoutId={key} className="inline-block">
                                    {char}
                                  </motion.span>
                                );
                              });
                          })()}
                        </div>
                      </motion.div>
                      <ArrowDownUp className="size-5" />
                    </motion.div>
                  ) : (
                    <motion.p
                      key="not-enough-nzt"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        x: [0, -5, 5, -3, 3, 0],
                        transition: {
                          x: {
                            delay: 0.2,
                            times: [0, 0.2, 0.4, 0.6, 0.8, 1],
                          },
                          type: "spring",
                          stiffness: 400,
                          damping: 35,
                        },
                      }}
                      exit={{ opacity: 0, scale: 0 }}
                      style={{ transformOrigin: "bottom center" }}
                      className="font-lg w-max text-center font-semibold tracking-tight text-red-500"
                    >
                      Not Enough NZT
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="absolute -bottom-6 rounded-full border border-[var(--bento-border)] bg-transparent p-1.5">
              <ChevronDown className="size-5 opacity-50" />
            </div>
          </div>

          <div className="flex w-full flex-col items-start justify-start gap-5 rounded-3xl border border-[var(--bento-border)] bg-transparent px-3 py-3">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-3">
                <Image src={nztLogoUrl} alt="NZT" width={40} height={40} className="h-10 w-10 rounded-full object-contain" />
                <div>
                  <h2 className="text-base font-semibold">Rewards</h2>
                  <p className="text-sm text-[var(--bento-text-muted)]">Claimable NZT</p>
                </div>
              </div>
              <div className="text-right">
                <div className="rounded-full pr-2 text-lg font-semibold">
                  <NumberFlow value={claimableRewardsNzt} />
                </div>
                <div className="pr-2 text-xs text-[var(--bento-text-primary)]/60">APY {apyPct.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!inputValue || isInsufficient}
              className={cn(
                "rounded-full bg-white/[0.03] py-2 text-sm font-semibold text-[var(--bento-text-primary)] transition-colors hover:bg-white/5",
                (!inputValue || isInsufficient) && "cursor-not-allowed opacity-50 hover:bg-white/[0.03]",
              )}
              onClick={() => {
                // placeholder
              }}
            >
              Stake
            </button>
            <button
              type="button"
              className="rounded-full bg-white/[0.03] py-2 text-sm font-semibold text-[var(--bento-text-primary)]/80 transition-colors hover:bg-white/5"
              onClick={() => {
                // placeholder
              }}
            >
              Claim
            </button>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="w-full rounded-full bg-white/[0.03] py-2 text-sm font-semibold text-[var(--bento-text-primary)]/60 transition-colors hover:bg-white/5"
          >
            Clear
          </button>
        </div>
      </div>
    </MotionConfig>
  );
}
