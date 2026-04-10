"use client";

/**
 * Grant Session Key Dialog
 * UI for granting agent access with permission configuration
 */

import { useState } from "react";
import { Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/settings/shared/settings-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSessionKeys } from "@/modules/wallets/nex/hooks";
import { SUPPORTED_MAINNET_CHAINS, DEFAULT_CHAIN_ID } from "@/modules/wallets/nex/chains";
import { parseEther } from "viem";

interface GrantSessionKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: `0x${string}`;
}

const EXPIRY_OPTIONS = [
  { label: "1 hour", ms: 60 * 60 * 1000 },
  { label: "6 hours", ms: 6 * 60 * 60 * 1000 },
  { label: "24 hours", ms: 24 * 60 * 60 * 1000 },
  { label: "3 days", ms: 3 * 24 * 60 * 60 * 1000 },
  { label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
];

const SPENDING_PRESETS = [
  { label: "0.01 ETH", value: "0.01" },
  { label: "0.05 ETH", value: "0.05" },
  { label: "0.1 ETH", value: "0.1" },
  { label: "0.5 ETH", value: "0.5" },
  { label: "1 ETH", value: "1" },
];

export function GrantSessionKeyDialog({
  open,
  onOpenChange,
  walletAddress,
}: GrantSessionKeyDialogProps) {
  const { grant, isGranting } = useSessionKeys();
  
  const [chainId, setChainId] = useState(DEFAULT_CHAIN_ID);
  const [spendingLimit, setSpendingLimit] = useState("0.1");
  const [expiryMs, setExpiryMs] = useState(EXPIRY_OPTIONS[2].ms); // Default 24 hours
  const [encryptionKey, setEncryptionKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleGrant = async () => {
    try {
      setError(null);
      
      if (!encryptionKey || encryptionKey.length < 8) {
        setError("Please enter a password (minimum 8 characters) to secure the session key.");
        return;
      }
      
      const spendingLimitWei = parseEther(spendingLimit).toString();
      
      await grant({
        walletAddress,
        chainId,
        permissions: {
          spendingLimit: spendingLimitWei,
          contractWhitelist: [], // Allow any contract
        },
        expiryMs,
        userEncryptionKey: encryptionKey,
      });
      
      setEncryptionKey(""); // Clear password from state
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grant access");
    }
  };

  const selectedChain = SUPPORTED_MAINNET_CHAINS.find(c => c.chainId === chainId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Grant Agent Access
          </DialogTitle>
          <DialogDescription>
            Allow AI agents to perform transactions on your behalf with limited
            permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Network</Label>
            <Select
              value={chainId.toString()}
              onValueChange={(v) => setChainId(parseInt(v, 10))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_MAINNET_CHAINS.map((chain) => (
                  <SelectItem key={chain.chainId} value={chain.chainId.toString()}>
                    {chain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Spending Limit (per transaction)</Label>
            <div className="flex gap-2">
              {SPENDING_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={spendingLimit === preset.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSpendingLimit(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={spendingLimit}
                onChange={(e) => setSpendingLimit(e.target.value)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                {selectedChain?.symbol ?? "ETH"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Expiration</Label>
            <Select
              value={expiryMs.toString()}
              onValueChange={(v) => setExpiryMs(parseInt(v, 10))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_OPTIONS.map((option) => (
                  <SelectItem key={option.ms} value={option.ms.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Security Password</Label>
            <Input
              type="password"
              placeholder="Enter a password to encrypt the session key"
              value={encryptionKey}
              onChange={(e) => setEncryptionKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This password encrypts the session key. Keep it safe.
            </p>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              The agent will only be able to send transactions up to{" "}
              <span className="font-medium">{spendingLimit} {selectedChain?.symbol ?? "ETH"}</span>{" "}
              per transaction. You can revoke access at any time.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGrant} disabled={isGranting}>
            {isGranting ? "Granting..." : "Grant Access"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
