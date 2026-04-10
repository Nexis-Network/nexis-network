"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AdminStatusResponse } from "@/types/admin";

interface AdminSessionContextValue {
  status: AdminStatusResponse | null;
  setStatus: (next: AdminStatusResponse | null) => void;
  refresh: () => Promise<AdminStatusResponse | null>;
}

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

interface AdminSessionProviderProps {
  initialStatus: AdminStatusResponse;
  children: ReactNode;
}

export function AdminSessionProvider({ initialStatus, children }: AdminSessionProviderProps) {
  const [status, setStatus] = useState<AdminStatusResponse | null>(initialStatus ?? null);

  useEffect(() => {
    setStatus(initialStatus ?? null);
  }, [initialStatus]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auth/status", { cache: "no-store" });
      const next = (await res.json()) as AdminStatusResponse;
      setStatus(next);
      return next;
    } catch (error) {
      const fallback: AdminStatusResponse = {
        authenticated: false,
        error: error instanceof Error ? error.message : "Failed to refresh admin status",
      };
      setStatus(fallback);
      return fallback;
    }
  }, []);

  const value = useMemo<AdminSessionContextValue>(
    () => ({ status, setStatus, refresh }),
    [status, refresh]
  );

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminSessionContextValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error("useAdminSession must be used within an AdminSessionProvider");
  }
  return ctx;
}
