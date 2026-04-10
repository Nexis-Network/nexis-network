"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isAddress } from "viem";


import { logger } from '@/lib/logger';
interface AddCustomTokenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chainType: "evm" | "solana";
  onAdd: (address: string) => Promise<boolean>;
}

export function AddCustomTokenDialog({
  isOpen,
  onClose,
  chainType,
  onAdd,
}: AddCustomTokenDialogProps) {
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    if (chainType === "evm" && !isAddress(address)) {
      toast.error("Invalid EVM address");
      return;
    }
    // Simple Solana address validation (base58, length 32-44)
    if (chainType === "solana" && (address.length < 32 || address.length > 44)) {
        toast.error("Invalid Solana address format");
        return;
    }

    setIsLoading(true);
    try {
      const success = await onAdd(address);
      if (success) {
        toast.success("Token added successfully");
        setAddress("");
        onClose();
      }
    } catch (error) {
      toast.error("Failed to add token");
      logger.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-[#121212] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Add custom token</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="token-address" className="text-zinc-400">
              {chainType === "evm" ? "Token Contract Address" : "Token Mint Address"}
            </Label>
            <Input
              id="token-address"
              placeholder={chainType === "evm" ? "0x..." : "Solana Mint Address"}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="bg-white/5 border-white/10 text-white focus:ring-white/20"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="text-zinc-400 hover:text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!address || isLoading}
              className="bg-white text-black hover:bg-zinc-200"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Token
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
