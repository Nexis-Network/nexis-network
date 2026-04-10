export type EnsStatus = {
  claim: {
    id: string;
    ens_name: string;
    status: string;
    last_error?: string | null;
  } | null;
  walletAddress: string | null;
  canClaim: boolean;
  claimAvailabilityError: string | null;
  suggestedLabel: string;
  validationError: string | null;
};

export type PreparedClaim = {
  claim: { id: string };
  mainnetReverseHash: `0x${string}`;
  baseReverseHash: `0x${string}`;
};

export async function readEnsApi<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const errorMessage =
      typeof payload?.error === "object" &&
      payload?.error !== null &&
      typeof payload.error.message === "string"
        ? payload.error.message
        : typeof payload?.message === "string"
          ? payload.message
          : "ENS request failed.";
    throw new Error(errorMessage);
  }

  return (payload?.data ?? payload) as T;
}

export function waitForEns(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
