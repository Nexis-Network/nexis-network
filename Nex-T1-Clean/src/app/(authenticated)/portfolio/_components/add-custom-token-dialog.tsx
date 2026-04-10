"use client";

import { useState, useRef, useCallback, useActionState } from "react";
import { X, Upload, Loader2, AlertCircle } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustomTokens } from "@/lib/hooks/portfolio/use-custom-tokens";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { logger } from '@/lib/logger';
interface AddCustomTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chainId: string;
  chainName?: string;
}

export function AddCustomTokenDialog({
  open,
  onOpenChange,
  chainId,
  chainName,
}: AddCustomTokenDialogProps) {
  const { addCustomToken } = useCustomTokens();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formRef = useRef<HTMLFormElement>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    formRef.current?.reset();
    setLogoFile(null);
    setLogoPreview(null);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const [formError, formAction, isPending] = useActionState(
    async (prevState: string | null, formData: FormData) => {
      const contractAddressVal = formData.get("contractAddress") as string;
      const tokenNameVal = formData.get("tokenName") as string;
      const tokenSymbolVal = formData.get("tokenSymbol") as string;
      const decimalsVal = formData.get("decimals") as string;

      if (!contractAddressVal?.trim()) return "Contract address is required";
      if (chainId !== "solana" && !contractAddressVal.startsWith("0x")) return "Invalid contract address format";
      if (!tokenNameVal?.trim()) return "Token name is required";
      if (!tokenSymbolVal?.trim()) return "Token symbol is required";

      const decimalsNum = parseInt(decimalsVal, 10);
      if (isNaN(decimalsNum) || decimalsNum < 0 || decimalsNum > 18) return "Decimals must be between 0 and 18";

      try {
        await addCustomToken({
          chainId,
          contractAddress: contractAddressVal.trim(),
          name: tokenNameVal.trim(),
          symbol: tokenSymbolVal.trim().toUpperCase(),
          decimals: decimalsNum,
          logoFile: logoFile || undefined,
        });

        toast.success(`${tokenSymbolVal.toUpperCase()} added to your portfolio`);
        resetForm();
        onOpenChange(false);
        return null;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const code = (error as any)?.code;
        logger.error("Failed to add custom token:", message);

        if (message?.includes("duplicate") || code === "23505") {
          return "This token has already been added";
        }
        return message || "Failed to add token. Please try again.";
      }
    },
    null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-card border border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Add Custom Token
          </DialogTitle>
          <DialogDescription className="text-foreground/60 dark:text-white/60 text-sm">
            Add a custom token to your portfolio
            {chainName && ` on ${chainName}`}.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-5 mt-2">
          {/* Error Display */}
          {formError && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Contract Address */}
          <div className="space-y-2">
            <Label htmlFor="contractAddress" className="text-foreground/80 dark:text-white/80 text-sm">
              Contract Address <span className="text-red-400">*</span>
            </Label>
            <Input
              id="contractAddress"
              name="contractAddress"
              placeholder={chainId === "solana" ? "Token mint address..." : "0x..."}
              disabled={isPending}
              className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-[#00D5FF]/50"
            />
          </div>

          {/* Token Name */}
          <div className="space-y-2">
            <Label htmlFor="tokenName" className="text-foreground/80 dark:text-white/80 text-sm">
              Token Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="tokenName"
              name="tokenName"
              placeholder="e.g., My Token"
              disabled={isPending}
              className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-[#00D5FF]/50"
            />
          </div>

          {/* Token Symbol & Decimals Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tokenSymbol" className="text-foreground/80 dark:text-white/80 text-sm">
                Symbol <span className="text-red-400">*</span>
              </Label>
              <Input
                id="tokenSymbol"
                name="tokenSymbol"
                placeholder="e.g., MTK"
                maxLength={8}
                disabled={isPending}
                className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-[#00D5FF]/50 uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decimals" className="text-foreground/80 dark:text-white/80 text-sm">
                Decimals <span className="text-red-400">*</span>
              </Label>
              <Input
                id="decimals"
                name="decimals"
                type="number"
                min="0"
                max="18"
                defaultValue="18"
                disabled={isPending}
                className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-[#00D5FF]/50"
              />
            </div>
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label className="text-foreground/80 dark:text-white/80 text-sm">Token Logo (Optional)</Label>
            <div className="flex items-center gap-4">
              {/* Preview / Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "relative w-16 h-16 rounded-xl border-2 border-dashed transition-all cursor-pointer",
                  "flex items-center justify-center overflow-hidden",
                  logoPreview
                    ? "border-[#00D5FF]/30 bg-[#00D5FF]/5"
                    : "border-border hover:border-border/80 bg-muted/50"
                )}
              >
                {logoPreview ? (
                  <>
                    <Image
                      src={logoPreview}
                      alt="Token logo preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveLogo();
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <Upload className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 text-sm text-muted-foreground">
                <p>Click to upload a logo image</p>
                <p className="text-xs text-muted-foreground/70">PNG, JPG, SVG (max 2MB)</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={isPending}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#00D5FF] hover:bg-[#00D5FF]/90 text-black font-medium"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Token"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
