"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useHeaderMainNavDropdownState() {
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openDropdown = useCallback((itemId: string) => {
    clearCloseTimer();
    setActiveDropdownId(itemId);
  }, [clearCloseTimer]);

  const closeDropdownSoon = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setActiveDropdownId(null);
      closeTimerRef.current = null;
    }, 140);
  }, [clearCloseTimer]);

  const closeDropdownImmediately = useCallback(() => {
    clearCloseTimer();
    setActiveDropdownId(null);
  }, [clearCloseTimer]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  return {
    activeDropdownId,
    clearCloseTimer,
    closeDropdownImmediately,
    closeDropdownSoon,
    openDropdown,
  };
}
