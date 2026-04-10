# AI Implementation Documentation

## Overview
The AI implementation is an agentic system focused on crypto/DeFi research + on-chain workflows. It uses the Vercel AI SDK with a custom server-side pipeline to orchestrate prompts (Langfuse-backed), dynamic context injection, tool execution, HITL approvals, and streaming UI updates.

## Technical Stack
- **Framework:** Next.js 16 (App Router)
- **AI SDK:** Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`)
- **Model Gateway:** Vercel AI Gateway (`createGateway`) with provider-prefixed model IDs (e.g., `openai/gpt-5.4`)
- **LLM Provider:** OpenAI GPT‑5.x series (default: `openai/gpt-5.4`)
- **Blockchain Integration:** HITL wallet tools + protocol/market data tools (no key export in chat)
- **Database:** Supabase (PostgreSQL) for conversation persistence and history.
- **Caching:** Redis (Upstash) for caching chat responses.
- **Monitoring:** Sentry and OpenTelemetry.

## Core Components

### 1. Chat Controller (`src/modules/chat/controller.ts`)
The `ChatController` serves as the entry point for chat requests. It handles:
- **Request Validation:** Validates the incoming JSON payload and message format.
- **Authentication:** Ensures the user is authenticated via Supabase.
- **Rate Limiting:** Applies rate limits based on user IP and ID using Upstash.
- **Stream Management:** Manages the streaming of UI messages to the client.

### 2. Chat Pipeline (`src/modules/chat/pipeline.ts`)
The pipeline is the brain of the operation. It orchestrates the entire chat flow:
- **Model Resolution:** Selects the model via config + tier routing (provider-prefixed IDs).
- **Tool Loading:** Loads only the tools needed for the detected intent (core + optional MCP tools for research/analysis).
- **Prompt Engineering:** Constructs the system prompt via Langfuse-backed PromptFactory + dynamic context variables.
- **Caching:** Checks if a response can be served from cache to reduce latency and costs.
- **Execution:** Calls the LLM using `streamText` with tools enabled; reasoning is configured via `providerOptions.openai` when supported.

### 3. Toolset (`src/modules/ai/chatbot/toolset.ts`)
The toolset defines the capabilities of the AI agent. It includes:
- **Allowlist + schemas:** `tools.json` (merged with registry tools when configured)
- **Crypto Tools:** Specialized tools for interacting with blockchains and DeFi protocols:
    - **EVM:** `evm_wallet` / `cryptowallet_evm` (wrapper HITL tool), `uniswap_poolspy`, `etherscan`, `alchemy_sdk`.
    - **Bitcoin:** `bitcoin_network` (HITL for sends/invoices).
    - **Solana:** `helius_solana`, `pumpfun_*`, `sol_*` (read-heavy).
    - **Market/Research:** `coingecko_trending`, `binance_market_data`, `dexscreener`, `openai_web_search`, `exa_web_search`.

### 4. System Guidance (`src/modules/ai/system-guidance.ts` & `constants.ts`)
Defines the behavior and personality of the AI:
- **System Prompts:** Base prompt content lives in `src/modules/ai/system-prompt.ts` and is fetched at runtime via Langfuse in `src/modules/chat/pipeline/prompt-factory.ts` (with repo fallbacks).
- **Tool Intent Guide:** `CHATBOT_TOOL_INTENT_GUIDE` helps the model understand when to use specific tools.
- **Artifact Manifest:** Describes the types of UI artifacts the agent can generate (e.g., charts, tables).

## Key Features

### Multi-Step Reasoning
For supported models/routes, the pipeline can stream a **reasoning summary** (not chain-of-thought) via `providerOptions.openai.reasoningSummary`. For normal chat, outputs stay concise.

### Dynamic Tool Loading
Tools are loaded dynamically by intent to keep the toolset small and reduce unnecessary tool calls. Optional MCP venue tools can be enabled for read-only research/analysis use cases.

### Caching Strategy
Responses are cached based on a composite key including the user query, model, and attachment fingerprint. This allows for instant responses to common, static queries while ensuring freshness for dynamic data.

### Prompt Templates
Production prompts are managed in Langfuse (labels) and fetched at runtime with repo fallbacks. Metaprompt templates are intent-adaptive and focus on context engineering, tool calling, and safety.

## Codebase Map

| File Path | Purpose |
|-----------|---------|
| `src/app/api/chat/route.ts` | Main API endpoint for chat interactions. |
| `src/modules/chat/controller.ts` | Handles request processing, auth, and rate limiting. |
| `src/modules/chat/pipeline.ts` | Core logic for model selection, tool config, and execution. |
| `src/modules/ai/chatbot/toolset.ts` | Tool loader (tools.json allowlist + lazy imports). |
| `src/modules/ai/chatbot/constants.ts` | System prompts, model constants, and configuration. |
| `src/modules/ai/tools/` | Implementation of specific crypto and utility tools. |
