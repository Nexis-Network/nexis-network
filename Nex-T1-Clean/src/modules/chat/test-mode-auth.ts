import {
  getNonProductionTestModeUserId,
  isNonProductionTestMode,
} from "@/server/auth/test-mode";

type AuthLike = {
  userId?: string | null;
  accessToken?: string | null;
};

const TEST_MODE_ACCESS_TOKENS = new Set([
  "test-mode-access-token",
  "dev-mock-token",
]);

export function isSyntheticNonProductionTestUserId(
  userId?: string | null,
): boolean {
  if (!isNonProductionTestMode()) {
    return false;
  }

  const normalizedUserId = userId?.trim() ?? null;
  if (!normalizedUserId) {
    return false;
  }

  return normalizedUserId === getNonProductionTestModeUserId();
}

export function isSyntheticNonProductionTestAuth(auth: AuthLike): boolean {
  return (
    isSyntheticNonProductionTestUserId(auth.userId) ||
    TEST_MODE_ACCESS_TOKENS.has(auth.accessToken?.trim() ?? "")
  );
}
