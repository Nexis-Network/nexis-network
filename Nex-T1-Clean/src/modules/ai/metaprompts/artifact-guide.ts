/**
 * Enhanced Artifact Usage Guide
 * 
 * Domain: AI/Metaprompts
 * Responsibility: Comprehensive artifact usage patterns and schemas for GPT-5.4
 * Depends on: StreamAccumulator, ArtifactDisplay
 * Notes: Provides detailed artifact generation guidance with JSON schemas
 */

/**
 * Complete artifact types with their schemas and usage patterns
 */
export const ARTIFACT_USAGE_GUIDE = `
<artifact_usage_guide>
Artifacts render rich UI components. Use them for structured data that exceeds plain text capacity.

<when_to_use_artifacts>
**ALWAYS use artifact**:
- Wallet creation results (addresses + metadata; secrets are never shown in chat)
- Portfolio data with >3 assets
- Staking positions with APY data
- Any data requiring tabular display
- Trade confirmations with transaction details
- App, component, HTML, landing page, or code deliverables via \`code\`, \`html\`, \`preview\`, or \`web\`
- Smart contract/code requests (Solidity, ERC20, memecoin, NFT, Solana Rust) via \`smart-contract-viewer\`

**NEVER use artifact**:
- Simple text responses
- Single values (price, balance)
- Conversational messages
- Error explanations
- <20 lines of data
</when_to_use_artifacts>

<artifact_syntax>
Generate artifacts using the structured tool call:

\`\`\`json
emit_artifact({
  "artifactType": "artifact-type",
  "identifier": "unique-id",
  "title": "Display Title",
  "payload": { "...": "JSON content matching artifact schema" }
})
\`\`\`

**Critical Rules**:
- \`identifier\`: Unique per artifact (e.g., "wallet-eth-1", "portfolio-2024")
- \`artifactType\`: Must exactly match known types below
- \`title\`: User-visible title (concise, descriptive)
- Use \`payload\` for complete artifacts.
- For large object- or array-heavy artifacts, prefer \`base\` plus \`patches\` with a stable \`identifier\`.
- \`payload\`, \`base\`, and patch \`value\` entries must be valid JSON
- Artifacts are UI data, not a place for hidden prose instructions.
- If the user changes scope but the artifact is still the same deliverable, reuse the stable \`identifier\` and prefer incremental patches.
- Validate payload shape before emission; emit a smaller valid payload instead of speculative fields.
- Do not paste raw artifact JSON into assistant prose.
- If sandbox/file tools are unavailable for this turn, still emit the best artifact deliverable instead of replying about missing E2B tools.
</artifact_syntax>

<artifact_schemas>

### agent-wallets
Display generated wallets (addresses + metadata). Never include private keys or mnemonics in chat artifacts.

\`\`\`json
{
  "wallets": [
    {
      "address": "0x1234...abcd",
      "chain": "EVM" | "Solana" | "Bitcoin",
      "tags": ["fresh", "imported", "agent-created"],
      "balance": "0.0 ETH",
      "exportHint": "Use Settings → Wallets to export keys securely (never shown in chat)."
    }
  ]
}
\`\`\`

**Example**:
\`\`\`json
emit_artifact({
  "artifactType": "agent-wallets",
  "identifier": "new-eth-wallet",
  "title": "Your New Ethereum Wallet",
  "payload": {
    "wallets": [
      {
        "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD41",
        "chain": "EVM",
        "tags": ["fresh", "agent-created"]
      }
    ]
  }
})
\`\`\`

### portfolio-analysis
Deep portfolio analysis with risk metrics.

\`\`\`json
{
  "totalValue": 15420.50,
  "change24h": 5.2,
  "change7d": -2.1,
  "riskScore": 45,
  "assets": [
    {
      "symbol": "ETH",
      "name": "Ethereum",
      "amount": 2.5,
      "value": 5000,
      "allocation": 32.4,
      "change24h": 3.2
    }
  ],
  "insights": [
    "Heavy exposure to ETH (32%)",
    "Low stablecoin buffer (8%)",
    "Consider diversifying into L2 tokens"
  ],
  "recommendations": [
    {
      "action": "rebalance",
      "description": "Reduce ETH allocation by 10%",
      "priority": "medium"
    }
  ]
}
\`\`\`

### combined-holdings
Aggregated view across multiple wallets.

\`\`\`json
{
  "wallets": ["0x123...", "0x456...", "8Kag..."],
  "totalValue": 50000,
  "chains": ["Ethereum", "Solana", "Base"],
  "assets": [
    {
      "symbol": "SOL",
      "chain": "Solana",
      "amount": 100,
      "value": 15000,
      "source": "in-app" | "agent" | "connected"
    }
  ],
  "breakdown": {
    "byChain": { "Ethereum": 25000, "Solana": 20000, "Base": 5000 },
    "byType": { "tokens": 40000, "stables": 8000, "nfts": 2000 }
  }
}
\`\`\`

### staking-positions
Staking dashboard with rewards.

\`\`\`json
{
  "totalStaked": 10000,
  "totalRewards": 450.25,
  "averageApy": 5.5,
  "positions": [
    {
      "protocol": "Lido",
      "asset": "ETH",
      "amount": 2,
      "value": 4000,
      "apy": 3.8,
      "rewardsPending": 0.05,
      "lockupEnd": "2024-12-31T00:00:00Z"
    }
  ]
}
\`\`\`

### agent-daos
DAO governance overview.

\`\`\`json
{
  "daos": [
    {
      "name": "Investment DAO",
      "contractAddress": "0x789...",
      "chain": "Base",
      "treasuryValue": 5000,
      "proposalCount": 2,
      "activeProposals": 1,
      "governanceToken": "INV",
      "votingPower": 1500,
      "role": "Member" | "Admin" | "Proposer"
    }
  ]
}
\`\`\`

### dao-workspace
Unified DAO operations workspace.

\`\`\`json
{
  "title": "DAO Workspace",
  "overview": {
    "dao": {
      "id": "dao_123",
      "name": "Nex Treasury Council",
      "primaryChainFamily": "evm",
      "ownershipMode": "hybrid"
    },
    "members": [],
    "proposals": [],
    "treasuries": []
  },
  "summary": "Treasury operations are healthy and one proposal is awaiting quorum.",
  "focusTab": "overview"
}
\`\`\`

### dao-proposals
DAO proposal and voting workspace.

\`\`\`json
{
  "title": "DAO Proposals",
  "daoId": "dao_123",
  "daoName": "Nex Treasury Council",
  "chainFamily": "evm",
  "proposals": [
    {
      "id": "proposal_1",
      "title": "Increase treasury diversification",
      "status": "active"
    }
  ],
  "votes": [],
  "summary": "One proposal is active and voting closes in 18 hours."
}
\`\`\`

### dao-treasury
DAO treasury balances and execution queue.

\`\`\`json
{
  "title": "DAO Treasury",
  "daoId": "dao_123",
  "daoName": "Nex Treasury Council",
  "chainFamily": "solana",
  "treasuries": [
    {
      "id": "treasury_1",
      "label": "Primary Treasury",
      "totalValueUsd": 125000
    }
  ],
  "actions": [],
  "summary": "Treasury is healthy and no pending executions require signatures."
}
\`\`\`

### pumpfun
Pump.fun token data and trades.

\`\`\`json
{
  "view": "trade" | "coin_analysis" | "chat_digest" | "trend_report",
  "headline": "Trade Executed Successfully",
  
  // For view: "trade"
  "action": {
    "command": "BUY 1 SOL",
    "mint": "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    "cluster": "mainnet",
    "success": true,
    "signature": "5xY9...",
    "explorerUrl": "https://solscan.io/tx/..."
  },
  
  // For view: "coin_analysis"
  "overview": {
    "name": "PumpCoin",
    "symbol": "PUMP",
    "description": "A community meme token",
    "metrics": [
      { "label": "Market Cap", "value": "$1.2M", "change": 15.5 },
      { "label": "24h Volume", "value": "$500K", "change": -8.2 }
    ]
  },
  
  // For view: "trend_report"
  "generatedAt": "2024-01-15T12:00:00Z",
  "featuredCoins": [
    { "name": "TrendCoin", "symbol": "TRD", "mint": "...", "score": 92.5 }
  ],
  "insights": [
    { "title": "Bullish Momentum", "description": "...", "score": 0.85 }
  ]
}
\`\`\`

### burn-rate-chart
Treasury burn rate visualization.

\`\`\`json
{
  "monthlyBurn": 15000,
  "runway": 18,
  "treasury": 270000,
  "burnTrend": "decreasing" | "stable" | "increasing",
  "history": [
    { "month": "Jan 2024", "burn": 14500, "treasury": 285000 },
    { "month": "Feb 2024", "burn": 15200, "treasury": 270000 }
  ],
  "recommendations": [
    "Current runway is healthy at 18 months",
    "Consider reducing operational costs by 10%"
  ]
}
\`\`\`

### table-editor
Generic data tables.

\`\`\`json
{
  "title": "Token Comparison",
  "columns": [
    { "key": "symbol", "label": "Token", "type": "string" },
    { "key": "price", "label": "Price", "type": "currency" },
    { "key": "change", "label": "24h", "type": "percent" }
  ],
  "rows": [
    { "symbol": "ETH", "price": 3420.50, "change": 2.5 },
    { "symbol": "SOL", "price": 148.20, "change": -1.2 }
  ],
  "sortable": true,
  "exportable": true
}
\`\`\`

For large streaming tables, prefer a patch-friendly shape:

\`\`\`json
emit_artifact({
  "artifactType": "table-editor",
  "identifier": "token-comparison",
  "title": "Token Comparison",
  "base": {
    "title": "Token Comparison",
    "columns": [
      { "key": "symbol", "label": "Token", "type": "string" },
      { "key": "price", "label": "Price", "type": "currency" }
    ],
    "rows": []
  },
  "patches": [
    { "op": "append", "path": "/rows", "value": { "symbol": "ETH", "price": 3420.5 } },
    { "op": "append", "path": "/rows", "value": { "symbol": "SOL", "price": 148.2 } }
  ]
})
\`\`\`


### market-terminal
Interactive crypto market terminal for screeners, pivots, and live trade tape.

\`\`\`json
{
  "title": "Market Terminal",
  "universe": "crypto",
  "initialView": "screener",
  "query": "top ai infrastructure",
  "chain": "all",
  "quoteCurrency": "usd",
  "selectedAssetIds": ["ethereum", "solana"],
  "selectedPools": ["eth:0xpool"],
  "visibleColumns": ["symbol", "name", "price", "change24hPct", "marketCap"],
  "sortModel": [{ "columnId": "marketCap", "direction": "desc" }],
  "filterModel": [],
  "pivotModel": {
    "rows": [{ "id": "chain", "label": "Chain" }],
    "columns": [{ "id": "narrative", "label": "Narrative" }],
    "measures": [{ "id": "marketCap", "aggregator": "sum" }]
  },
  "actions": {
    "canAnalyze": true,
    "canWatchlist": true,
    "canSwap": true,
    "swapMode": "agent_handoff_hitl"
  },
  "generatedBy": "agent"
}
\`\`\`

### transaction-simulation
Visual simulation token swaps/txs.

\`\`\`json
{
  "status": "success" | "failure",
  "fromToken": { "symbol": "ETH", "amount": "1.0" },
  "toToken": { "symbol": "USDC", "amount": "3200" },
  "gasEstimate": "0.002 ETH",
  "steps": [
    { "name": "Approve", "status": "completed" },
    { "name": "Swap", "status": "pending" }
  ]
}
\`\`\`

### pyth-chart
Live price chart from Pyth Oracle.

\`\`\`json
{
  "symbol": "SOL",
  "price": 142.50,
  "confidence": 0.002,
  "timestamp": "2024-...",
  "history": [
    { "time": "10:00", "value": 140 },
    { "time": "10:05", "value": 142.5 }
  ]
}
\`\`\`

### pumpfun-v2
Enhanced Pump.fun dashboard.

\`\`\`json
{
  "name": "Pepe",
  "symbol": "PEPE",
  "marketCap": "$24M",
  "bondingCurveProgress": 85,
  "kingOfTheHill": true,
  "replies": 150,
  "recentChat": [
    { "user": "User1", "message": "LFG", "time": "10:00" }
  ]
}
\`\`\`

### code
Executable code snippets.

\`\`\`json
{
  "code": "print('Hello World')",
  "language": "python",
  "result": "Hello World"
}
\`\`\`

For UI/app work, prefer including \`files\`, \`entryFile\`, and a concise summary so the right-panel workbench has a concrete code surface even without sandbox execution.

### preview
Web or HTML previews.

\`\`\`json
// URL mode
{
  "url": "https://example.com/preview",
  "title": "Preview Page"
}

// HTML mode
{
  "html": "<div class='p-4'>Hello</div>",
  "title": "Component Preview"
}
\`\`\`

If no live preview URL is available, provide standalone \`html\` content or pair this with a \`code\`/\`html\` artifact rather than refusing the request.

### canvas
Diagrams and visualizations (Mermaid, etc).

\`\`\`json
{
  "code": "graph TD; A-->B;",
  "type": "mermaid",
  "title": "Flowchart"
}
\`\`\`

### smart-contract-viewer
Smart contract/code payload for Solidity or Solana Rust views.

\`\`\`json
{
  "title": "OpenZeppelin ERC20",
  "templateId": "solidity-oz",
  "chain": "evm",
  "language": "solidity",
  "framework": "hardhat",
  "entryFile": "contracts/MyToken.sol",
  "files": [
    {
      "path": "contracts/MyToken.sol",
      "content": "pragma solidity ^0.8.24; ..."
    }
  ],
  "commands": [
    "npm run build",
    "npm run test"
  ]
}
\`\`\`

For Solana Rust programs, use \`templateId: "solana-rust"\` with Rust source files and cargo commands.
For smart-contract intents, place full source in this artifact and keep assistant prose concise (no full inline contract blocks unless user explicitly requests a snippet).

### pdf-viewer
PDF payload for report/research previews.

\`\`\`json
{
  "title": "Simulation Report",
  "fileName": "simulation-report.pdf",
  "url": "https://example.com/simulation-report.pdf"
}
\`\`\`

\`\`\`json
{
  "title": "Simulation Report",
  "fileName": "simulation-report.pdf",
  "base64": "JVBERi0xLjcKJ..."
}
\`\`\`

### transaction-flow
Step-by-step transaction simulation/timeline.

\`\`\`json
{
  "title": "Swap Execution Plan",
  "network": "Base",
  "status": "running",
  "steps": [
    { "id": "quote", "label": "Fetch quote", "status": "completed" },
    { "id": "approve", "label": "Approve token", "status": "pending" },
    { "id": "swap", "label": "Execute swap", "status": "pending" }
  ],
  "txHash": "0x...",
  "warnings": ["Price impact > 1%"]
}
\`\`\`

### polymarket-widget
Right-panel widget state for prediction market trading.

\`\`\`json
{
  "title": "Polymarket Widget",
  "mode": "trending",
  "query": "election",
  "markets": [
    {
      "conditionId": "0x...",
      "question": "Will ...?",
      "outcomes": [
        { "name": "Yes", "tokenId": "123", "price": "0.61" },
        { "name": "No", "tokenId": "124", "price": "0.39" }
      ]
    }
  ],
  "wallets": {
    "cdpEvm": "0xabc...",
    "polymarket": "0xdef..."
  }
}
\`\`\`

</artifact_schemas>

<artifact_best_practices>
1. **One artifact per concern**: Don't combine portfolio + staking in one artifact
2. **Progressive disclosure**: Use artifact for details, summarize in message
3. **Consistent IDs**: Use descriptive identifiers (e.g., "eth-wallet-main" not "w1")
4. **Error handling**: Include error state in artifact, don't fail silently
5. **Fresh data**: Always include timestamps for time-sensitive data
6. **Key safety**: Never include private keys/mnemonics in chat. Use Settings → Wallets export flows.
</artifact_best_practices>

<artifact_announcement>
When generating an artifact, announce once in your message:
- "I've created a wallet - see the details in the panel."
- "Here's your portfolio breakdown in the artifact."
- "The transaction details are in the confirmation panel."

Never dump artifact JSON in the text message.
</artifact_announcement>
</artifact_usage_guide>
`.trim();

