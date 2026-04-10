export function isNonProductionClientTestMode(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const hasTestModeCookie =
    typeof document !== "undefined" && document.cookie.includes("__TEST_MODE=true");

  return (
    hasTestModeCookie ||
    (typeof window !== "undefined" &&
      (window as Window & { __TEST_MODE?: boolean }).__TEST_MODE === true) ||
    process.env.NEXT_PUBLIC_TEST_MODE === "true" ||
    process.env.E2E_TEST_MODE === "true"
  );
}
