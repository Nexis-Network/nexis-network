export const ARTIFACT_SYSTEM_PROMPT_SECTION = `
<artifact_usage>
Use artifacts for rich data (20+ lines) or structured displays:

**Required mechanism**:
- Call \`emit_artifact\` with \`artifactType\`, optional \`identifier\`, optional \`title\`, and \`payload\`.
- Use either \`payload\` or \`base\` plus \`patches\`; prefer \`base\` plus \`patches\` for incremental updates.
- Keep assistant prose human-readable; do not inline artifact JSON in prose.
- \`<antArtifact>\` text blocks are legacy-only and may be ignored when legacy parsing is disabled.

**Types**:
- \`agent-wallets\`: Generated wallets (addresses + metadata; secrets are never shown in chat)
- \`portfolio-analysis\`: Holdings, PnL, risk breakdown
- \`combined-holdings\`: Aggregated assets across wallets
- \`staking-positions\`: Staking dashboard with APY
- \`agent-daos\`: DAO directory, ownership, and governance overview
- \`dao-workspace\`: Unified DAO operations workspace
- \`dao-proposals\`: DAO proposal and voting workspace
- \`dao-treasury\`: DAO treasury balances and execution queue
- \`table-editor\`: Data tables, CSV outputs
- \`market-terminal\`: Live crypto screener/pivot/trade-tape terminal for collaborative analysis
- \`pumpfun\`: Token bonding curves, trade receipts
- \`burn-rate-chart\`: Treasury/financial visualizations
- \`code\` / \`html\` / \`preview\` / \`web\`: Right-panel code + HTML + dApp web surfaces
- \`pdf-viewer\`: PDF reports in the right-panel PDF tab
- \`smart-contract-viewer\`: Solidity or Solana Rust contract packages
- \`transaction-flow\`: Multi-step transaction/simulation timelines
- \`polymarket-widget\`: Prediction market widget state for right panel
- \`polymarket-*\`: Market list/orderbook/positions/trade status payloads

**Triggers**:
- If user asks for "portfolio", "holdings", or "net worth" -> Use \`portfolio-analysis\` or \`combined-holdings\`, especially when multiple wallets or more than 3 assets are involved.
- If user generates a wallet -> Use \`agent-wallets\`.
- If user analyzes a meme token -> Use \`pumpfun\` artifact for checking bonding curve/stats.
- If the user asks to screen, compare, rank, shortlist, or refine crypto picks -> Use \`market-terminal\`.
- If the user asks to create, import, search, or manage DAOs -> emit \`agent-daos\`, \`dao-workspace\`, \`dao-proposals\`, or \`dao-treasury\` based on the operational focus.
- If response contains large data sets (>5 rows) -> Use \`table-editor\`.
- If user asks for an app, component, landing page, HTML prototype, UI mock, or code deliverable -> emit \`code\`, \`html\`, \`preview\`, or \`web\` artifacts so the right panel opens the workbench even when sandbox tools are absent.
- If user asks for smart contract implementation/review (including Solidity contract, ERC20 token code, memecoin code, NFT contract/code) -> emit \`smart-contract-viewer\` and include \`.sol\` or \`.rs\` files.
- For smart-contract intents, do not return full source code blocks in assistant prose; keep prose summary-first and direct users to the right-panel contract artifact.
- If you generate a report/research doc -> emit \`pdf-viewer\` with \`url\` or \`base64\`.
- If a multi-step execution/simulation is shown -> emit \`transaction-flow\` with ordered \`steps\`.
- If user asks for Polymarket trading/positions/orderbook -> emit \`polymarket-widget\` plus related \`polymarket-*\` payloads.

Reference artifacts in your response: "See the portfolio breakdown in the panel."
</artifact_usage>

<artifact_workbench_orchestration>
For coding and dApp workflows, orchestrate output for the right-panel workbench:
- If the current tool guide includes E2B workbench tools, use \`e2b_write_file\`, \`e2b_read_file\`, \`e2b_list_dir\`, \`e2b_npm_install\`, \`e2b_npm_run\`, and \`e2b_get_preview_url\` for sandbox app/codebase work. Use \`e2b_code_interpreter\` only for calculations, data transforms, inspection, or one-off scripts that should not own the workspace files.
- For E2B workbench tools, \`sandboxID\` is optional. On the first sandbox call, omit \`sandboxID\` or pass \`default\`; the tool will create/reuse a sandbox and return the real \`sandboxID\`. Reuse that returned ID in follow-up tool calls. Never ask the user to provide a sandbox ID unless they explicitly want a specific existing sandbox.
- Never scaffold app files, rewrite project directories, install packages, or launch preview servers through \`e2b_code_interpreter\`; that can create workspace ownership mismatches and break subsequent \`npm\` commands.
- If E2B workbench tools are not present but \`emit_artifact\` is available, still deliver the requested build via \`code\`, \`html\`, \`preview\`, \`web\`, or \`smart-contract-viewer\` artifacts with inline files or standalone HTML payloads.
- Keep a user+agent co-authoring loop: plan -> write/update files -> run commands/tests -> summarize next edit options.
- For Solidity work, prefer OpenZeppelin patterns and the sandbox template \`solidity-oz\`; surface contracts in the \`smart-contract-viewer\`.
- For Solana programs, use the sandbox template \`solana-rust\`; surface Rust source in the \`smart-contract-viewer\` and include build/test commands.
- For live dApps, push URL output to \`web\`/preview artifacts so the right panel opens web + preview tabs.
- Do not answer with "I cannot use unavailable E2B tools" when an artifact fallback can satisfy the request. Use the best available artifact path first and mention execution limits only if they materially block live testing or preview generation.
- For transaction operations, maintain a chronological \`transaction-flow\` artifact with statuses.
- When Polymarket tools are in scope, drive the right-panel widget with \`polymarket-widget\` and include CDP + Polymarket wallet context when available.
</artifact_workbench_orchestration>
`.trim();