/**
 * Artifact type registry for validation
 */
export const ARTIFACT_TYPES = [
  "agent-wallets",
  "portfolio-analysis",
  "combined-holdings",
  "staking-positions",
  "agent-daos",
  "dao-workspace",
  "dao-proposals",
  "dao-treasury",
  "pumpfun",
  "burn-rate-chart",
  "table-editor",
  "market-terminal",
  "file-analysis",
  "image-artifact",
  "transaction-simulation",
  "pyth-chart",
  "pumpfun-v2",
  "execution-result",
  "code",
  "preview",
  "web",
  "canvas",
  "html",
  "pdf-viewer",
  "smart-contract-viewer",
  "transaction-flow",
  "polymarket-widget",
  "polymarket-markets",
  "polymarket-market-detail",
  "polymarket-orderbook",
  "polymarket-price-chart",
  "polymarket-price-data",
  "polymarket-positions",
  "polymarket-trades",
  "polymarket-trade-preview",
  "polymarket-order-status",
  "polymarket-bridge-status",
  "polymarket-deposit-info",
  "polymarket-supported-assets",
  "polymarket-balance",
  "polymarket-blocked",
  "polymarket-error",
] as const;

export type ArtifactType = typeof ARTIFACT_TYPES[number];

/**
 * Validates if an artifact type is known
 */
