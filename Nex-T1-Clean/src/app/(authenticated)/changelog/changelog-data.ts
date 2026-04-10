export type ChangeType = "feature" | "improvement" | "fix";

export type ChangelogEntry = {
    id: string;
    version: string;
    date: string;
    title: string;
    description: string;
    changes: {
        type: ChangeType;
        text: string;
    }[];
};

export const CHANGELOG_DATA: ChangelogEntry[] = [
    {
        id: "v2.3.0",
        version: "v2.3.0",
        date: "January 15, 2026",
        title: "The All-In-One Intelligence Update",
        description: "We've massively expanded the platform's capabilities with a dedicated screener, smart wallet integration, live charting, and a more powerful AI agent.",
        changes: [
            {
                type: "feature",
                text: "Advanced Crypto Screener: A powerful new tool to filter, sort, and discover hidden gems across the market with real-time data.",
            },
            {
                type: "feature",
                text: "Smart Wallet & Assets Integration: Full control over your Smart Wallet Assets with a dedicated view and seamless management.",
            },
            {
                type: "feature",
                text: "Real-Time Price Charts: Interactive, live-updating price charts embedded directly into your workflow for instant technical analysis.",
            },
            {
                type: "improvement",
                text: "Next-Gen AI Capabilities: Our agent is now smarter, faster, and handles complex multi-step interactions with greater nuance.",
            },
            {
                type: "improvement",
                text: "Performance Overhaul: Major under-the-hood optimizations for a snappier, more responsive application experience.",
            },
        ],
    },
    {
        id: "v2.2.0",
        version: "v2.2.0",
        date: "January 6, 2026",
        title: "The Agentic Coding & Visualization Update",
        description: "Nex-T1 evolves into a full-stack developer and data scientist. With the new E2B Sandbox and Interactive Charts, your agent can now write, run, and visualize code in real-time.",
        changes: [
            {
                type: "feature",
                text: "E2B Code Sandbox: Agents can now spawn secure cloud sandbooks to execute Python and JS code instantly. It's not just chat anymore; it's a living IDE.",
            },
            {
                type: "feature",
                text: "Interactive Charts: Markets are visual, and now so is Nex-T1. Ask for a 'candlestick chart of SOL' or 'ETH burn rate analysis' and get dynamic, interactive visualizations.",
            },
            {
                type: "improvement",
                text: "Automated MCP Registry: The agent now self-discovers tools. We hooked up a Supabase backend that automatically indexes and health-checks your MCP servers.",
            },
        ],
    },
    {
        id: "v2.1.5",
        version: "v2.1.5",
        date: "December 30, 2025",
        title: "Portfolio V2 & Smart Passkeys",
        description: "A complete reimagining of how you view your wealth. We've unified EVM and Solana holdings into a single, gorgeous 'Sky' themed dashboard.",
        changes: [
            {
                type: "feature",
                text: "Unified Multi-Chain Portfolio: No more switching networks. See your Net Worth, Tokens, and NFTs across Ethereum, Solana, Base, and Arbitrum in one view.",
            },
            {
                type: "feature",
                text: "Smart Wallet Passkeys: We killed the seed phrase. Create and secure your Nex-T1 Smart Wallet using just your FaceID or TouchID.",
            },
            {
                type: "improvement",
                text: "Visual Overhaul: Introducing the 'Sky' aesthetic—clean blues, glassmorphism, and subtle animations that make finance feel premium.",
            },
        ],
    },
    {
        id: "v2.1.0",
        version: "v2.1.0",
        date: "December 25, 2025",
        title: "The Great MCP Expansion",
        description: "A specialized Christmas update gifting your agents with superpowers. We've integrated the heavy hitters of crypto data directly into the agent's brain.",
        changes: [
            {
                type: "feature",
                text: "Blockscout & Helius: Deep chain insights are now native. Your agent can debug transactions and trace funds like a forensic analyst.",
            },
            {
                type: "feature",
                text: "Pump.fun Integration: Degen mode unlocked. Track new launches, analyze bonding curves, and ape responsibly with AI assistance.",
            },
            {
                type: "improvement",
                text: "Agent V2 Context: We increased the context window and improved the 'Tool Selection' logic, so the agent knows exactly which data provider to call.",
            },
        ],
    },
    {
        id: "v2.0.5",
        version: "v2.0.5",
        date: "December 22, 2025",
        title: "UI Polishing & Core Stability",
        description: "Before the holidays, we sat down and polished every pixel. The sidebar, the chat shell, the typography—everything feels tighter.",
        changes: [
            {
                type: "improvement",
                text: "Sidebar 2.0: A collapsible, responsive sidebar that actually remembers your state. Icons stay fixed, animations are buttery smooth.",
            },
            {
                type: "improvement",
                text: "Chat Shell Refactor: We rebuilt the message rendering engine. Artifacts now load 30% faster and don't jitter when streaming content.",
            },
            {
                type: "fix",
                text: "Squashed a dozen UI bugs related to dark mode flickering and mobile padding inconsistencies.",
            },
        ],
    },
    {
        id: "v2.0.2",
        version: "v2.0.2",
        date: "December 18, 2025",
        title: "Foundation Strengthening",
        description: "Quietly laying the groundwork for the massive features coming in 2026. This update was all about reliability and architecture.",
        changes: [
            {
                type: "improvement",
                text: "Supabase Migration: We moved our core persistence layer to a robust Supabase setup, enabling real-time sync and better Auth.",
            },
            {
                type: "feature",
                text: "Initial MCP Support: The first beta version of the Model Context Protocol handler was merged. Examples included simple filesystem access.",
            },
            {
                type: "fix",
                text: "Fixed a critical race condition in the wallet connection flow that caused some users to disconnect randomly.",
            },
        ],
    },
    {
        id: "v2.0.1",
        version: "v2.0.1",
        date: "December 7–13, 2025",
        title: "AI Arena Week: Leaderboard, Marketplace, Safe Approvals",
        description:
            "A major AI Arena update focused on discovery, trust, and control. Track agent performance on the leaderboard, copy or rent agents from the marketplace, and manage Safe-based approvals and spend policies with a smoother wallet experience across the app.",
        changes: [
            {
                type: "feature",
                text: "AI Leaderboard: compare top agents over time, filter by date range/network/interval, and drill into trades and performance details.",
            },
            {
                type: "feature",
                text: "Marketplace rentals + one-click copy: copy public/unlisted agents into your workspace as private, rent private agents with usage metering, and manage listings from the agent page.",
            },
            {
                type: "feature",
                text: "Agent detail controls (managers): deploy versions to TEE, edit visibility/metadata, update tool allowlists, and view per-agent trade history.",
            },
            {
                type: "feature",
                text: "Agent Spend center: review pending Safe approvals, approve transactions with your owner key, and manage spend policies, delegates/keys, and notification settings.",
            },
            {
                type: "improvement",
                text: "Navigation polish: new AI Arena shortcuts in the sidebar and cleaner grouped menus in Settings for faster discovery.",
            },
            {
                type: "improvement",
                text: "Strategy Builder onboarding: create drafts without selecting a workspace upfront—your default workspace is auto-provisioned when needed.",
            },
            {
                type: "improvement",
                text: "Wallet UX upgrades: clearer Safe wallet labels, provisioning status, and explorer links across the header, sidebar, and settings.",
            },
            {
                type: "improvement",
                text: "Chat tooling: MCP venue tools are now available in chat (read-only by default), with safer gating for value-moving actions.",
            },
            {
                type: "fix",
                text: "Reliability & safety hardening: reduced leaderboard API 500s, fixed Safe approval signature mismatches, and tightened privacy controls for private agents.",
            },
        ],
    },
    {
        id: "v2.0.0",
        version: "v2.0.0",
        date: "November 29, 2025",
        title: "Nex-T1 Enterprise 2.0: The Singularity Update",
        description: "A monumental leap in autonomous agent capabilities. Nex-T1 can now self-correct, propose multi-step architectural changes, and manage entire DeFi portfolios with zero human intervention (if permitted).",
        changes: [
            { type: "feature", text: "Autonomous Agents V2: Agents now possess 'Self-Healing' capabilities to recover from failed transactions and API errors without user input." },
            { type: "feature", text: "Global Liquidity Aggregation: Unified liquidity layer across 15+ chains, providing the absolute best execution prices in the industry." },
            { type: "improvement", text: "Neural Interface: Redesigned chat interface that predicts your next command based on portfolio context." },
            { type: "fix", text: "Resolved latency issues in cross-chain bridge confirmations." },
        ],
    },
    {
        id: "v1.9.0",
        version: "v1.9.0",
        date: "October 15, 2025",
        title: "AI Safety & Guardrails 2.0",
        description: "Introducing the industry's most advanced safety layer for AI-driven finance, ensuring your capital is protected against hallucinations and market volatility.",
        changes: [
            { type: "feature", text: "Transaction Simulation Engine: Every AI-proposed transaction is now simulated in a sandboxed environment before execution." },
            { type: "feature", text: "Risk Profiles: Define strict risk parameters (e.g., 'Low Volatility Only') that agents must adhere to." },
            { type: "improvement", text: "Audit Logs: Immutable, blockchain-verified logs of every decision made by your AI agents." },
        ],
    },
    {
        id: "v1.8.5",
        version: "v1.8.5",
        date: "September 20, 2025",
        title: "Institutional Custody Integrations",
        description: "Bridging the gap between DeFi and institutional finance with direct support for major custody providers.",
        changes: [
            { type: "feature", text: "Fireblocks & Copper Support: Connect your institutional custody wallets directly to Nex-T1." },
            { type: "feature", text: "Multi-Sig Coordination: AI agents can now propose transactions to Gnosis Safe and other multi-sig wallets for human approval." },
            { type: "improvement", text: "Compliance Reporting: One-click generation of tax and compliance reports for institutional clients." },
        ],
    },
    {
        id: "v1.8.0",
        version: "v1.8.0",
        date: "August 10, 2025",
        title: "Nexis Voice: Talk to Your Portfolio",
        description: "A revolutionary new way to interact with your investments. Just speak, and Nex-T1 executes.",
        changes: [
            { type: "feature", text: "Voice Command Interface: Execute trades, check balances, and rebalance portfolios using natural voice commands." },
            { type: "feature", text: "Real-time Audio Briefings: Get a personalized daily market briefing read to you by your AI agent." },
            { type: "fix", text: "Fixed microphone permission handling on mobile browsers." },
        ],
    },
    {
        id: "v1.7.0",
        version: "v1.7.0",
        date: "July 05, 2025",
        title: "Solana Blinks & Actions",
        description: "Deep integration with the Solana ecosystem's latest innovations, making crypto interactions shareable and instant.",
        changes: [
            { type: "feature", text: "Solana Blinks Support: Unfurl Solana transactions directly in the chat interface as interactive 'Blinks'." },
            { type: "feature", text: "Shareable Actions: Generate links to share complex DeFi strategies with friends or followers." },
            { type: "improvement", text: "Solana RPC Optimization: 50% faster transaction submission on the Solana network." },
        ],
    },
    {
        id: "v1.6.0",
        version: "v1.6.0",
        date: "June 01, 2025",
        title: "Nex MCP V1.0 Official Launch",
        description: "The Model Context Protocol (MCP) is now stable and open for all developers. Build your own tools for Nex-T1.",
        changes: [
            { type: "feature", text: "Developer SDK: Comprehensive TypeScript SDK for building custom MCP servers." },
            { type: "feature", text: "Plugin Marketplace: Browse and install community-created tools directly from the dashboard." },
            { type: "improvement", text: "Tool Chaining: Agents can now chain multiple MCP tools together for complex workflows." },
        ],
    },
    {
        id: "v1.5.0",
        version: "v1.5.0",
        date: "May 15, 2025",
        title: "Enterprise Team Features",
        description: "Powerful collaboration tools for teams managing shared capital and strategies.",
        changes: [
            { type: "feature", text: "Role-Based Access Control (RBAC): Granular permissions for team members (Viewer, Trader, Admin)." },
            { type: "feature", text: "Shared Workspaces: Create distinct workspaces for different funds or strategies." },
            { type: "fix", text: "Resolved synchronization issues when multiple team members edit a strategy simultaneously." },
        ],
    },
    {
        id: "v1.4.5",
        version: "v1.4.5",
        date: "April 20, 2025",
        title: "AI Copilot Mode",
        description: "Your agent is no longer just reactive. Copilot mode proactively suggests opportunities based on your portfolio.",
        changes: [
            { type: "feature", text: "Proactive Suggestions: The AI now analyzes the market 24/7 and pings you with high-confidence opportunities." },
            { type: "feature", text: "Portfolio Health Check: Automated weekly reports on portfolio risk, diversity, and performance." },
            { type: "improvement", text: "Context Awareness: The AI remembers context from previous conversations for weeks." },
        ],
    },
    {
        id: "v1.4.0",
        version: "v1.4.0",
        date: "March 10, 2025",
        title: "Cross-Chain Bridge Aggregator",
        description: "Move assets between chains seamlessly without leaving the interface. We find the cheapest and fastest route.",
        changes: [
            { type: "feature", text: "Integrated Bridge Aggregator: Compare rates from 10+ bridges (Stargate, Across, Hop, etc.) instantly." },
            { type: "feature", text: "One-Click Bridging: Abstracted complexity - just say 'Move USDC to Optimism' and it happens." },
            { type: "fix", text: "Fixed gas estimation errors on Layer 2 networks." },
        ],
    },
    {
        id: "v1.3.5",
        version: "v1.3.5",
        date: "February 15, 2025",
        title: "Advanced DeFi Strategies",
        description: "Unlock the power of automated yield farming and liquidity provision.",
        changes: [
            { type: "feature", text: "Yield Optimizer: Automatically move stablecoins to the highest yielding protocols (Aave, Compound, Morpho)." },
            { type: "feature", text: "Concentrated Liquidity Manager: Automated range management for Uniswap V3 positions." },
            { type: "improvement", text: "Strategy Backtesting: Simulate strategies against historical data before deploying capital." },
        ],
    },
    {
        id: "v1.3.0",
        version: "v1.3.0",
        date: "January 20, 2025",
        title: "Nex MCP Alpha",
        description: "The beginning of an open ecosystem. Connect external data and tools to your AI agent.",
        changes: [
            { type: "feature", text: "Custom Tool Support: Connect any API to Nex-T1 using the Model Context Protocol." },
            { type: "feature", text: "Local MCP Servers: Run tools on your local machine that the hosted AI can interact with securely." },
            { type: "fix", text: "Improved error handling for external tool timeouts." },
        ],
    },
    {
        id: "v1.2.5",
        version: "v1.2.5",
        date: "December 10, 2024",
        title: "Mobile App 2.0 Beta",
        description: "A completely redesigned mobile experience, bringing the full power of Nex-T1 to your pocket.",
        changes: [
            { type: "feature", text: "Native Mobile Chat: Optimized chat interface for iOS and Android." },
            { type: "feature", text: "Biometric Auth: Secure your wallet with FaceID/TouchID." },
            { type: "improvement", text: "Push Notifications: Real-time alerts for filled orders and liquidation risks." },
        ],
    },
    {
        id: "v1.2.0",
        version: "v1.2.0",
        date: "November 29, 2024",
        title: "The Intelligence & Market Update",
        description: "A major leap forward in AI reasoning capabilities and real-time market intelligence.",
        changes: [
            { type: "feature", text: "Next-Gen AI Engine: Upgraded to GPT-5 class models for superior reasoning." },
            { type: "feature", text: "Live Market Feed: Real-time 'New Pairs' and 'Fresh Listings' via Dextools." },
            { type: "feature", text: "Interactive Chat Actions: Copy, download, and share AI insights." },
        ],
    },
];
