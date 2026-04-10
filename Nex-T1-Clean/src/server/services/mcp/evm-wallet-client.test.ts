import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EvmWalletMcpClient } from "./evm-wallet-client";

describe("EvmWalletMcpClient", () => {
  const originalTransport = process.env.MCP_EVM_WALLET_TRANSPORT;

  beforeEach(() => {
    delete process.env.MCP_EVM_WALLET_TRANSPORT;
  });

  afterEach(() => {
    process.env.MCP_EVM_WALLET_TRANSPORT = originalTransport;
    vi.restoreAllMocks();
  });

  it("defaults nex wallet MCP traffic to HTTP and preserves /mcp base paths", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        result: {
          content: [{ type: "text", text: "0xabc" }],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvmWalletMcpClient({
      baseUrl: "https://mcp.nex-t1.ai/mcp",
    });

    const result = await client.invokeRaw("wallet_get_address");

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://mcp.nex-t1.ai/mcp/messages",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("honors an explicit streamable-http override", async () => {
    process.env.MCP_EVM_WALLET_TRANSPORT = "streamable-http";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => {
            let done = false;

            return {
              read: async () => {
                if (done) {
                  return { done: true, value: undefined };
                }

                done = true;
                return {
                  done: false,
                  value: new TextEncoder().encode(
                    "event: endpoint\ndata: /messages?sessionId=test-session\n\n",
                  ),
                };
              },
              cancel: async () => undefined,
            };
          },
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          result: {
            content: [{ type: "text", text: "0xdef" }],
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvmWalletMcpClient({
      baseUrl: "https://mcp.nex-t1.ai/mcp",
    });

    const result = await client.invokeRaw("wallet_get_address");

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://mcp.nex-t1.ai/mcp/sse",
      expect.objectContaining({
        method: "GET",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://mcp.nex-t1.ai/mcp/messages?sessionId=test-session",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("\"method\":\"tools/call\""),
      }),
    );
  });

  it("maps the httpstream transport alias to streamable-http", async () => {
    process.env.MCP_EVM_WALLET_TRANSPORT = "httpstream";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => {
            let done = false;

            return {
              read: async () => {
                if (done) {
                  return { done: true, value: undefined };
                }

                done = true;
                return {
                  done: false,
                  value: new TextEncoder().encode(
                    "event: endpoint\ndata: /messages?sessionId=test-alias\n\n",
                  ),
                };
              },
              cancel: async () => undefined,
            };
          },
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          result: {
            content: [{ type: "text", text: "0xalias" }],
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvmWalletMcpClient({
      baseUrl: "https://mcp.nex-t1.ai/mcp",
    });

    const result = await client.invokeRaw("wallet_get_address");

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://mcp.nex-t1.ai/mcp/sse",
      expect.objectContaining({
        method: "GET",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://mcp.nex-t1.ai/mcp/messages?sessionId=test-alias",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("\"method\":\"tools/call\""),
      }),
    );
  });
});