export function isValidArtifactType(type: string): type is ArtifactType {
  return ARTIFACT_TYPES.includes(type as ArtifactType);
}

/**
 * Gets the recommended artifact type based on data shape
 */
export function suggestArtifactType(data: UntypedJson): ArtifactType | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, UntypedJson>;

  // Wallet detection
  if (Array.isArray(obj.wallets) && obj.wallets.length > 0) {
    const firstWallet = obj.wallets[0] as Record<string, UntypedJson>;
    if (firstWallet.address) {
      return "agent-wallets";
    }
  }

  // Portfolio detection
  if (obj.totalValue !== undefined && Array.isArray(obj.assets) && obj.riskScore !== undefined) {
    return "portfolio-analysis";
  }

  // Combined holdings detection
  if (Array.isArray(obj.wallets) && obj.totalValue !== undefined && Array.isArray(obj.assets)) {
    return "combined-holdings";
  }

  // Staking detection
  if (obj.totalStaked !== undefined && Array.isArray(obj.positions)) {
    return "staking-positions";
  }

  // DAO detection
  if (Array.isArray(obj.daos)) {
    return "agent-daos";
  }

  // DAO workspace detection
  if (obj.overview && typeof obj.overview === "object") {
    return "dao-workspace";
  }

  // DAO proposals detection
  if (typeof obj.daoId === "string" && Array.isArray(obj.proposals) && Array.isArray(obj.votes)) {
    return "dao-proposals";
  }

  // DAO treasury detection
  if (typeof obj.daoId === "string" && Array.isArray(obj.treasuries) && Array.isArray(obj.actions)) {
    return "dao-treasury";
  }

  // Pumpfun detection
  if (obj.view && ["trade", "coin_analysis", "chat_digest", "trend_report"].includes(obj.view as string)) {
    return "pumpfun";
  }

  // Burn rate detection
  if (obj.monthlyBurn !== undefined && obj.runway !== undefined) {
    return "burn-rate-chart";
  }

  // Table detection
  if (Array.isArray(obj.columns) && Array.isArray(obj.rows)) {
    return "table-editor";
  }

  // Market terminal detection
  if (
    obj.universe === "crypto" &&
    typeof obj.initialView === "string" &&
    Array.isArray(obj.selectedAssetIds)
  ) {
    return "market-terminal";
  }

  // Transaction Simulation
  if (obj.fromToken && obj.toToken && Array.isArray(obj.steps)) {
    return "transaction-simulation";
  }

  // Pyth Chart
  if (obj.symbol && obj.price !== undefined && Array.isArray(obj.history) && obj.confidence !== undefined) {
    return "pyth-chart";
  }

  // PumpFun V2
  if (obj.bondingCurveProgress !== undefined && obj.kingOfTheHill !== undefined) {
    return "pumpfun-v2";
  }

  // Code detection
  if (typeof obj.code === "string" && obj.language) {
    return "code";
  }

  // Smart contract detection
  if (
    (obj.language === "solidity" || obj.language === "rust") &&
    (Array.isArray(obj.files) || typeof obj.entryFile === "string")
  ) {
    return "smart-contract-viewer";
  }

  // Preview detection
  if (obj.url || obj.html) {
    return "preview";
  }

  // PDF detection
  if (obj.base64 && typeof obj.fileName === "string" && obj.fileName.toLowerCase().endsWith(".pdf")) {
    return "pdf-viewer";
  }
  if (typeof obj.url === "string" && obj.url.toLowerCase().endsWith(".pdf")) {
    return "pdf-viewer";
  }

  // Transaction flow detection
  if (Array.isArray(obj.steps) && obj.status && obj.network) {
    return "transaction-flow";
  }

  // Polymarket widget detection
  if (obj.mode && (Array.isArray(obj.markets) || obj.wallets)) {
    return "polymarket-widget";
  }

  // Canvas detection
  if (obj.type === "mermaid" || (obj.code && obj.type === "canvas")) {
    return "canvas";
  }

  return null;
}

/**
 * Builds an artifact XML block from data
 */
export function buildArtifactBlock(
  type: ArtifactType,
  identifier: string,
  title: string,
  data: UntypedJson
): string {
  const payload = JSON.stringify(data, null, 2);
  return `emit_artifact({
  "artifactType": "${type}",
  "identifier": "${identifier}",
  "title": "${title}",
  "payload": ${payload}
})`;
}
