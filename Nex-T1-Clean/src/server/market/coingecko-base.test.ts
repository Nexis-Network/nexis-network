import { describe, expect, it } from "vitest";

import {
  isCoingeckoDemoKeyMismatchError,
  isCoingeckoProKeyMismatchError,
  isCoingeckoProApiBase,
  resolveCoingeckoApiBase,
  resolveCoingeckoCredentials,
  resolveCoingeckoWsAuthQuery,
} from "@/server/market/coingecko-base";

describe("resolveCoingeckoApiBase", () => {
  it("normalizes known CoinGecko hosts to include /api/v3", () => {
    expect(resolveCoingeckoApiBase({ apiKey: "pro-key", envBase: "https://pro-api.coingecko.com" }))
      .toBe("https://pro-api.coingecko.com/api/v3");
    expect(resolveCoingeckoApiBase({ apiKey: "", envBase: "https://api.coingecko.com" }))
      .toBe("https://api.coingecko.com/api/v3");
  });

  it("falls back to public base when pro host is configured without pro key", () => {
    expect(resolveCoingeckoApiBase({ apiKey: undefined, envBase: "https://pro-api.coingecko.com/api/v3" }))
      .toBe("https://api.coingecko.com/api/v3");
  });
});

describe("isCoingeckoProApiBase", () => {
  it("detects pro host api bases", () => {
    expect(isCoingeckoProApiBase("https://pro-api.coingecko.com")).toBe(true);
    expect(isCoingeckoProApiBase("https://pro-api.coingecko.com/api/v3")).toBe(true);
  });

  it("returns false for public or invalid hosts", () => {
    expect(isCoingeckoProApiBase("https://api.coingecko.com/api/v3")).toBe(false);
    expect(isCoingeckoProApiBase("not-a-url")).toBe(false);
    expect(isCoingeckoProApiBase(undefined)).toBe(false);
  });
});

describe("resolveCoingeckoCredentials", () => {
  it("treats COINGECKO_API_KEY as pro key by default", () => {
    expect(resolveCoingeckoCredentials({ apiKey: "CG-any-prefix" }))
      .toEqual({ proApiKey: "CG-any-prefix", demoApiKey: undefined });
  });

  it("keeps demo and pro credentials separate", () => {
    expect(
      resolveCoingeckoCredentials({
        apiKey: "pro-key",
        demoApiKey: "demo-key",
      }),
    ).toEqual({ proApiKey: "pro-key", demoApiKey: "demo-key" });
  });

  it("deduplicates identical demo/pro values", () => {
    expect(
      resolveCoingeckoCredentials({
        apiKey: "same-key",
        demoApiKey: "same-key",
      }),
    ).toEqual({ proApiKey: "same-key", demoApiKey: undefined });
  });
});

describe("resolveCoingeckoWsAuthQuery", () => {
  it("prefers pro websocket auth parameter", () => {
    expect(resolveCoingeckoWsAuthQuery({ proApiKey: "pro", demoApiKey: "demo" }))
      .toEqual({ name: "x_cg_pro_api_key", value: "pro" });
  });

  it("falls back to demo websocket auth parameter", () => {
    expect(resolveCoingeckoWsAuthQuery({ demoApiKey: "demo" }))
      .toEqual({ name: "x_cg_demo_api_key", value: "demo" });
  });
});

describe("isCoingeckoDemoKeyMismatchError", () => {
  it("detects error_code 10011 in structured payloads", () => {
    expect(
      isCoingeckoDemoKeyMismatchError({
        error_code: 10011,
        status: { error_message: "demo key provided against pro host" },
      }),
    ).toBe(true);
  });

  it("detects error_code 10011 when JSON is embedded in an SDK error string", () => {
    expect(
      isCoingeckoDemoKeyMismatchError(
        '400 {"timestamp":"2026-02-23T21:08:04.690+00:00","error_code":10011,"status":{"error_message":"If you are using Demo API key, please change your root URL from pro-api.coingecko.com to api.coingecko.com"}}',
      ),
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(
      isCoingeckoDemoKeyMismatchError({
        error_code: 10004,
        status: { error_message: "invalid api key" },
      }),
    ).toBe(false);
  });
});

describe("isCoingeckoProKeyMismatchError", () => {
  it("detects error_code 10010 when JSON is embedded in an SDK error string", () => {
    expect(
      isCoingeckoProKeyMismatchError(
        '400 {"timestamp":"2026-03-22T08:36:37.424+00:00","error_code":10010,"status":{"error_message":"If you are using Pro API key, please change your root URL from api.coingecko.com to pro-api.coingecko.com"}}',
      ),
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(
      isCoingeckoProKeyMismatchError({
        error_code: 10011,
        status: { error_message: "demo host mismatch" },
      }),
    ).toBe(false);
  });
});
