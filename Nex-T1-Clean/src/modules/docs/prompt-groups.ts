export type DocsPromptExample = {
  title: string;
  prompt: string;
  explanation: string;
  result: string;
  bestFor?: string;
  watchFor?: string;
};

export type DocsPromptGroup = {
  id: string;
  title: string;
  description: string;
  prompts: DocsPromptExample[];
};

export const DOCS_PROMPT_GROUPS: DocsPromptGroup[] = [
  {
    id: "portfolio-and-research",
    title: "Portfolio and research",
    description: "Use these to move from raw balances into diagnosis, risk framing, and next-step planning.",
    prompts: [
      {
        title: "Portfolio health review",
        prompt:
          "Review my current portfolio and identify the biggest concentration risks, idle capital pockets, and assets that deserve a follow-up research pass before I rebalance anything.",
        explanation: "Starts with a diagnostic view instead of jumping straight to execution.",
        result: "A prioritized review with research follow-ups and potential rebalance questions.",
        bestFor: "Weekly portfolio check-ins and pre-trade reviews.",
      },
      {
        title: "Cross-chain opportunity comparison",
        prompt:
          "Compare the strongest opportunities I have across my connected EVM wallets and Solana activity. Keep it research-first and highlight what needs manual review before any action.",
        explanation: "Frames the request across chain families without assuming the same action depth everywhere.",
        result: "A chain-by-chain comparison with clear review points.",
        bestFor: "Multi-chain users deciding where to focus next.",
      },
      {
        title: "Research pack for one asset",
        prompt:
          "Build a research brief for [asset or token] using on-chain activity, market structure, and portfolio relevance. End with a short list of questions I should answer before trading it.",
        explanation: "Useful when you want analysis and guardrails instead of a fast conviction jump.",
        result: "A structured research memo with decision questions.",
        bestFor: "New tokens, governance tokens, or assets you already hold.",
      },
    ],
  },
  {
    id: "trading-and-execution",
    title: "Trading and execution",
    description: "These prompts help you turn research into execution planning without skipping risk checks.",
    prompts: [
      {
        title: "Trade plan before execution",
        prompt:
          "I am considering a position in [asset]. Give me an execution plan with entry considerations, invalidation signals, liquidity checks, and what I should confirm in my wallet context before signing anything.",
        explanation: "Moves the conversation into trade design while preserving review steps.",
        result: "An execution checklist with risk framing and wallet checks.",
        bestFor: "Manual trading decisions where you still want control.",
      },
      {
        title: "Rebalance proposal",
        prompt:
          "Suggest a conservative rebalance plan for my portfolio based on current allocations, recent market conditions, and chain-specific transaction cost tradeoffs. Do not assume I want to execute immediately.",
        explanation: "Good for scenario planning without implying that a rebalance should happen now.",
        result: "A rebalance proposal with reasons, tradeoffs, and optional next steps.",
        bestFor: "Portfolio maintenance and treasury reviews.",
      },
      {
        title: "CEX and on-chain comparison",
        prompt:
          "Compare the trade setup for [asset pair] using my connected exchange accounts and on-chain routes. Focus on liquidity, fees, timing, and what permissions or wallet approvals would matter.",
        explanation: "Useful when you want the platform to compare centralized and on-chain options before you act.",
        result: "A venue comparison with operational considerations.",
        bestFor: "Users who keep capital across exchanges and wallets.",
        watchFor: "Exchange-linked actions only work after the account is connected with the needed permissions.",
      },
    ],
  },
  {
    id: "dao-and-governance",
    title: "DAO and governance",
    description: "Use these when you want help creating, reviewing, or operating a DAO workspace.",
    prompts: [
      {
        title: "Create or import a DAO workspace",
        prompt:
          "Help me create or import a DAO workspace. I want a checklist for governance model, treasury setup, signer access, and what I need connected before the workspace is ready to use.",
        explanation: "Sets up the right prerequisites instead of skipping straight to operations.",
        result: "A DAO setup checklist tailored to the current workspace flow.",
        bestFor: "New DAO launches or importing an existing organization.",
      },
      {
        title: "Proposal review assistant",
        prompt:
          "Review this DAO proposal as if I am preparing for a vote. Summarize the intent, likely treasury or governance impact, open questions, and what evidence I should verify before I support it.",
        explanation: "Ideal for turning proposal text into a structured decision memo.",
        result: "A vote-prep brief with questions and follow-ups.",
        bestFor: "Governance contributors and treasury reviewers.",
      },
      {
        title: "Treasury action preparation",
        prompt:
          "Prepare a treasury action review for my DAO. Focus on why the action is being proposed, what wallet or signer approvals will be required, and what could block execution.",
        explanation: "Keeps treasury work grounded in approvals and access constraints.",
        result: "A treasury action brief with operational blockers called out.",
        bestFor: "Treasury rebalances, transfers, or spend proposals.",
        watchFor: "DAO actions depend on workspace bindings, treasury ownership, and the wallet you have connected.",
      },
    ],
  },
  {
    id: "prediction-markets",
    title: "Prediction markets",
    description: "These prompts are designed for research and trade preparation around Polymarket workflows.",
    prompts: [
      {
        title: "Market thesis review",
        prompt:
          "Review the Polymarket market I am considering and help me build a balanced thesis. Include the event framing, what evidence matters most, and what I should verify before placing a trade.",
        explanation: "Focuses on decision quality before any order preview or trade action.",
        result: "A research summary with a more disciplined market thesis.",
        bestFor: "Binary event markets and time-sensitive narratives.",
      },
      {
        title: "Position and orderbook check",
        prompt:
          "Use my current Polymarket context to review open positions, orderbook conditions, and downside scenarios. Highlight anything that suggests I should reduce size or wait.",
        explanation: "Useful once credentials are connected and you want position-aware guidance.",
        result: "A position review with orderbook and timing considerations.",
        bestFor: "Existing Polymarket users managing live exposure.",
        watchFor: "Trading requires saved Polymarket credentials and regional eligibility.",
      },
    ],
  },
  {
    id: "automation-and-review",
    title: "Automation and review",
    description: "Use these when you want ongoing monitoring or task execution without losing review control.",
    prompts: [
      {
        title: "Design an automation safely",
        prompt:
          "Help me design an automation for [goal]. Start read-only, define the signals it should monitor, show where approvals would still be required, and suggest safe rollout stages.",
        explanation: "Treats automation as staged and review-aware from the start.",
        result: "A phased automation plan with approval boundaries.",
        bestFor: "Monitoring, alerts, or bounded recurring tasks.",
      },
      {
        title: "Automation quality review",
        prompt:
          "Audit my current automation settings and tasks. Identify anything that is too broad, unclear, or under-specified, then recommend tighter scopes and better review checkpoints.",
        explanation: "Helps improve existing automations instead of creating new ones blindly.",
        result: "A quality review with concrete hardening steps.",
        bestFor: "Users already running recurring workflows.",
      },
      {
        title: "Market monitor with escalation rules",
        prompt:
          "Create a monitoring workflow for [asset, wallet, DAO, or market]. I want alerts and summaries first, then clear escalation rules for when human review should happen before any action.",
        explanation: "Good for ongoing coverage without turning the system into an unsupervised actor.",
        result: "A monitoring design with escalation thresholds and review triggers.",
        bestFor: "Treasury monitoring, portfolio risk checks, and market watchlists.",
      },
    ],
  },
];
