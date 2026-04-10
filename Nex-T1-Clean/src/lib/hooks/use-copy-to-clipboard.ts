"use client";

import { useEffect, useState, useCallback } from "react";


import { logger } from '@/lib/logger';
export function useCopyToClipboard(resetInterval: number | null = null) {
  const [isCopied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string | number) => {
      if (typeof text !== "string" && typeof text !== "number") {
        setCopied(false);
        return;
      }

      try {
        await navigator.clipboard.writeText(text.toString());
        setCopied(true);
      } catch {
        // Fallback for older browsers or non-secure contexts
        try {
          const textArea = document.createElement("textarea");
          textArea.value = text.toString();
          textArea.style.position = "fixed";
          textArea.style.left = "-9999px";
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
          setCopied(true);
        } catch (err) {
            logger.error("Failed to copy", err);
            setCopied(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isCopied && resetInterval) {
      timeout = setTimeout(() => setCopied(false), resetInterval);
    }
    return () => clearTimeout(timeout);
  }, [isCopied, resetInterval]);

  return { isCopied, copy };
}
