# AGENTS.md — Wallet Module

This file applies to all files under `src/modules/wallet/`.

It extends the root `AGENTS.md` with domain-specific rules for wallet operations, transaction safety, signing flows, and financial risk management.

---

# Scope and Precedence

- This file applies to `src/modules/wallet/**`.
- The root `AGENTS.md` still applies unless this file is more specific.
- Direct human instructions take precedence.
- If a requested implementation conflicts with this file, refactor the design before coding.

---

# Module Mission

The Wallet module owns:
- Wallet connection and session management
- Balance fetching and portfolio aggregation (wallet-native)
- Transaction construction, simulation, signing, and submission
- Allowance management and ERC-20 approval flows
- Wallet capability detection (chain support, feature flags)
- Swap and DeFi operation orchestration

The Wallet module does NOT own:
- Raw provider SDK initialization (delegate to `src/lib/cdp/`, `src/lib/wallets/`, `src/lib/web3/`)
- Market price data (delegate to `src/modules/markets/`)
- Auth/session management (delegate to `src/lib/auth`)
- General HTTP utilities (delegate to `src/lib/http/`)

---

# Directory Structure

```txt
src/modules/wallet/
  components/       # Wallet UI components (connect button, balance display, tx history)
  hooks/            # Wallet hooks (useWallet, useBalance, useTransaction, etc.)
  server/           # Server-only wallet data fetching and SSR support
  services/         # Wallet service implementations (balance, tx, allowance, swap)
  schemas/          # Zod schemas for tx params, swap inputs, wallet config
  types/            # TypeScript types for wallet state, tx DTOs, provider abstractions
  utils/            # Pure wallet utility functions
  tests/            # Unit and integration tests
```

---

# ⚠️ Financial Safety Rules (MANDATORY — NON-NEGOTIABLE)

These rules are the highest-priority constraints in this module. Violations are critical failures.

1. **Never auto-execute transactions without explicit user confirmation.**
   - All transaction-initiating operations must require a deliberate user action (button press, confirmation dialog, or equivalent).
   - AI agents must never trigger wallet transactions silently in the background.

2. **Always simulate transactions before submission.**
   - Use simulation endpoints (Tenderly, provider simulation APIs, or equivalent) to preview transaction effects before presenting to the user for signing.
   - If simulation fails or returns a revert, block submission and surface a clear error.

3. **Always validate transaction parameters server-side.**
   - Do not trust client-supplied transaction parameters (to, value, data, gas) without server-side validation.
   - Zod schemas must cover all transaction input surfaces.

4. **Enforce slippage and value bounds for swaps.**
   - All swap operations must enforce configurable slippage tolerances.
   - Reject swaps that exceed reasonable value bounds or produce unexpected output ratios.

5. **Never log private keys, mnemonics, seed phrases, or wallet signing secrets.**
   - These must never appear in logs, error messages, Sentry captures, or audit trails.
   - If detected, treat as a critical security incident.

6. **Enforce idempotency for all transaction submission endpoints.**
   - Use idempotency keys to prevent duplicate transaction submissions.
   - Detect and reject duplicate submission attempts within a safe window.

7. **Force fresh data for balance and allowance checks before critical operations.**
   - Never rely on cached balance or allowance data for operations that transfer value.
   - Always fetch fresh on-chain state immediately before presenting a transaction for signing.

---

# Transaction Safety Workflow

Every transaction flow must follow this sequence:

```txt
1. User initiates intent
2. Validate inputs (Zod schema)
3. Fetch fresh on-chain state (balance, allowance, nonce)
4. Construct transaction parameters  
5. Simulate transaction (verify expected outcome)
6. Present simulation results to user
7. User explicitly confirms
8. Sign and submit transaction
9. Track status until finality
10. Handle success / failure / timeout
```

No step may be skipped. Steps 5–7 are mandatory for all value-transferring operations.

---

# Caching Rules (Wallet-Specific)

Wallet data has the strictest freshness requirements in the codebase:

| Data Type | Cache Policy |
|---|---|
| Wallet balance (pre-tx) | Never cache — always fetch fresh |
| Wallet balance (display) | Very short TTL (≤ 30s), user-scoped key |
| Token allowances (pre-tx) | Never cache — always fetch fresh |
| Token allowances (display) | Short TTL (≤ 60s), user-scoped key |
| Transaction history | Medium TTL, user-scoped key, invalidate on new tx |
| Wallet capabilities | Medium TTL, invalidate on chain switch |
| NFT holdings (display) | Medium TTL, user-scoped key |

Never cache:
- Nonces (always fetch from chain)
- Gas estimates for active operations
- Allowance state immediately before a swap or approval
- Private signing keys or seed material (they must never be stored anywhere)

---

# Signing and Key Management Rules

- Private keys and signing credentials must never pass through application code.
- Use provider-managed signing (CDP SDK, WalletConnect, MetaMask, etc.) exclusively.
- Never serialize or log signing payloads that include private key material.
- Session-based signing contexts must be invalidated on logout.
- Multi-sig and hardware wallet flows must be handled with explicit waiting and timeout patterns.

---

# Allowance and Approval Rules

- Always check current allowance before initiating an ERC-20 approval operation.
- Never approve an unlimited allowance without explicit user consent and clear disclosure.
- Document the scope and risk of each approval operation in the UI.
- After approval confirmation, re-verify allowance on-chain before proceeding with the dependent operation.

---

# Error Handling Rules (Wallet-Specific)

- Map all chain-level errors (revert reasons, out-of-gas, nonce conflicts) to user-readable messages.
- Never expose raw provider error data or revert bytecode to the UI without decoding.
- Failed transactions must be tracked and surfaced in transaction history with a clear failure reason.
- Timeout handling is mandatory for all on-chain operations — define max wait durations and surface timeout state to the user.

---

# File and Function Limits

Inherited from root `AGENTS.md`:
- Service file: soft max `180 LOC`, hard max `250 LOC`
- Schema/validator file: soft max `180 LOC`, hard max `300 LOC`
- Hook: soft max `100 LOC`, hard max `150 LOC`

Additional enforcement for wallet services:
- Transaction builder functions: hard max `40 lines` — extract parameters, construction, and validation into separate functions
- Signing flow handlers: hard max `60 lines` — split steps into named sub-functions

---

# Testing Requirements (Wallet Module)

- All transaction construction logic must have unit tests with mocked on-chain state.
- Simulation logic must be tested with expected pass and expected revert scenarios.
- Allowance check logic must be tested with zero-allowance and existing-allowance scenarios.
- Idempotency key generation and duplicate detection must be tested.
- Financial math (amount calculations, slippage enforcement) must be tested with edge cases.

---

# Delivery Checklist (Wallet Module)

Before submitting any change to this module:

1. All financial safety rules verified (no silent tx, simulation required, fresh state)
2. No private keys or secrets in logs or error objects
3. Transaction parameters validated by Zod before any construction or submission
4. Idempotency enforced for all mutation operations
5. Cache policies verified — transactional data is network-first
6. Error messages decoded and user-readable (no raw revert data)
7. Confirmation flow is explicitly user-initiated
8. Run: `pnpm run lint && pnpm run typecheck`
9. Run targeted tests: `pnpm run test -- src/modules/wallet`
10. For financial flow changes: request explicit human review before merging
