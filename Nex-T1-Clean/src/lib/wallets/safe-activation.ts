export type SafeActivationTx = {
  chainId: number;
  safeAddress: `0x${string}`;
  to: `0x${string}`;
  data: `0x${string}`;
  value: string;
};

export type SafeActivationResponse =
  | { ok: true; status: "ready"; safeAddress: `0x${string}` }
  | { ok: true; status: "activation_required"; activation: SafeActivationTx };

type UnknownRecord = Record<string, UntypedJson>;

function isRecord(value: UntypedJson): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function isActivationPayload(value: UntypedJson): value is SafeActivationTx {
  if (!isRecord(value)) return false;
  const chainId = value.chainId;
  const safeAddress = value.safeAddress;
  const to = value.to;
  const data = value.data;
  const txValue = value.value;
  return (
    typeof chainId === "number" &&
    Number.isFinite(chainId) &&
    chainId > 0 &&
    typeof safeAddress === "string" &&
    safeAddress.startsWith("0x") &&
    typeof to === "string" &&
    to.startsWith("0x") &&
    typeof data === "string" &&
    data.startsWith("0x") &&
    typeof txValue === "string"
  );
}

export function coerceActivationPayloads(value: UntypedJson): SafeActivationTx[] {
  if (Array.isArray(value)) {
    return value.filter(isActivationPayload);
  }
  if (isActivationPayload(value)) {
    return [value];
  }
  return [];
}

export async function requestSafeActivation(params: {
  chainId: number;
  safeAddress: `0x${string}`;
}): Promise<SafeActivationResponse> {
  const res = await fetch("/api/wallets/safe/activate", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(String((json)?.message ?? (json)?.error ?? "safe_activation_failed"));
  }
  return json as SafeActivationResponse;
}

export async function confirmSafeActivation(params: {
  chainId: number;
  safeAddress: `0x${string}`;
  txHash?: `0x${string}` | null;
}): Promise<{ ok: true; status: "ready"; safeAddress: `0x${string}` } | { ok: false; status: "pending" }> {
  const res = await fetch("/api/wallets/safe/activate/confirm", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json().catch(() => ({}));
  if (res.ok) {
    return { ok: true, status: "ready", safeAddress: (json).safeAddress as `0x${string}` };
  }
  if ((json)?.status === "pending") {
    return { ok: false, status: "pending" };
  }
  throw new Error(String((json)?.message ?? (json)?.error ?? "safe_activation_confirm_failed"));
}

export function parseActivationValue(value: string | null | undefined): bigint {
  const raw = value?.trim() ?? "0";
  if (raw.startsWith("0x") || raw.startsWith("0X")) {
    return BigInt(raw);
  }
  return BigInt(raw || "0");
}
