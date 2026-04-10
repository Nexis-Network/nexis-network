"use client";

import { WalletSnapshot } from "@/modules/wallets/profile";
import { useState } from "react";
import { ScanLine } from "lucide-react";
import { ActionSlideButton } from "../action-slide-button";
import { Input } from "@/components/ui/input";
import { useSendTransaction, useBalance } from "wagmi";
import { parseEther, isAddress, formatUnits } from "viem";
import { toast } from "sonner";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, Connection, clusterApiUrl } from "@solana/web3.js";
import { useCdpTransactions } from "@/lib/cdp/use-cdp-transactions";
import { logger } from "@/lib/logger";

export function WalletSendPanel({ wallet }: { wallet: WalletSnapshot }) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);

  // CDP Hooks (safe no-op when disabled)
  const cdpTx = useCdpTransactions();
  const isCdpWallet =
    cdpTx.enabled &&
    typeof wallet.provider === "string" &&
    wallet.provider.toLowerCase().includes("cdp");
  const cdpChainKind =
    typeof wallet.metadata?.kind === "string" ? wallet.metadata.kind : null;

  // EVM Hooks (wagmi — for external EOA wallets)
  const { sendTransactionAsync } = useSendTransaction();
  const { data: ethBalance } = useBalance({ address: wallet.address as `0x${string}` });

  // Solana Hooks (wallet adapter — for external Solana wallets)
  const { publicKey, sendTransaction: sendSolanaTx } = useWallet();

  const isEVM =
    isCdpWallet
      ? cdpChainKind === "evm"
      : wallet.type === "external_evm" || wallet.type === "agent_generated";

  const handleSend = async () => {
    setIsSending(true);
    try {
      // ── Nex Wallet path ──────────────────────────────────────────
      if (isCdpWallet) {
        if (cdpChainKind === "evm") {
          if (!isAddress(recipient)) {
            toast.error("Invalid EVM Address");
            return;
          }
          const weiValue = parseEther(amount);
          const result = await cdpTx.sendEvmUserOperation({
            calls: [{ to: recipient, value: weiValue }],
          });
          toast.success(
            `Transaction submitted! UserOp: ${result.userOperationHash?.slice(0, 10)}...`
          );
        } else if (cdpChainKind === "solana") {
          toast.error(
            "Direct Nex Wallet (SOL) sends require the swap widget. Native SOL transfer support coming soon."
          );
          return;
        } else {
          toast.error(`Unsupported Nex Wallet chain kind: ${cdpChainKind}`);
          return;
        }
        setAmount("");
        setRecipient("");
        return;
      }

      // ── External wallet path (existing logic) ────────────────────
      if (isEVM) {
        if (!isAddress(recipient)) {
          toast.error("Invalid EVM Address");
          return;
        }
        await sendTransactionAsync({
          to: recipient,
          value: parseEther(amount),
        });
        toast.success("Transaction Sent!");
        setAmount("");
        setRecipient("");
      } else {
        // Solana via wallet adapter
        if (!publicKey) {
          toast.error("Solana wallet not connected");
          return;
        }

        const connection = new Connection(clusterApiUrl("devnet"));

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(recipient),
            lamports: parseFloat(amount) * LAMPORTS_PER_SOL,
          })
        );

        const signature = await sendSolanaTx(transaction, connection);
        await connection.confirmTransaction(signature, "processed");
        toast.success("Solana Transaction Sent: " + signature.slice(0, 8) + "...");
        setAmount("");
        setRecipient("");
      }
    } catch (e) {
      logger.error(e);
      toast.error("Transaction Failed");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto pr-1 custom-scrollbar">
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-[#171717] dark:text-white">Send Assets</h3>

        <div className="space-y-4">
          {/* Recipient */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#666666] dark:text-zinc-500">Recipient Address</label>
            <div className="relative">
              <Input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={isEVM ? "0x..." : "Solana address..."}
                className="h-12 border-black/10 bg-white/70 pr-10 text-[#171717] placeholder:text-[#666666] dark:border-white/5 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-600"
              />
              <ScanLine className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 cursor-pointer text-[#666666] hover:text-[#171717] dark:text-zinc-500 dark:hover:text-white" />
            </div>
          </div>

          {/* Asset selection limited to native token for now. */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#666666] dark:text-zinc-500">Asset</label>
            <div className="flex h-12 cursor-not-allowed items-center justify-between rounded-xl border border-black/10 bg-white/70 px-4 text-sm text-[#171717] opacity-80 dark:border-white/5 dark:bg-white/5 dark:text-white">
              <span className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-400">
                  {isEVM ? "E" : "S"}
                </div>
                {isEVM ? "Ethereum (ETH)" : "Solana (SOL)"}
              </span>
              <span className="text-xs text-[#666666] dark:text-zinc-500">
                Bal:{" "}
                {isEVM
                  ? ethBalance
                    ? formatUnits(ethBalance.value, ethBalance.decimals).slice(0, 6)
                    : "0.00"
                  : "0.00"}
              </span>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#666666] dark:text-zinc-500">Amount</label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              type="number"
              className="h-12 border-black/10 bg-white/70 text-lg font-medium text-[#171717] placeholder:text-[#666666] dark:border-white/5 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-600"
            />
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <ActionSlideButton
          label={isSending ? "Sending..." : "Send Transaction"}
          onClick={handleSend}
          loading={isSending}
          disabled={!parseEther(amount || "0") || !recipient || isSending}
        />
      </div>
    </div>
  );
}
