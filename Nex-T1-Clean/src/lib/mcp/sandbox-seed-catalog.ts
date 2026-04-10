export type SeedSandboxMcpServer = {
  id: string;
  name: string;
  description: string;
  category:
    | "ai"
    | "data"
    | "defi"
    | "devtools"
    | "integrations"
    | "productivity"
    | "web3";
};

export const SEED_SANDBOX_MCP_SERVERS: SeedSandboxMcpServer[] = [
  {
    id: "mcp-seed:github",
    name: "github",
    description:
      "GitHub API integration for repository management, issues, PRs, and code search",
    category: "devtools",
  },
  {
    id: "mcp-seed:filesystem",
    name: "filesystem",
    description: "Secure file system access with configurable allowed directories",
    category: "devtools",
  },
  {
    id: "mcp-seed:git",
    name: "git",
    description: "Git operations including clone, commit, push, branch management",
    category: "devtools",
  },
  {
    id: "mcp-seed:sqlite",
    name: "sqlite",
    description: "SQLite database operations with read/write support",
    category: "data",
  },
  {
    id: "mcp-seed:postgres",
    name: "postgres",
    description: "PostgreSQL database operations with secure connection management",
    category: "data",
  },
  {
    id: "mcp-seed:slack",
    name: "slack",
    description: "Slack workspace integration for messaging and channel management",
    category: "integrations",
  },
  {
    id: "mcp-seed:google-drive",
    name: "google-drive",
    description: "Google Drive file management and search",
    category: "integrations",
  },
  {
    id: "mcp-seed:brave-search",
    name: "brave-search",
    description: "Web search powered by Brave Search API",
    category: "ai",
  },
  {
    id: "mcp-seed:fetch",
    name: "fetch",
    description: "Fetch and parse web content with robots.txt compliance",
    category: "ai",
  },
  {
    id: "mcp-seed:puppeteer",
    name: "puppeteer",
    description: "Browser automation with Puppeteer for web scraping and testing",
    category: "ai",
  },
  {
    id: "mcp-seed:evm-wallet",
    name: "evm-wallet",
    description:
      "EVM wallet operations including balance checks, transfers, and contract interactions",
    category: "web3",
  },
  {
    id: "mcp-seed:defillama",
    name: "defillama",
    description:
      "DeFi protocol data including TVL, yields, and protocol metrics",
    category: "defi",
  },
  {
    id: "mcp-seed:uniswap",
    name: "uniswap",
    description: "Uniswap V3 pool data, quotes, and swap execution",
    category: "defi",
  },
  {
    id: "mcp-seed:coingecko",
    name: "coingecko",
    description: "Cryptocurrency market data from CoinGecko API",
    category: "web3",
  },
  {
    id: "mcp-seed:memory",
    name: "memory",
    description:
      "Knowledge graph-based memory for persistent context across sessions",
    category: "productivity",
  },
  {
    id: "mcp-seed:sequential-thinking",
    name: "sequential-thinking",
    description: "Step-by-step reasoning tool for complex problem solving",
    category: "ai",
  },
  {
    id: "mcp-seed:time",
    name: "time",
    description: "Time and timezone utilities",
    category: "productivity",
  },
];
