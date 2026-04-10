export type ParsedEvmWalletResult = {
  address: string;
  privateKey: string | null;
  publicKey: string | null;
  mnemonic: string | null;
  encryptedJson: string | null;
};

const LABEL_LINE_REGEX = (label: string) =>
  new RegExp(`${label}\\s*:\\s*(.+)`, "i");

export function parseEvmWalletResult(text: string): ParsedEvmWalletResult {
  const address = extractLine(text, "Address");
  if (!address) {
    throw new Error("Wallet address missing from MCP response");
  }

  const privateKey = extractLine(text, "Private Key");
  const publicKey = extractLine(text, "Public Key");
  const mnemonic = extractLine(text, "Mnemonic");
  const encryptedJson = extractEncryptedJson(text);

  return {
    address,
    privateKey,
    publicKey,
    mnemonic,
    encryptedJson,
  };
}

export function extractEncryptedJson(text: string): string | null {
  const match = text.match(/\{[\s\S]*?\}/m);
  if (!match) {
    return null;
  }
  const candidate = match[0];
  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === "object") {
      return candidate;
    }
  } catch {
    // ignore parse error
  }
  return null;
}

export function extractLine(text: string, label: string): string | null {
  const match = text.match(LABEL_LINE_REGEX(label));
  if (!match) {
    return null;
  }
  return match[1]?.trim()?.replace(/"$/, "") ?? null;
}

export function extractNumberFromLine(text: string, label: string): number | null {
  const value = extractLine(text, label);
  if (!value) {
    return null;
  }
  const numeric = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}
