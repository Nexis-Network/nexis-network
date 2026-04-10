"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

const ACTIVE_ACCOUNT_COOKIE = "org_active_account";

type ActiveAccountContextValue = {
  accountId: string | null;
  setAccountId: (next: string | null) => void;
};

const ActiveAccountContext = createContext<ActiveAccountContextValue | undefined>(
  undefined,
);

function readCookie(...names: string[]): string | null {
  if (typeof document === "undefined") return null;
  for (const name of names) {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`));
    if (match) {
      return decodeURIComponent(match.split("=")[1] ?? "");
    }
  }
  return null;
}

function writeCookie(name: string, value: string | null) {
  if (typeof document === "undefined") return;
  if (!value) {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    return;
  }
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

export function ActiveAccountProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [accountId, setAccountIdState] = useState<string | null>(null);

  useEffect(() => {
    // hydrate from cookie/localStorage on mount
    try {
      const fromCookie = readCookie(ACTIVE_ACCOUNT_COOKIE);
      const fromStorage = localStorage.getItem(ACTIVE_ACCOUNT_COOKIE);
      const next = fromCookie || fromStorage;
      if (next) setAccountIdState(next);
    } catch {
      // ignore
    }
  }, []);

  const setAccountId = useCallback(
    (next: string | null) => {
      setAccountIdState(next);
      try {
        if (next) {
          localStorage.setItem(ACTIVE_ACCOUNT_COOKIE, next);
        } else {
          localStorage.removeItem(ACTIVE_ACCOUNT_COOKIE);
        }
      } catch {
        // ignore
      }
      writeCookie(ACTIVE_ACCOUNT_COOKIE, next);
      // Invalidate account-scoped queries
      queryClient.invalidateQueries({ predicate: () => true });
    },
    [queryClient],
  );

  const value = useMemo<ActiveAccountContextValue>(
    () => ({ accountId, setAccountId }),
    [accountId, setAccountId],
  );

  return (
    <ActiveAccountContext.Provider value={value}>{children}</ActiveAccountContext.Provider>
  );
}

export function useActiveAccountContext() {
  const ctx = useContext(ActiveAccountContext);
  if (!ctx) throw new Error("useActiveAccountContext must be used within ActiveAccountProvider");
  return ctx;
}
