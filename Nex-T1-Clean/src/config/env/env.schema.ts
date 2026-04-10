import { z } from "zod";

// Auto-generated from current process.env usage (rg scan). Optional by default to avoid runtime breakage; tighten as env ownership is clarified.
const optionalTrimmed = z.string().trim().optional();

const isRailwayInternalHost = (hostname?: string | null): boolean => {
  return Boolean(hostname && hostname.endsWith(".railway.internal"));
};

const extractSupabaseProjectRef = (value?: string): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const normalized =
      trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;
    const hostname = new URL(normalized).hostname;
    if (hostname.startsWith("auth.")) {
      return null;
    }
    if (isRailwayInternalHost(hostname)) {
      return null;
    }
    const [projectRef] = hostname.split(".");
    return projectRef && projectRef.length > 0 ? projectRef : null;
  } catch {
    return null;
  }
};

export const REQUIRED_PROD_ENV_VARS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  // "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "MORALIS_API_KEY",
  "NEX_REDIS_URL",
  "SENTRY_DSN",
  "WALLET_EMAIL_SALT",
];

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_KEY_PEPPER: optionalTrimmed,
  ALCHEMY_GAS_MANAGER_POLICY_ID: optionalTrimmed,
  ALCHEMY_ROLLUP_WEBHOOK_SIGNING_KEY: optionalTrimmed,
  API_PROFILER_WARN_THRESHOLD_MS: optionalTrimmed,
  AUTH_DOMAIN: optionalTrimmed,
  AUTH_URI: optionalTrimmed,
  BLOCKS_SUPABASE_SERVICE_ROLE_KEY: optionalTrimmed,
  EDGE_SESSION_RETRY_ATTEMPTS: optionalTrimmed,
  EDGE_SESSION_RETRY_BACKOFF_MS: optionalTrimmed,
  EDGE_SESSION_TIMEOUT_MS: optionalTrimmed,
  BIRDEYE_API_KEY: optionalTrimmed,
  COINGECKO_API_BASE: optionalTrimmed,
  COINGECKO_API_KEY: optionalTrimmed,
  COINGECKO_DEMO_API_KEY: optionalTrimmed,
  COINGECKO_PRO_API_KEY: optionalTrimmed,
  COINGECKO_DIRECTORY_CACHE_SECONDS: optionalTrimmed,
  COINGECKO_DISABLE_SDK: optionalTrimmed,
  COINGECKO_PROXY_FALLBACK_LOG_COOLDOWN_MS: optionalTrimmed,
  COINGECKO_PROXY_KEY_DISABLE_MS: optionalTrimmed,
  COINGECKO_SDK_CIRCUIT_BREAK_MS: optionalTrimmed,
  COINGECKO_SDK_TIMEOUT_DISABLE_THRESHOLD: optionalTrimmed,
  COINGECKO_SDK_TIMEOUT_MS: optionalTrimmed,
  COINGECKO_SEARCH_CACHE_SECONDS: optionalTrimmed,
  COINGECKO_WS_ENDPOINT: optionalTrimmed,
  COINMARKETCAP_API_BASE: optionalTrimmed,
  COINMARKETCAP_API_KEY: optionalTrimmed,
  COINMARKETCAP_DIRECTORY_REFRESH_MS: optionalTrimmed,
  COINMARKETCAP_ID_CACHE_TTL: optionalTrimmed,
  CLOUDFLARE_ACCOUNT_ID: optionalTrimmed,
  CLOUDFLARE_API_TOKEN: optionalTrimmed,
  CLOUDFLARE_API_KEY: optionalTrimmed,
  CLOUDFLARE_EMAIL: optionalTrimmed,
  CLOUDFLARE_KV_NAMESPACE_ID: optionalTrimmed,
  CLOUDFLARE_VECTORIZE_INDEX: optionalTrimmed,
  CRON_SECRET: optionalTrimmed,
  CRYPTONEWS_API_KEY: optionalTrimmed,
  CRYPTONEWS_ITEMS: optionalTrimmed,
  CRYPTONEWS_TRIAL_ITEMS: optionalTrimmed,
  CRYPTORANK_API_BASE_URL: optionalTrimmed,
  CRYPTORANK_API_KEY: optionalTrimmed,
  CRYPTORANK_MAX_RETRIES: optionalTrimmed,
  CRYPTORANK_TIMEOUT_MS: optionalTrimmed,
  DEFILLAMA_API_KEY: optionalTrimmed,
  DEFILLAMA_PRO_API_BASE: optionalTrimmed,
  DEFILLAMA_PRO_API_KEY: optionalTrimmed,
  DEFI_LLAMA_MIN_TVL: optionalTrimmed,
  DEXSCREENER_API_BASE: optionalTrimmed,
  DEXSCREENER_TIMEOUT_MS: optionalTrimmed,
  DEXSCREENER_USER_AGENT: optionalTrimmed,
  DEXTOOLS_API_BASE: optionalTrimmed,
  DEXTOOLS_API_KEY: optionalTrimmed,
  DEXTOOLS_CIRCUIT_FAILURE_THRESHOLD: optionalTrimmed,
  DEXTOOLS_CIRCUIT_RECOVERY_TIMEOUT_MS: optionalTrimmed,
  DEXTOOLS_CIRCUIT_SUCCESS_THRESHOLD: optionalTrimmed,
  DEXTOOLS_FAIL_FAST_MS: optionalTrimmed,
  DEXTOOLS_REVALIDATE_LOCK_SECONDS: optionalTrimmed,
  E2E_TEST_MODE: optionalTrimmed,
  ELEVENLABS_API_KEY: optionalTrimmed,
  ELEVENLABS_AGENT_ID: optionalTrimmed,
  ENABLE_GOAT_INTEGRATION: optionalTrimmed,
  ENABLE_IPFS_BACKUP: optionalTrimmed,
  ENABLE_MEM0_PERSONALIZATION: optionalTrimmed,
  ETHERSCAN_MCP_TOKEN: optionalTrimmed,
  EXA_API_KEY: optionalTrimmed,
  GOAT_COINMARKETCAP_API_KEY: optionalTrimmed,
  HELIUS_API_KEY: optionalTrimmed,
  KV_REST_API_TOKEN: optionalTrimmed,
  KV_REST_API_URL: optionalTrimmed,
  FALKORDB_URL: optionalTrimmed,
  PINATA_JWT: optionalTrimmed,
  NEXT_PUBLIC_IPFS_GATEWAY_URL: optionalTrimmed,
  LEADERBOARD_LOCAL_MODE: optionalTrimmed,
  LOG_LEVEL: optionalTrimmed,
  PROXY_REDIS_ERROR_LOG_COOLDOWN_MS: optionalTrimmed,
  SUPERAGENT_API_KEY: optionalTrimmed,
  SUPERAGENT_BASE_URL: optionalTrimmed,
  SUPERAGENT_MODE: optionalTrimmed,
  SUPERAGENT_TOOL_GUARD_ENABLED: optionalTrimmed,
  SUPERAGENT_FILE_SCAN_ENABLED: optionalTrimmed,
  SUPERAGENT_OUTPUT_VERIFY_ENABLED: optionalTrimmed,
  SUPERAGENT_REDACT_ENABLED: optionalTrimmed,
  SUPERAGENT_BLOCKING_THRESHOLD: optionalTrimmed,
  SUPERAGENT_ALLOWED_TOOLS: optionalTrimmed,
  SUPERAGENT_TRUSTED_DOMAINS: optionalTrimmed,
  SUPERAGENT_GUARDRAILS_DISABLED: optionalTrimmed,
  MARKET_NEWS_LIMIT: optionalTrimmed,
  MCP_ALCHEMY_API_KEY: optionalTrimmed,
  MCP_ALCHEMY_BASE_URL: optionalTrimmed,
  MCP_BINANCE_API_KEY: optionalTrimmed,
  MCP_BINANCE_BASE_URL: optionalTrimmed,
  MCP_BINANCE_URL: optionalTrimmed,
  MCP_BITCOIN_API_KEY: optionalTrimmed,
  MCP_BITCOIN_BASE_URL: optionalTrimmed,
  MCP_BITCOIN_URL: optionalTrimmed,
  MCP_BLOCKNATIVE_API_KEY: optionalTrimmed,
  MCP_BLOCKNATIVE_BASE_URL: optionalTrimmed,
  MCP_BLOCKNATIVE_URL: optionalTrimmed,
  MCP_BSC_API_KEY: optionalTrimmed,
  MCP_BSC_BASE_URL: optionalTrimmed,
  MCP_BSC_RETRY_COUNT: optionalTrimmed,
  MCP_BSC_TIMEOUT_MS: optionalTrimmed,
  MCP_CHAINLINK_API_KEY: optionalTrimmed,
  MCP_CHAINLINK_BASE_URL: optionalTrimmed,
  MCP_CHAINLINK_URL: optionalTrimmed,
  MCP_CRYPTO_SENTIMENT_API_KEY: optionalTrimmed,
  MCP_CRYPTO_SENTIMENT_BASE_URL: optionalTrimmed,
  MCP_DEFILLAMA_API_KEY: optionalTrimmed,
  MCP_DEFILLAMA_BASE_URL: optionalTrimmed,
  MCP_DEFI_LLAMA_URL: optionalTrimmed,
  MCP_DEXSCREENER_API_KEY: optionalTrimmed,
  MCP_DEXSCREENER_BASE_URL: optionalTrimmed,
  MCP_DEXSCREENER_URL: optionalTrimmed,
  MCP_ETHERSCAN_API_KEY: optionalTrimmed,
  MCP_ETHERSCAN_BASE_URL: optionalTrimmed,
  MCP_ETHERSCAN_URL: optionalTrimmed,
  MCP_EVM_WALLET_API_KEY: optionalTrimmed,
  MCP_EVM_WALLET_BASE_URL: optionalTrimmed,
  MCP_EVM_WALLET_RETRY_COUNT: optionalTrimmed,
  MCP_EVM_WALLET_TIMEOUT_MS: optionalTrimmed,
  MCP_EVM_WALLET_URL: optionalTrimmed,
  MCP_HELIUS_API_KEY: optionalTrimmed,
  MCP_HELIUS_BASE_URL: optionalTrimmed,
  MCP_HELIUS_URL: optionalTrimmed,
  MCP_PUMPFUN_CHAT_API_KEY: optionalTrimmed,
  MCP_PUMPFUN_CHAT_BASE_URL: optionalTrimmed,
  MCP_PUMPFUN_DATA_API_KEY: optionalTrimmed,
  MCP_PUMPFUN_DATA_BASE_URL: optionalTrimmed,
  MCP_SENTIMENT_URL: optionalTrimmed,
  MCP_TOKEN_MINTER_API_KEY: optionalTrimmed,
  MCP_TOKEN_MINTER_BASE_URL: optionalTrimmed,
  MCP_TOKEN_MINTER_URL: optionalTrimmed,
  MCP_UNISWAP_POOLSPY_API_KEY: optionalTrimmed,
  MCP_UNISWAP_POOLSPY_BASE_URL: optionalTrimmed,
  MCP_UNISWAP_SPY_URL: optionalTrimmed,
  // AI SDK v5 MCP (tool adapter) venue servers
  MCP_BLOCKSCOUT_MCP_URL: optionalTrimmed,
  MCP_BLOCKSCOUT_MCP_API_KEY: optionalTrimmed,
  MCP_BLOCKSCOUT_MCP_ALLOWED_TOOLS_READONLY: optionalTrimmed,
  MCP_HYPERLIQUID_MCP_URL: optionalTrimmed,
  MCP_HYPERLIQUID_MCP_API_KEY: optionalTrimmed,
  MCP_HYPERLIQUID_MCP_ALLOWED_TOOLS_READONLY: optionalTrimmed,
  MCP_HYPERLIQUID_MCP_ALLOWED_TOOLS_TRADING: optionalTrimmed,
  MCP_UNISWAP_MCP_URL: optionalTrimmed,
  MCP_UNISWAP_MCP_API_KEY: optionalTrimmed,
  MCP_UNISWAP_MCP_ALLOWED_TOOLS_READONLY: optionalTrimmed,
  MCP_UNISWAP_MCP_ALLOWED_TOOLS_TRADING: optionalTrimmed,
  MCP_COW_MCP_URL: optionalTrimmed,
  MCP_COW_MCP_API_KEY: optionalTrimmed,
  MCP_COW_MCP_ALLOWED_TOOLS_READONLY: optionalTrimmed,
  MCP_COW_MCP_ALLOWED_TOOLS_TRADING: optionalTrimmed,
  MCP_NEX_MCP_URL: optionalTrimmed,
  MCP_NEX_MCP_API_KEY: optionalTrimmed,
  MCP_NEX_MCP_ALLOWED_TOOLS_READONLY: optionalTrimmed,
  MCP_NEX_MCP_ALLOWED_TOOLS_TRADING: optionalTrimmed,
  MCP_MORALIS_MCP_URL: optionalTrimmed,
  MCP_MORALIS_MCP_API_KEY: optionalTrimmed,
  MCP_MORALIS_MCP_ALLOWED_TOOLS_READONLY: optionalTrimmed,
  MCP_MORALIS_MCP_ALLOWED_TOOLS_TRADING: optionalTrimmed,
  MCP_THEGRAPH_MCP_URL: optionalTrimmed,
  MCP_THEGRAPH_MCP_API_KEY: optionalTrimmed,
  MCP_THEGRAPH_MCP_ALLOWED_TOOLS_READONLY: optionalTrimmed,
  MCP_THEGRAPH_MCP_ALLOWED_TOOLS_TRADING: optionalTrimmed,
  MEM0_API_KEY: optionalTrimmed,
  MEM0_BASE_URL: optionalTrimmed,
  MEM0_PROJECT_ID: optionalTrimmed,
  MEM0_REQUEST_TIMEOUT_MS: optionalTrimmed,
  MESSARI_API_KEY: optionalTrimmed,
  MESSARI_HTTP_BACKOFF_MS: optionalTrimmed,
  MESSARI_HTTP_RETRY_ATTEMPTS: optionalTrimmed,
  MESSARI_HTTP_TIMEOUT_MS: optionalTrimmed,
  MESSARI_SLUG_ATTEMPTS: optionalTrimmed,
  MORALIS_API_KEY: optionalTrimmed,
  NEXT_PUBLIC_APP_URL: optionalTrimmed,
  NEXT_PUBLIC_ASSETS_URL: optionalTrimmed,
  NEXT_PUBLIC_BLOCKS_SUPABASE_URL: optionalTrimmed,
  NEXT_PUBLIC_CHAIN_IDS: optionalTrimmed,
  NEXT_PUBLIC_DISABLE_GOOGLE_DIRECT: optionalTrimmed,
  NEXT_PUBLIC_ELEVENLABS_AGENT_ID: optionalTrimmed,
  NEXT_PUBLIC_ENABLE_BASEJUMP: optionalTrimmed,
  NEXT_PUBLIC_ENABLE_GOAT_INTEGRATION: optionalTrimmed,
  NEXT_PUBLIC_ENABLE_X402: optionalTrimmed,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: optionalTrimmed,
  NEXT_PUBLIC_NEX_API_BASE: optionalTrimmed,
  NEXT_PUBLIC_NEX_T1_0X_API_KEY: optionalTrimmed,
  NEXT_PUBLIC_NZT_BRIDGE_URL: optionalTrimmed,
  NEXT_PUBLIC_NZT_CHAIN_ID: optionalTrimmed,
  NEXT_PUBLIC_NZT_EXPLORER_URL: optionalTrimmed,
  NEXT_PUBLIC_NZT_RPC_URL: optionalTrimmed,
  NEXT_PUBLIC_NZT_SYMBOL: optionalTrimmed,
  NEXT_PUBLIC_RPC: optionalTrimmed,
  NEXT_PUBLIC_SITE_URL: optionalTrimmed,
  NEXT_PUBLIC_STRIPE_COFFEE_ID: optionalTrimmed,
  NEXT_PUBLIC_SUI_NETWORK: optionalTrimmed,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalTrimmed,
  NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET: optionalTrimmed,
  NEXT_PUBLIC_SUPABASE_ENABLED_PROVIDERS: optionalTrimmed,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: optionalTrimmed,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalTrimmed,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY: optionalTrimmed,
  NEXT_PUBLIC_SUPABASE_PROJECT_URL: optionalTrimmed,
  NEXT_PUBLIC_SUPABASE_URL: optionalTrimmed,
  NEXT_PUBLIC_TEST_MODE: optionalTrimmed,
  NEXT_PUBLIC_TRIGGER_API_KEY: optionalTrimmed,
  NEXT_PUBLIC_WALLET_ASSET_DETAIL_V1: optionalTrimmed,
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: optionalTrimmed,
  NEX_AGENT_CODE_MODEL: optionalTrimmed,
  NEX_AGENT_IDEA_MODEL: optionalTrimmed,
  NEX_ALLOWED_REDIRECT_HOSTS: optionalTrimmed,
  NEX_ALLOW_IN_MEMORY_REDIS: optionalTrimmed,
  ALLOW_LEGACY_ARTIFACT_TAGS: optionalTrimmed,
  NEX_API_BASE: optionalTrimmed,
  NEX_API_ORIGIN: optionalTrimmed,
  NEX_ARTIFACT_CACHE_DRIVER: optionalTrimmed,
  NEX_ARTIFACT_MODEL: optionalTrimmed,
  NEX_ARTIFACT_QUEUE_KEY: optionalTrimmed,
  NEX_ARTIFACT_WORKER_BATCH: optionalTrimmed,
  NEX_BALANCED_MODEL: optionalTrimmed,
  NEX_BASE_CHAT_MODEL: optionalTrimmed,
  NEX_BYPASS_AI_GATEWAY: optionalTrimmed,
  NEX_CHAT_CACHE_TTL: optionalTrimmed,
  NEX_ENABLE_GOAT_INTEGRATION: optionalTrimmed,
  NEX_EVALUATOR_OPTIMIZER_MODEL: optionalTrimmed,
  NEX_GRAPH_ROUTER_LATENCY_MS: optionalTrimmed,
  NEX_GRAPH_ROUTER_MAX_LOCAL_TOOLS: optionalTrimmed,
  NEX_LEGACY_MODEL: optionalTrimmed,
  NEX_LOG_LEVEL: optionalTrimmed,
  NEX_ME_PROXY_FALLBACK: optionalTrimmed,
  NEX_ME_PROXY_FORCE_FALLBACKS: optionalTrimmed,
  NEX_NATIVE_BALANCE_CRON_SECRET: optionalTrimmed,
  NEX_NATIVE_BALANCE_WARM_ENTRIES: optionalTrimmed,
  NEX_ORCHESTRATOR_MODEL: optionalTrimmed,
  NEX_PAID_FETCH_ALLOWLIST: optionalTrimmed,
  NEX_PREFER_GPT5: optionalTrimmed,
  // NOTE: OpenAI Prompt Templates deprecated - prompts now managed via LangFuse
  // Use LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_BASEURL instead
  LANGFUSE_PUBLIC_KEY: optionalTrimmed,
  LANGFUSE_SECRET_KEY: optionalTrimmed,
  LANGFUSE_BASEURL: optionalTrimmed,
  LANGFUSE_BASE_URL: optionalTrimmed,
  LANGFUSE_PROMPT_LABEL: optionalTrimmed,
  NEX_RATE_LIMIT_MAX: optionalTrimmed,
  NEX_RATE_LIMIT_WINDOW: optionalTrimmed,
  NEX_REASONING_MODEL: optionalTrimmed,
  NEX_REDIS_URL: optionalTrimmed,
  NEX_ROUTING_TELEMETRY_ENDPOINT: optionalTrimmed,
  NEX_ROUTING_TELEMETRY_KEY: optionalTrimmed,
  NEX_T1_0X_API_KEY: optionalTrimmed,
  NEX_TASK_DISPATCH_KEY: optionalTrimmed,
  NEX_TASK_RUN_KEY: optionalTrimmed,
  NEX_TASK_QUEUE_KEY: optionalTrimmed,
  NEX_TASK_WATCHER_BATCH: optionalTrimmed,
  NEX_TASK_WORKER_BATCH: optionalTrimmed,
  NEX_TEXT_MODEL: optionalTrimmed,
  NEX_TOOL_ARTIFACT_TTL: optionalTrimmed,
  NEX_TOOL_MAX_CONCURRENT: optionalTrimmed,
  NEX_TOOL_MAX_INVOCATIONS: optionalTrimmed,
  NOTIFICATIONS_PROFILE_FETCH_TIMEOUT_MS: optionalTrimmed,
  NOTIFICATIONS_SKIP_HEAVY: optionalTrimmed,
  AI_API_KEY: optionalTrimmed,
  AI_GATEWAY_API_KEY: optionalTrimmed,
  VERCEL_AI_GATEWAY_API_KEY: optionalTrimmed,
  NEX_OPENAI_API_KEY: optionalTrimmed,
  NEX_OPENAI_BASE_URL: optionalTrimmed,
  OPENAI_BASE_URL: optionalTrimmed,
  OPENAI_API_KEY: optionalTrimmed,
  OPENAI_CODE_INTERPRETER_MODEL: optionalTrimmed,
  OPENAI_FILE_SEARCH_MODEL: optionalTrimmed,
  OPENAI_FILE_SEARCH_VECTOR_STORE_IDS: optionalTrimmed,
  OPENAI_IMAGE_MODEL: optionalTrimmed,
  OPENAI_MCP_MODEL: optionalTrimmed,
  OPENAI_MCP_TOOLSET: optionalTrimmed,
  OPENAI_WEB_SEARCH_MODEL: optionalTrimmed,
  PHALA_API_KEY: optionalTrimmed,
  PHALA_BASE_URL: optionalTrimmed,
  PHALA_PROJECT_ID: optionalTrimmed,
  PHALA_TOKEN: optionalTrimmed,
  TEE_RUNTIME_BASE_URL: optionalTrimmed,
  TEE_RUNTIME_SESSION_KEY_B64: optionalTrimmed,
  PIMLICO_API_KEY: optionalTrimmed,
  NEXT_PUBLIC_PIMLICO_API_KEY: optionalTrimmed,
  // Polymarket Integration (server-only, never NEXT_PUBLIC_)
  POLYMARKET_BUILDER_API_KEY: optionalTrimmed,
  POLYMARKET_BUILDER_SECRET: optionalTrimmed,
  POLYMARKET_BUILDER_PASSPHRASE: optionalTrimmed,
  POLYMARKET_CHAIN_ID: optionalTrimmed,
  POLYMARKET_CLOB_URL: optionalTrimmed,
  POLYMARKET_GAMMA_URL: optionalTrimmed,
  POLYMARKET_DATA_URL: optionalTrimmed,
  POLYMARKET_BRIDGE_URL: optionalTrimmed,
  POLYMARKET_WSS_URL: optionalTrimmed,
  POLYMARKET_CRED_ENCRYPTION_KEY: optionalTrimmed,
  ENABLE_NEX_AA: optionalTrimmed,
  ENS_DEFAULT_TTL: optionalTrimmed,
  ENS_MAINNET_RPC_URL: optionalTrimmed,
  ENS_NAME_WRAPPER: optionalTrimmed,
  ENS_PARENT_OWNER: optionalTrimmed,
  ENS_PUBLIC_RESOLVER: optionalTrimmed,
  ENS_REGISTRAR_OWNER: optionalTrimmed,
  ENS_REGISTRAR_RELAYER: optionalTrimmed,
  ENS_RELAYER_PRIVATE_KEY: optionalTrimmed,
  ENS_SUBNAME_REGISTRAR_ADDRESS: optionalTrimmed,
  ENS_SUBNAME_RELAYER_PRIVATE_KEY: optionalTrimmed,
  NEXT_PUBLIC_ENABLE_NEX_AA: optionalTrimmed,
  NEX_ENTRY_POINT_VERSION: optionalTrimmed,
  ACTIVATE_ON_FIRST_TX: optionalTrimmed,
  ARBITRUM_RPC_URL: optionalTrimmed,
  AVALANCHE_RPC_URL: optionalTrimmed,
  BASE_RPC_URL: optionalTrimmed,
  BNB_RPC_URL: optionalTrimmed,
  CELO_RPC_URL: optionalTrimmed,
  ETHEREUM_RPC_URL: optionalTrimmed,
  HYPERLIQUID_EVM_CHAIN_ID: optionalTrimmed,
  HYPERLIQUID_EVM_RPC_URL: optionalTrimmed,
  HYPEREVM_CHAIN_ID: optionalTrimmed,
  HYPEREVM_RPC_URL: optionalTrimmed,
  LOCAL_OWNER_ENABLED: optionalTrimmed,
  MONAD_CHAIN_ID: optionalTrimmed,
  MONAD_RPC_URL: optionalTrimmed,
  NEXT_PUBLIC_LOCAL_OWNER_ENABLED: optionalTrimmed,
  OPTIMISM_RPC_URL: optionalTrimmed,
  PASSKEY_APPROVAL_REQUIRE_AAL2: optionalTrimmed,
  POLYGON_RPC_URL: optionalTrimmed,
  PRIVATE_KEY: optionalTrimmed,
  PROVISION_MAX_ATTEMPTS: optionalTrimmed,
  PROVISION_BACKOFF_BASE_SECONDS: optionalTrimmed,
  PROVISION_BACKOFF_MAX_SECONDS: optionalTrimmed,
  RELAYER_PRIVATE_KEY: optionalTrimmed,
  TARGET_CHAIN_IDS: optionalTrimmed,
  TX_SERVICE_API_KEY: optionalTrimmed,
  TX_SERVICE_URL_1: optionalTrimmed,
  TX_SERVICE_URL_10: optionalTrimmed,
  TX_SERVICE_URL_56: optionalTrimmed,
  TX_SERVICE_URL_130: optionalTrimmed,
  TX_SERVICE_URL_137: optionalTrimmed,
  TX_SERVICE_URL_42161: optionalTrimmed,
  TX_SERVICE_URL_42220: optionalTrimmed,
  TX_SERVICE_URL_43114: optionalTrimmed,
  TX_SERVICE_URL_8453: optionalTrimmed,
  TX_SERVICE_URL_HYPERLIQUID_EVM: optionalTrimmed,
  TX_SERVICE_URL_HYPEREVM: optionalTrimmed,
  TX_SERVICE_URL_MONAD: optionalTrimmed,
  UNICHAIN_RPC_URL: optionalTrimmed,
  PREMIUM_RPC_URL_BASE: optionalTrimmed,
  PREMIUM_RPC_URL_OPTIMISM: optionalTrimmed,
  PREMIUM_RPC_URL_BNB: optionalTrimmed,
  PREMIUM_RPC_URL_ETHEREUM: optionalTrimmed,
  PREMIUM_RPC_URL_ARBITRUM: optionalTrimmed,
  PREMIUM_RPC_URL_POLYGON: optionalTrimmed,
  PREMIUM_RPC_URL_AVALANCHE: optionalTrimmed,
  PREMIUM_RPC_URL_CELO: optionalTrimmed,
  PREMIUM_RPC_URL_UNICHAIN: optionalTrimmed,
  PREMIUM_RPC_URL_HYPERLIQUID_EVM: optionalTrimmed,
  PREMIUM_RPC_URL_HYPEREVM: optionalTrimmed,
  PREMIUM_RPC_URL_MONAD: optionalTrimmed,
  SOLANA_PRIVATE_KEY_B58: optionalTrimmed,
  SOLANA_PRIVATE_KEY_JSON: optionalTrimmed,
  SOLANA_AUTOTRADER_PRIVATE_KEY_B58: optionalTrimmed,
  SOLANA_JITO_TIP_ACCOUNTS: optionalTrimmed,
  PROFILE_PROVISION_CACHE_TIMEOUT_MS: optionalTrimmed,
  PROFILE_WALLET_STORE_TIMEOUT_MS: optionalTrimmed,
  PYTH_BENCHMARK_TTL_SECONDS: optionalTrimmed,
  PYTH_LATEST_PRICE_TTL_SECONDS: optionalTrimmed,
  PYTH_NEWS_CACHE_TTL_SECONDS: optionalTrimmed,
  PYTH_PRICE_FEEDS_TTL_SECONDS: optionalTrimmed,
  PYTH_PRICE_HISTORY_TTL_SECONDS: optionalTrimmed,
  PYTH_SNAPSHOT_CACHE_TTL_SECONDS: optionalTrimmed,
  RAILWAY_REDIS_URL: optionalTrimmed,
  REDISHOST: optionalTrimmed,
  REDISPASSWORD: optionalTrimmed,
  REDISPORT: optionalTrimmed,
  REDISUSER: optionalTrimmed,
  REDIS_ENDPOINT: optionalTrimmed,
  REDIS_HOST: optionalTrimmed,
  REDIS_PASSWORD: optionalTrimmed,
  REDIS_PORT: optionalTrimmed,
  REDIS_SCHEME: optionalTrimmed,
  REDIS_TLS_URL: optionalTrimmed,
  REDIS_URL: optionalTrimmed,
  REDIS_USER: optionalTrimmed,
  SHARED_CACHE_URL: optionalTrimmed,
  RECEIPT_SIGNING_SECRET: optionalTrimmed,
  RESEND_API_KEY: optionalTrimmed,
  RESEND_FROM_EMAIL: optionalTrimmed,
  SANTIMENT_API_KEY: optionalTrimmed,
  NEXT_PUBLIC_SENTRY_DSN: optionalTrimmed,
  SENTRY_AUTH_TOKEN: optionalTrimmed,
  SITE_URL: optionalTrimmed,
  SESSION_KEY_HEADER: optionalTrimmed,
  SESSION_LOG_DRAIN_BATCH: optionalTrimmed,
  SESSION_LOG_TIMEOUT_MS: optionalTrimmed,
  SENTRY_ORG: optionalTrimmed,
  SENTRY_PROJECT: optionalTrimmed,
  STRIPE_BLOCK_SECRET_KEY: optionalTrimmed,
  STRIPE_BLOK_WEBHOOK_SECRET: optionalTrimmed,
  STRIPE_SECRET_KEY: optionalTrimmed,
  SUPABASE_ANON_KEY: optionalTrimmed,
  SUPABASE_PROJECT_URL: optionalTrimmed,
  SUPABASE_PUBLISHABLE_KEY: optionalTrimmed,
  SUPABASE_PUBLISHABLE_OR_ANON_KEY: optionalTrimmed,
  SUPABASE_SERVICE_ROLE_KEY: optionalTrimmed,
  SUPABASE_URL: optionalTrimmed,
  SUPABASE_USER_LOOKUP_TIMEOUT_MS: optionalTrimmed,
  SOSOVALUE_API_KEY: optionalTrimmed,
  TOKEN_METRICS_API_KEY: optionalTrimmed,
  TOKEN_SNAPSHOT_STEP_TIMEOUT_MS: optionalTrimmed,
  UPSTASH_REDIS_REST_TOKEN: optionalTrimmed,
  UPSTASH_REDIS_REST_URL: optionalTrimmed,
  VERCEL_URL: optionalTrimmed,
  WALLET_CHALLENGE_TTL_SECONDS: optionalTrimmed,
  // SECURITY: Required in production. A stable 32+ char secret used to HMAC wallet
  // addresses into deterministic emails, preventing address-to-email enumeration.
  // Changing this value will orphan existing wallet-based user accounts.
  // Field-level optional to avoid blocking dev startup; production enforcement is
  // handled by REQUIRED_PROD_ENV_VARS + superRefine below.
  WALLET_EMAIL_SALT: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => {
        // In production, must be at least 32 characters
        if (process.env.NODE_ENV === "production") {
          return typeof val === "string" && val.length >= 32;
        }
        // In development, allow missing or any non-empty string
        return true;
      },
      {
        message:
          "WALLET_EMAIL_SALT must be at least 32 characters in production. " +
          "Without it, wallet addresses are enumerable from email patterns.",
      },
    ),
  WALLET_LOGIN_EMAIL_DOMAIN: optionalTrimmed,
  ZEROEX_API_KEY: optionalTrimmed,
  ZERO_EX_API_KEY: optionalTrimmed,
  CROSSMINT_API_KEY: optionalTrimmed,
  CROSSMINT_SERVER_API_KEY: optionalTrimmed,
  CROSSMINT_ENV: optionalTrimmed,
  NEXT_PUBLIC_CROSSMINT_ENV: optionalTrimmed,
  NEXT_PUBLIC_ENABLE_CROSSMINT_WALLETS: optionalTrimmed,
  CROSSMINT_WEBHOOK_SECRET: optionalTrimmed,
  // Coinbase Developer Platform (CDP) Embedded Wallets
  NEXT_PUBLIC_CDP_PROJECT_ID: optionalTrimmed,
  NEXT_PUBLIC_ENABLE_CDP_WALLETS: optionalTrimmed,
  NEXT_PUBLIC_CDP_ENABLE_IN_DEV: optionalTrimmed,
  CDP_API_KEY_ID: optionalTrimmed,
  CDP_API_KEY_SECRET: optionalTrimmed,
  CDP_WALLET_SECRET: optionalTrimmed,
  // CDP JWT Bridge (RS256)
  CDP_JWT_RSA_PRIVATE_KEY: optionalTrimmed,
  CDP_JWT_RSA_PUBLIC_KEY: optionalTrimmed,
  CDP_JWT_ISSUER: optionalTrimmed,
  CDP_JWT_AUDIENCE: optionalTrimmed,
  CDP_JWT_TTL_SECONDS: optionalTrimmed,
  // CDP JWT Key Rotation (optional)
  CDP_JWT_RSA_PRIVATE_KEY_2: optionalTrimmed,
  CDP_JWT_RSA_PUBLIC_KEY_2: optionalTrimmed,
  CDP_JWT_ACTIVE_KID: optionalTrimmed,
  // CDP Webhooks
  CDP_WEBHOOK_SECRET: optionalTrimmed,
  // CDP Commerce (Coinbase Commerce crypto payments)
  CDP_COMMERCE_API_KEY: optionalTrimmed,
  CDP_COMMERCE_WEBHOOK_SECRET: optionalTrimmed,
  // Feature flags for legacy providers
  ENABLE_CROSSMINT_STELLAR: optionalTrimmed,
  // SECURITY: Dev-only auth bypass. Must NEVER be "true" in production.
  // Server-only variable (no NEXT_PUBLIC_ prefix) — never bundled into client JS.
  // A production guard in superRefine rejects "true" for NODE_ENV=production.
  DEV_AUTH_BYPASS: optionalTrimmed,
})
  .passthrough()
  .superRefine((env, ctx) => {
    // SECURITY: Block auth bypass in production builds
    if (
      env.NODE_ENV === "production" &&
      env.DEV_AUTH_BYPASS?.toLowerCase() === "true"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "DEV_AUTH_BYPASS must not be 'true' in production. " +
          "This env var bypasses authentication and is only intended for local development.",
      });
    }

    if (env.NODE_ENV === "production") {
      const missing = REQUIRED_PROD_ENV_VARS.filter((key) => {
        const value = (env as Record<string, UntypedJson>)[key];
        return typeof value !== "string" || value.trim().length === 0;
      });

      const hasAiProviderKey = [
        env.OPENAI_API_KEY,
        env.NEX_OPENAI_API_KEY,
        env.AI_API_KEY,
        env.AI_GATEWAY_API_KEY,
        env.VERCEL_AI_GATEWAY_API_KEY,
      ].some((value) => typeof value === "string" && value.trim().length > 0);

      if (!hasAiProviderKey) {
        missing.push(
          "OPENAI_API_KEY (or NEX_OPENAI_API_KEY / AI_API_KEY / AI_GATEWAY_API_KEY / VERCEL_AI_GATEWAY_API_KEY)",
        );
      }

      // Ensure at least one public key is present
      if (
        !env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ) {
        missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)");
      }

      if (missing.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Missing required production env vars: ${missing.join(", ")}`,
        });
      }
    }

    const supabaseRefs = new Map<string, string[]>();
    [
      { key: "NEXT_PUBLIC_SUPABASE_PROJECT_URL", value: env.NEXT_PUBLIC_SUPABASE_PROJECT_URL },
      { key: "NEXT_PUBLIC_SUPABASE_URL", value: env.NEXT_PUBLIC_SUPABASE_URL },
      { key: "SUPABASE_URL", value: env.SUPABASE_URL },
      { key: "SUPABASE_PROJECT_URL", value: env.SUPABASE_PROJECT_URL },
    ].forEach(({ key, value }) => {
      const ref = extractSupabaseProjectRef(value);
      if (!ref) return;
      const entries = supabaseRefs.get(ref) ?? [];
      entries.push(key);
      supabaseRefs.set(ref, entries);
    });

    if (supabaseRefs.size > 1) {
      const summary = Array.from(supabaseRefs.entries())
        .map(([ref, keys]) => `${ref} ← ${keys.join(", ")}`)
        .join(" | ");
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Supabase URL envs resolve to different project refs. " +
          "Align NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL (and SUPABASE_PROJECT_URL if set) to the same project origin " +
          `to avoid auth cookie mismatches. (${summary})`,
      });
    }
  });

export type Env = z.infer<typeof envSchema>;
