"use client";

import { createContext, useContext } from "react";

import type { BillingState } from "@/lib/hooks/billing/use-billing";
import type { ProfileAggregate } from "@/lib/user/profile";

export type AuthenticatedShellData = {
  billingLoading: boolean;
  billingPlan: BillingState["plan"];
  profileData: ProfileAggregate | undefined;
  profileLoading: boolean;
  serverSessionReady: boolean;
};

export const AuthenticatedShellDataContext =
  createContext<AuthenticatedShellData | null>(null);

export function useAuthenticatedShellDataOptional() {
  return useContext(AuthenticatedShellDataContext);
}
