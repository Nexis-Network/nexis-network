export const ENS_SUBNAME_PARENT_NAME = "nex-t1.eth";
export const ENS_SUBNAME_MIN_LENGTH = 3;
export const ENS_SUBNAME_MAX_LENGTH = 32;
export const ENS_SUBNAME_REGEX = /^[a-z0-9-]{3,32}$/;

export type EnsSubnameValidationResult = {
  valid: boolean;
  normalizedLabel: string;
  ensName: string | null;
  error: string | null;
};

export function normalizeEnsSubnameLabel(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function formatEnsSubname(label: string): string {
  return `${label}.${ENS_SUBNAME_PARENT_NAME}`;
}

export function validateEnsSubnameLabel(value: string | null | undefined): EnsSubnameValidationResult {
  const normalizedLabel = normalizeEnsSubnameLabel(value);

  if (normalizedLabel.length < ENS_SUBNAME_MIN_LENGTH || normalizedLabel.length > ENS_SUBNAME_MAX_LENGTH) {
    return {
      valid: false,
      normalizedLabel,
      ensName: null,
      error: `Username must be ${ENS_SUBNAME_MIN_LENGTH}-${ENS_SUBNAME_MAX_LENGTH} characters.`,
    };
  }

  if (!ENS_SUBNAME_REGEX.test(normalizedLabel)) {
    return {
      valid: false,
      normalizedLabel,
      ensName: null,
      error: "Username may only include lowercase letters, numbers, and hyphens.",
    };
  }

  if (normalizedLabel.startsWith("-") || normalizedLabel.endsWith("-")) {
    return {
      valid: false,
      normalizedLabel,
      ensName: null,
      error: "Username cannot start or end with a hyphen.",
    };
  }

  return {
    valid: true,
    normalizedLabel,
    ensName: formatEnsSubname(normalizedLabel),
    error: null,
  };
}

export function isEnsSubnameLabel(value: string | null | undefined): boolean {
  return validateEnsSubnameLabel(value).valid;
}

