"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { automationQueryKeys } from "@/modules/automation/services/automation-api.client";

export function useAutomationInvalidate() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: automationQueryKeys.sessionKeys }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: automationQueryKeys.strategies }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: automationQueryKeys.councils }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: automationQueryKeys.paymasterBalances }).catch(() => {});
  }, [queryClient]);
}

