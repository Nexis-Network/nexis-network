import { describe, expect, it } from "vitest";

import {
  getSourceDescription,
  getSourceDisplayName,
  getSourceFaviconUrl,
  getSourceHostname,
  getSourceTitle,
} from "./source-metadata";

describe("source-metadata", () => {
  it("prefers mapped brand labels over raw hostnames", () => {
    expect(
      getSourceDisplayName({
        title: "CoinGecko market data",
        url: "https://www.coingecko.com/en/coins/bitcoin",
      }),
    ).toBe("CoinGecko");

    expect(
      getSourceDisplayName({
        title: "Google Maps listing",
        url: "https://maps.app.goo.gl/example",
      }),
    ).toBe("Google Maps");
  });

  it("falls back to normalized hostnames for unknown sources", () => {
    expect(
      getSourceDisplayName({
        title: "",
        url: "https://sub.example.org/path/to/article",
      }),
    ).toBe("sub.example.org");

    expect(getSourceHostname("https://www.example.org/path")).toBe(
      "example.org",
    );
  });

  it("uses the first sentence of a snippet for the popup description", () => {
    expect(
      getSourceDescription({
        title: "Example article",
        url: "https://example.org/article",
        snippet:
          "First sentence explains the source. Second sentence should be trimmed.",
      }),
    ).toBe("First sentence explains the source.");
  });

  it("provides stable fallback title and description values", () => {
    expect(
      getSourceTitle({
        title: "",
        url: "https://unknown.example/path",
      }),
    ).toBe("unknown.example");

    expect(
      getSourceDescription({
        title: "",
        url: "https://unknown.example/path",
        snippet: "",
      }),
    ).toBe("Referenced source from unknown.example.");
  });

  it("builds a remote favicon url for unmapped hosts", () => {
    expect(getSourceFaviconUrl("https://news.example.com/article")).toBe(
      "https://www.google.com/s2/favicons?domain=news.example.com&sz=64",
    );
  });
});
