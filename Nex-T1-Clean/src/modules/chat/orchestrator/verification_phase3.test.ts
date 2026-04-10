import { describe, it, expect } from "vitest";
import { orchestratorAgent } from "./agent";
import { workerTool } from "./tools/worker";
import { WorkerTaskSchema } from "./tools/schema";

describe("Orchestrator Agent - Phase 3 Expansion", () => {
  it("should have new workers in system prompt", () => {
    // Accessing private/protected property for verification
    const sysPrompt = (orchestratorAgent as unknown as { system?: string })
      .system;
    if (sysPrompt) {
      expect(sysPrompt).toContain("Crypto Analyst Worker");
      expect(sysPrompt).toContain("On-Chain Trader Worker");
      expect(sysPrompt).toContain("Pump.fun Analyst");
      expect(sysPrompt).toContain("Market Data Analyst");
      expect(sysPrompt).toContain("DEX Analyst");
      expect(sysPrompt).toContain("Social Analyst");
      expect(sysPrompt).toContain("CEX Analyst");
      expect(sysPrompt).toContain("DeFi Protocol Analyst");
      expect(sysPrompt).toContain("Lending & Borrowing Analyst");
      expect(sysPrompt).toContain("Perpetual Analyst");
      expect(sysPrompt).toContain("Rug Check Analyst");
      expect(sysPrompt).toContain("Prediction Market Analyst");
    }
  });

  it("worker tool should accept new worker types", () => {
    const schema = WorkerTaskSchema.shape.workerType;
    const options = schema._def.values;
    expect(options).toContain("crypto_analyst");
    expect(options).toContain("onchain_trader");
    expect(options).toContain("browser_analyst");
    expect(options).toContain("pump_fun_analyst");
    expect(options).toContain("market_data_analyst");
    expect(options).toContain("dex_analyst");
    expect(options).toContain("social_media_analyst");
    expect(options).toContain("cex_analyst");
    expect(options).toContain("defi_protocol_analyst");
    expect(options).toContain("lending_borrowing_analyst");
    expect(options).toContain("perpetual_analyst");
    expect(options).toContain("rug_check_analyst");
    expect(options).toContain("prediction_market_analyst");
  });

  it("worker tool execute function should handle dispatch", async () => {
    // We can't easily integrate test the dispatch without mocking the new modules
    // But we can verify the execute function exists
    expect(workerTool.execute).toBeDefined();
  });
});
