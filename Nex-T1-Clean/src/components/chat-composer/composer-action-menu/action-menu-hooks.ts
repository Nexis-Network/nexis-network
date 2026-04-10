"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getSupportedChains } from "@/lib/chains";
import { useExchangeConnections } from "@/lib/hooks/trading/use-exchange-connections";
import { logger } from "@/lib/logger";

import type { RiskWarning } from "../risk-warning-dialog";
import type {
  ComposerChainOption,
  ExchangeConnectionPayload,
} from "./action-menu-types";
import { SOLANA_MAINNET_ID } from "./action-menu-types";

export { useComposerWalletOptions } from "./action-menu-wallet-options";

export function useComposerChainSelection(params: {
  chainId?: number;
  switchChain?: ((chainId: number) => Promise<unknown>) | undefined;
}) {
  const { chainId, switchChain } = params;
  const supportedChains = useMemo<ComposerChainOption[]>(
    () =>
      getSupportedChains().map((chain) => ({
        id: chain.id,
        name: chain.name,
        testnet: Boolean(chain.testnet),
      })),
    [],
  );
  const composerChains = useMemo<ComposerChainOption[]>(() => {
    if (supportedChains.some((chain) => chain.id === SOLANA_MAINNET_ID)) {
      return supportedChains;
    }

    return [
      ...supportedChains,
      {
        id: SOLANA_MAINNET_ID,
        name: "Solana",
        testnet: false,
      },
    ];
  }, [supportedChains]);
  const [useAllChains, setUseAllChains] = useState(false);
  const [showTestnets, setShowTestnets] = useState(false);

  const selectedChain = useMemo(
    () => composerChains.find((chain) => chain.id === chainId),
    [chainId, composerChains],
  );
  const visibleChains = useMemo(
    () => composerChains.filter((chain) => showTestnets || !chain.testnet),
    [composerChains, showTestnets],
  );

  useEffect(() => {
    if (selectedChain?.testnet) {
      setShowTestnets(true);
    }
  }, [selectedChain?.id, selectedChain?.testnet]);

  const handleAllChainsSelect = useCallback(() => {
    setUseAllChains(true);
  }, []);

  const handleChainSelect = useCallback(
    async (targetChainId: number) => {
      setUseAllChains(false);

      if (targetChainId === SOLANA_MAINNET_ID) {
        return;
      }

      try {
        await switchChain?.(targetChainId);
      } catch (error) {
        logger.error(
          "Failed to switch chain from composer action menu",
          error,
        );
      }
    },
    [switchChain],
  );

  return {
    selectedChain,
    visibleChains,
    showTestnets,
    setShowTestnets,
    useAllChains,
    handleAllChainsSelect,
    handleChainSelect,
  };
}

export function useComposerAutoMode() {
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [riskWarning, setRiskWarning] = useState<RiskWarning | null>(null);
  const [pendingAutoMode, setPendingAutoMode] = useState<boolean | null>(null);

  const handleAutoModeToggle = useCallback((checked: boolean) => {
    if (!checked) {
      setIsAutoMode(false);
      return;
    }

    setPendingAutoMode(true);
    setRiskWarning({
      title: "Enable Auto Mode",
      description:
        "Enabling Auto Mode grants the AI agent authority to broadcast transactions without per-action approval. This removes your ability to review individual steps before execution. You should only enable this if you fully understand the risks of unintended autonomous on-chain interactions and agree to hold Nexis Labs harmless.",
      confirmLabel: "Enable Auto Mode",
    });
  }, []);

  const handleWarningConfirm = useCallback(() => {
    setIsAutoMode((currentState) => pendingAutoMode ?? currentState);
    setPendingAutoMode(null);
    setRiskWarning(null);
  }, [pendingAutoMode]);

  const handleWarningCancel = useCallback(() => {
    setPendingAutoMode(null);
    setRiskWarning(null);
  }, []);

  return {
    isAutoMode,
    riskWarning,
    handleAutoModeToggle,
    handleWarningConfirm,
    handleWarningCancel,
  };
}

export function useComposerExchangeConnectionManager(
  isAuthenticated: boolean,
) {
  const { connections, refresh: refreshExchanges } = useExchangeConnections({
    enabled: isAuthenticated,
  });

  const exchangeConnectionList = useMemo(
    () => (Array.isArray(connections) ? connections : []),
    [connections],
  );
  const activeExchangeCount = useMemo(
    () =>
      exchangeConnectionList.filter((connection) => connection.isActive)
        .length,
    [exchangeConnectionList],
  );

  const handleSaveExchange = useCallback(
    async (data: ExchangeConnectionPayload) => {
      try {
        if (!isAuthenticated) {
          throw new Error("Sign in required to connect exchanges");
        }

        const res = await fetch("/api/trading/exchanges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to save exchange");
        }

        refreshExchanges();
      } catch (error) {
        logger.error("Failed to save exchange connection", error);
        throw error;
      }
    },
    [isAuthenticated, refreshExchanges],
  );

  return {
    activeExchangeCount,
    handleSaveExchange,
  };
}
