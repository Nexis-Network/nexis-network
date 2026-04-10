"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AssetInput } from "@/components/swap/asset-input";
import { TokenInfo } from "@/stores/use-swap-store";
import { TokenSelector } from "@/components/swap/token-selector";
import { useAccount } from "wagmi";
import { useUniswapLp, LpExecutionStatus } from "@/hooks/use-uniswap-lp";
import { TxProgressStepper } from "@/components/swap/tx-progress-stepper";

export function LiquidityProvisioningForm() {
  const { isConnected, address } = useAccount();

  const [token0, setToken0] = useState<TokenInfo | null>(null);
  const [token1, setToken1] = useState<TokenInfo | null>(null);
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");

  const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false);
  const [selectorType, setSelectorType] = useState<"token0" | "token1">(
    "token0",
  );

  const {
    status: execStatus,
    error: execError,
    createPosition,
  } = useUniswapLp();

  const handleTokenSelect = (token: TokenInfo) => {
    if (selectorType === "token0") setToken0(token);
    else setToken1(token);
  };

  const handleCreateLp = async () => {
    if (!token0 || !token1 || !amount0 || !amount1 || !address) return;

    const amount0Preferred = Math.floor(
      parseFloat(amount0) * Math.pow(10, token0.decimals),
    ).toString();
    const amount1Preferred = Math.floor(
      parseFloat(amount1) * Math.pow(10, token1.decimals),
    ).toString();

    await createPosition({
      walletAddress: address,
      poolAddress: "0x0000000000000000000000000000000000000000", // Placeholder: requires pool resolution
      token0: token0.address,
      token1: token1.address,
      amount0Preferred,
      amount1Preferred,
      tickLower: -887220, // Placeholder full range
      tickUpper: 887220,
      chainId: token0.chainId,
    });
  };

  const isExecuting =
    execStatus !== "IDLE" && execStatus !== "SUCCESS" && execStatus !== "ERROR";

  return (
    <div
      className="flex flex-col items-center gap-0 p-0 text-[var(--settings-foreground-strong)]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      {/* Header Row */}
      <div className="mb-4 flex w-full max-w-[372.7px] items-center justify-between px-1">
        <h2 className="font-semibold text-[var(--settings-foreground-strong)]">
          Add Liquidity
        </h2>
      </div>

      {execError && (
        <div className="mb-4 flex w-full max-w-[372.7px] items-center gap-2 rounded-[var(--settings-radius)] border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-400">
          <span className="truncate">{execError}</span>
        </div>
      )}

      <div className="relative flex flex-col items-center w-full">
        <AssetInput
          type="pay"
          token={token0}
          amount={amount0}
          onAmountChange={setAmount0}
          balance="-"
          onTokenClick={() => {
            setSelectorType("token0");
            setIsTokenSelectorOpen(true);
          }}
        />

        <div className="z-30 my-2 flex items-center justify-center text-white/50 text-xl font-bold">
          +
        </div>

        <AssetInput
          type="pay" // using pay styling for both
          token={token1}
          amount={amount1}
          onAmountChange={setAmount1}
          balance="-"
          onTokenClick={() => {
            setSelectorType("token1");
            setIsTokenSelectorOpen(true);
          }}
        />
      </div>

      {/* Action Button */}
      <Button
        className="settings-primary-button mt-4 h-[64px] w-[372.7px] rounded-[var(--settings-panel-radius)] text-[18px] font-medium shadow-none transition-all disabled:cursor-not-allowed disabled:opacity-75"
        disabled={
          !amount0 ||
          !amount1 ||
          !token0 ||
          !token1 ||
          !isConnected ||
          isExecuting
        }
        onClick={handleCreateLp}
      >
        {!isConnected
          ? "Connect Wallet"
          : isExecuting
            ? execStatus.replace("_", " ")
            : "Add Liquidity"}
      </Button>

      {execStatus !== "IDLE" && (
        <div className="mt-4 w-full max-w-[372.7px]">
          <TxProgressStepper steps={getLpSteps(execStatus)} />
        </div>
      )}

      <TokenSelector
        isOpen={isTokenSelectorOpen}
        onClose={() => setIsTokenSelectorOpen(false)}
        onSelect={handleTokenSelect}
      />
    </div>
  );
}

function getLpSteps(status: LpExecutionStatus) {
  const steps = [
    {
      id: "approval",
      label: "Token Approval",
      description: "Checking and granting token spending allowances",
      status: "idle" as "idle" | "loading" | "success" | "error",
    },
    {
      id: "create",
      label: "Create Position",
      description: "Submit transaction to the network",
      status: "idle" as "idle" | "loading" | "success" | "error",
    },
  ];

  if (status === "IDLE") return steps;

  // Simple mapping for this implementation
  if (status === "CONFIGURING_LP") {
    steps[0].status = "loading";
  } else if (status === "SUBMITTING") {
    steps[0].status = "success";
    steps[1].status = "loading";
  } else if (status === "SUCCESS") {
    steps[0].status = "success";
    steps[1].status = "success";
  } else if (status === "ERROR") {
    const activeStep = steps.find((s) => s.status !== "success");
    if (activeStep) activeStep.status = "error";
  }

  return steps;
}
