import { beforeEach, describe, expect, it } from "vitest";

import {
  EnsSubnameRuntimeUnavailableError,
  assertEnsSubnameRuntimeReady,
  getEnsSubnameRuntimeReadiness,
} from "./subnames.runtime";

const originalEnv = { ...process.env };

function restoreEnsRuntimeEnv(): void {
  process.env = { ...originalEnv };
  delete process.env.ENS_SUBNAME_REGISTRAR_ADDRESS;
  delete process.env.ENS_SUBNAME_RELAYER_PRIVATE_KEY;
  delete process.env.ENS_RELAYER_PRIVATE_KEY;
  delete process.env.ENS_MAINNET_RPC_URL;
  delete process.env.PREMIUM_RPC_URL_ETHEREUM;
  delete process.env.ETHEREUM_RPC_URL;
  delete process.env.BASE_RPC_URL;
  delete process.env.PREMIUM_RPC_URL_BASE;
}

describe("ENS runtime readiness", () => {
  beforeEach(() => {
    restoreEnsRuntimeEnv();
  });

  it("reports missing dedicated ENS runtime configuration", () => {
    const readiness = getEnsSubnameRuntimeReadiness();

    expect(readiness.ready).toBe(false);
    expect(readiness.missingEnvNames).toEqual([
      "ENS_SUBNAME_REGISTRAR_ADDRESS",
      "ENS_SUBNAME_RELAYER_PRIVATE_KEY",
      "ENS_MAINNET_RPC_URL",
      "BASE_RPC_URL",
    ]);
  });

  it("accepts dedicated ENS relayer + RPC configuration", () => {
    process.env.ENS_SUBNAME_REGISTRAR_ADDRESS =
      "0x1111111111111111111111111111111111111111";
    process.env.ENS_SUBNAME_RELAYER_PRIVATE_KEY = `0x${"11".repeat(32)}`;
    process.env.ENS_MAINNET_RPC_URL = "https://eth.example.invalid";
    process.env.BASE_RPC_URL = "https://base.example.invalid";

    const readiness = getEnsSubnameRuntimeReadiness();

    expect(readiness.ready).toBe(true);
    expect(readiness.message).toBeNull();
    expect(readiness.missingEnvNames).toEqual([]);
  });

  it("throws a typed error when runtime config is missing", () => {
    expect(() => assertEnsSubnameRuntimeReady()).toThrow(
      EnsSubnameRuntimeUnavailableError,
    );
  });
});
