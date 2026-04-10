type CookieReader = {
  get(name: string): { value?: string } | undefined;
} | {
  getAll(): Array<{ name: string; value?: string }>;
} | null | undefined;

type TestModeOptions = {
  request?: Request | null;
  cookies?: CookieReader;
};

function readCookieValue(source: CookieReader, name: string) {
  const value =
    source && "get" in source
      ? source.get(name)?.value
      : source && "getAll" in source
        ? source.getAll().find((cookie) => cookie.name === name)?.value
        : undefined;
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveCookieReader(options: TestModeOptions): CookieReader {
  if (options.cookies) {
    return options.cookies;
  }

  if (options.request && "cookies" in options.request) {
    return (options.request as Request & { cookies: CookieReader }).cookies;
  }

  return null;
}

export function isNonProductionTestMode(options: TestModeOptions = {}) {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const cookies = resolveCookieReader(options);
  const testModeCookie = readCookieValue(cookies, "__TEST_MODE");

  return (
    process.env.E2E_TEST_MODE === "true" ||
    process.env.NEXT_PUBLIC_TEST_MODE === "true" ||
    process.env.DEV_AUTH_BYPASS === "true" ||
    testModeCookie === "true" ||
    testModeCookie === "1"
  );
}

export function getNonProductionTestModeOrgId(options: TestModeOptions = {}) {
  const cookies = resolveCookieReader(options);
  return readCookieValue(cookies, "org_active_account") ?? "test-org";
}

const DEFAULT_NON_PRODUCTION_TEST_MODE_USER_ID =
  "00000000-0000-0000-0000-000000000000";

export function getNonProductionTestModeUserId(options: TestModeOptions = {}) {
  const cookies = resolveCookieReader(options);
  return (
    readCookieValue(cookies, "__TEST_USER_ID") ??
    process.env.NEXT_PUBLIC_DEV_AUTH_USER_ID?.trim() ??
    DEFAULT_NON_PRODUCTION_TEST_MODE_USER_ID
  );
}
