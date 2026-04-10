import {
  convertToModelMessages,
  createUIMessageStream,
  streamText,
  type Tool,
  type UIMessage,
} from "ai";

import { resolveArtifactMarketContext } from "@/modules/prices/artifact-market-context";

const BURN_RATE_PAYLOAD_STRUCTURE = `\
\`\`\`json
{
  "stage": "loading|streaming|complete",
  "progress": 0,
  "title": "<string>",
  "summary": "<string>",
  "chartType": "line|bar|area|mixed",
  "datasets": [{ "id": "<string>", "label": "<string>", "values": [{ "x": "<label>", "y": 0 }]}],
  "metrics": [{ "id": "<string>", "label": "<string>", "value": 0, "formattedValue"?: "<string>", "deltaPercentage"?: 0, "trend"?: "up|down|flat" }],
  "panels": [{ "id": "<string>", "title": "<string>", "description"?: "<string>", "metrics"?: [], "insights"?: [] }],
  "insights": [{ "id": "<string>", "title": "<string>", "description": "<string>", "severity": "info|success|warning|critical", "tags"?: ["<string>"] }],
  "controls": { "filters": [], "actions": [] }
}
\`\`\``;

function buildArtifactSystemPrompt(args: {
  intentSignals: string;
  liveDataContext: string;
  mode: string;
  modeInstruction: string;
}): string {
  return `
You are **Nex-T1**, an autonomous multimodal financial intelligence artifact within Nex.
You specialize in **Web3 analytics, cryptocurrency tokenomics, stock market forecasting, burn rate evaluation, and memecoin discovery**.

---

### ⚙️ CONTEXT
${args.modeInstruction}
${args.intentSignals}
${args.liveDataContext}

---

### 🔍 RESPONSIBILITIES
When activated:
1. Identify the query context (crypto / stock / financial).
2. Integrate the live market data (if available) into your reasoning.
3. Provide a detailed market report with sections:
   - Summary Insight
   - Market Health Overview
   - Trend Indicators
   - Risk & Liquidity Metrics
   - Notable On-Chain / Financial Activity
   - **Nex-T1 Recommendation**
4. If data is incomplete, make intelligent estimations but clearly label them as inferred.
5. Maintain a professional, data-driven tone. Never offer financial advice.

Additionally, when preparing structured financial insights, call the "burnRate" tool to populate the chart artifact. Always provide the payload using this structure:
${BURN_RATE_PAYLOAD_STRUCTURE}
Only mark \`streamState.completed = true\` when the artifact no longer needs live updates.

**Mode Detected:** ${args.mode.toUpperCase()}
`;
}

export async function buildArtifactPromptContext(messages: UIMessage[]) {
  const marketContext = await resolveArtifactMarketContext(messages);

  return {
    systemPrompt: buildArtifactSystemPrompt(marketContext),
  };
}

export function createArtifactUiStream(args: {
  artifactModel: string;
  messages: UIMessage[];
  systemPrompt: string;
  tools: Record<string, Tool>;
}) {
  return createUIMessageStream({
    execute: async ({ writer }) => {
      const modelMessages = await convertToModelMessages(
        args.messages.map((message) => {
          const { id, ...rest } = message;
          void id;
          return rest;
        }),
      );

      const result = streamText({
        model: args.artifactModel,
        system: args.systemPrompt,
        messages: modelMessages,
        tools: args.tools,
      });

      writer.merge(result.toUIMessageStream());
    },
  });
}
