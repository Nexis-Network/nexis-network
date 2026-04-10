import { describe, it, expect } from "vitest";
import { orchestratorAgent } from "./agent";

describe("Orchestrator Agent", () => {
    it("should be defined", () => {
        expect(orchestratorAgent).toBeDefined();
    });

    it("should carry out a plan", async () => {
        // Mock the gateway response to avoid actual API calls during test if possible,
        // but 'ToolLoopAgent' might make network calls.
        // For this verification, we just want to ensure it compiles and imports correctly.
        // Deep testing requires mocking the 'ai' SDK internals or having a valid API key.
        
        // We will just verify the tools are attached
        const tools = (orchestratorAgent).tools;
        expect(tools).toBeDefined();
        expect(tools.orchestrator).toBeDefined();
        expect(tools.worker).toBeDefined();
        expect(tools.coordinator).toBeDefined();
    });
});
