const PRIVATE_KEY_REGEX = /0x[a-f0-9]{64}\b/i;
const API_KEY_REGEX = /(sk|rk|pk|api)[-_][a-z0-9]{20,}/i;
const SESSION_TOKEN_REGEX = /(sess|token)[-_][a-z0-9]{16,}/i;
const SENSITIVE_KEYWORDS = [
  "seed phrase",
  "mnemonic",
  "private key",
  "api key",
  "password",
  "secret key",
];

function looksLikeMnemonic(value: string): boolean {
  const words = value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length !== 12 && words.length !== 24) {
    return false;
  }

  return words.every((word) => /^[a-z]+$/.test(word));
}

export function containsSensitiveContent(input: string): boolean {
  if (!input) {
    return false;
  }

  const normalized = input.trim();
  if (!normalized) {
    return false;
  }

  if (PRIVATE_KEY_REGEX.test(normalized)) {
    return true;
  }

  if (API_KEY_REGEX.test(normalized) || SESSION_TOKEN_REGEX.test(normalized)) {
    return true;
  }

  const lower = normalized.toLowerCase();
  if (SENSITIVE_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return true;
  }

  return looksLikeMnemonic(lower);
}
