"use client";

import { Check, Copy } from "lucide-react";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";


import { logger } from '@/lib/logger';
interface CopyToClipboardWidgetProps {
  text: string;
  label?: string;
  helperText?: string;
}

export function CopyToClipboardWidget({
  text,
  label,
  helperText,
}: CopyToClipboardWidgetProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied stripe test key to clipboard!");
    } catch (err) {
      logger.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="space-y-3">
      {label && <p className="text-sm text-zinc-600">{label}</p>}

      <Card className="w-full max-w-md overflow-hidden rounded-lg border border-zinc-200">
        <CardContent className="flex items-stretch p-0">
          <motion.div
            animate={{ opacity: 1 }}
            className="flex flex-grow items-center gap-2 truncate bg-zinc-50 p-4 font-mono text-sm text-zinc-700"
            initial={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CreditCardIcon className="size-4 text-zinc-500" />
            <code className="font-mono text-sm text-zinc-800">{text}</code>
          </motion.div>
          <Button
            aria-label={copied ? "Copied" : "Copy to clipboard"}
            className="relative h-auto overflow-hidden rounded-none px-4 transition-colors"
            onClick={copyToClipboard}
            variant="ghost"
          >
            <AnimatePresence initial={false} mode="wait">
              {copied ? (
                <motion.div
                  animate={{ y: 0, opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center text-green-600"
                  exit={{ y: -20, opacity: 0 }}
                  initial={{ y: 20, opacity: 0 }}
                  key="check"
                  transition={{ duration: 0.2 }}
                >
                  <Check size={18} />
                </motion.div>
              ) : (
                <motion.div
                  animate={{ y: 0, opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center text-zinc-500"
                  exit={{ y: -20, opacity: 0 }}
                  initial={{ y: 20, opacity: 0 }}
                  key="copy"
                  transition={{ duration: 0.2 }}
                >
                  <Copy size={18} />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </CardContent>
      </Card>
      {helperText && <p className="text-xs text-zinc-500">{helperText}</p>}
    </div>
  );
}

const CreditCardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    color={"#000000"}
    fill={"none"}
    height={24}
    viewBox="0 0 24 24"
    width={24}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M10.5 20H13.5C17.2586 20 19.1379 20 20.3925 19.0091C20.5932 18.8506 20.7788 18.676 20.9472 18.4871C22 17.3062 22 15.5375 22 12C22 10.8169 22 9.8316 21.9606 9H2.03939C2 9.8316 2 10.8169 2 12C2 15.5375 2 17.3062 3.0528 18.4871C3.22119 18.676 3.40678 18.8506 3.60746 19.0091C4.86213 20 6.74142 20 10.5 20Z"
      fill="currentColor"
      opacity="0.4"
    />
    <path
      d="M2 12C2 8.46252 2 6.69377 3.0528 5.5129C3.22119 5.32403 3.40678 5.14935 3.60746 4.99087C4.86213 4 6.74142 4 10.5 4H13.5C17.2586 4 19.1379 4 20.3925 4.99087C20.5932 5.14935 20.7788 5.32403 20.9472 5.5129C22 6.69377 22 8.46252 22 12C22 15.5375 22 17.3062 20.9472 18.4871C20.7788 18.676 20.5932 18.8506 20.3925 19.0091C19.1379 20 17.2586 20 13.5 20H10.5C6.74142 20 4.86213 20 3.60746 19.0091C3.40678 18.8506 3.22119 18.676 3.0528 18.4871C2 17.3062 2 15.5375 2 12Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M10 16H11.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit="10"
      strokeWidth="1.5"
    />
    <path
      d="M14.5 16L18 16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit="10"
      strokeWidth="1.5"
    />
    <path
      d="M2 9H22"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);
