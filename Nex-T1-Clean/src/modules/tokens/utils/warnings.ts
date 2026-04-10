import type { TokenAssetInfo, TokenWarning } from "@/modules/tokens/types";

export function resolveTokenWarnings(token: TokenAssetInfo | null): TokenWarning[] {
  if (!token) {
    return [];
  }

  if (token.supportStatus === "banned" || token.safetyStatus === "blocked") {
    return [
      {
        code: "token_banned",
        severity: "high",
        message: "This token is blocked and cannot be used.",
        blocking: true,
      },
    ];
  }

  if (token.supportStatus === "broken") {
    return [
      {
        code: "token_broken",
        severity: "high",
        message: "This token is visible for reference only and cannot be executed.",
        blocking: true,
      },
    ];
  }

  if (token.supportStatus === "unsupported") {
    return [
      {
        code: "token_unsupported",
        severity: "medium",
        message: "This token is not part of the default supported set.",
        blocking: false,
      },
    ];
  }

  if (token.isCustom || token.safetyStatus === "non_default") {
    return [
      {
        code: "token_unverified",
        severity: "low",
        message: "This token is user-imported or non-default. Verify the address before use.",
        blocking: false,
      },
    ];
  }

  return [];
}

export function isTokenSelectable(
  token: TokenAssetInfo,
  options?: { allowUnsupported?: boolean },
): boolean {
  if (token.supportStatus === "banned" || token.supportStatus === "broken") {
    return false;
  }

  if (token.supportStatus === "unsupported") {
    return options?.allowUnsupported ?? false;
  }

  return true;
}
