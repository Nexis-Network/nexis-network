"use client";

import { useEffect, useState } from "react";

export function useChatVoiceMode() {
  const [voiceModeActive, setVoiceModeActive] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVoiceModeChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ active?: boolean }>).detail;
      setVoiceModeActive(Boolean(detail?.active));
    };

    window.addEventListener("nex:voiceModeChanged", handleVoiceModeChanged);
    return () => {
      window.removeEventListener("nex:voiceModeChanged", handleVoiceModeChanged);
    };
  }, []);

  return {
    voiceModeActive,
  };
}
