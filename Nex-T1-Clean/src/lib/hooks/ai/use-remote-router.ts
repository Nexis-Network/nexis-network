"use client";

type RemoteStatus = {
  available: boolean;
  reason?: string;
};

const REMOTE_DISABLED_STATUS: RemoteStatus = {
  available: false,
  reason: "remote_orchestrator_removed",
};

export function useRemoteRouterStatus() {
  return {
    data: REMOTE_DISABLED_STATUS,
    isLoading: false,
    isFetching: false,
    refetch: () => Promise.resolve({ data: REMOTE_DISABLED_STATUS }),
  };
}
