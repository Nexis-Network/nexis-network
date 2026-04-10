"use client";

import { useState, useCallback } from "react";
import {
  ExportWalletModal,
  ExportWalletModalTrigger,
  ExportWalletModalContent,
  ExportWalletModalTitle,
  ExportWalletModalClose,
} from "@coinbase/cdp-react";
import { logger } from "@/lib/logger";

type CdpExportModalProps = {
  address: string;
  chain: "evm" | "solana";
  triggerLabel?: string;
  className?: string;
  /** Controlled open state (optional — uses internal state when omitted) */
  open?: boolean;
  /** Controlled open state setter */
  onOpenChange?: (open: boolean) => void;
};

/**
 * Wraps CDP's ExportWalletModal for safe private key export.
 *
 * SECURITY: The export runs inside CDP's isolated iframe — the private key
 * NEVER touches our application's JavaScript. This is the ONLY approved
 * method for key export.
 *
 * Note: EVM Smart Accounts cannot export keys (they are contract accounts).
 * Only EOA keys can be exported. The Solana wallet key can be exported.
 */
export function CdpExportModal({
  address,
  chain,
  triggerLabel,
  className,
  open: controlledOpen,
  onOpenChange,
}: CdpExportModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const handleIframeReady = useCallback(() => {
    logger.debug("cdp_export_iframe_ready", { chain, address: address.slice(0, 10) });
  }, [chain, address]);

  const handleCopySuccess = useCallback(() => {
    logger.debug("cdp_export_key_copied", { chain });
  }, [chain]);

  const handleIframeError = useCallback(
    (error?: string) => {
      logger.error("cdp_export_iframe_error", {
        chain,
        error: error ?? "Unknown iframe error",
      });
    },
    [chain],
  );

  const handleIframeSessionExpired = useCallback(() => {
    logger.warn("cdp_export_session_expired", { chain });
    setOpen(false);
  }, [chain, setOpen]);

  const label =
    triggerLabel ??
    `Export ${chain === "solana" ? "Solana" : "EVM"} Private Key`;

  return (
    <ExportWalletModal
      address={address}
      open={open}
      setIsOpen={setOpen}
      onIframeReady={handleIframeReady}
      onCopySuccess={handleCopySuccess}
      onIframeError={handleIframeError}
      onIframeSessionExpired={handleIframeSessionExpired}
    >
      <ExportWalletModalTrigger label={label} className={className} />
      <ExportWalletModalContent>
        <ExportWalletModalTitle>Export Private Key</ExportWalletModalTitle>
        <ExportWalletModalClose />
      </ExportWalletModalContent>
    </ExportWalletModal>
  );
}
