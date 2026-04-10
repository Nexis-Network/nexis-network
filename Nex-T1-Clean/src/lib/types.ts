// Lightweight shared types for UI components. The full table editor artifacts are
// not needed for general app compile. We keep TableEditorData broad to avoid
// bringing in heavy artifact-only dependencies during typecheck.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TableEditorData = any;

export type ColumnType = "number" | "boolean" | "date" | "currency" | "text";

export type OperationStatus = "pending" | "applied" | "skipped" | "applying";

export type MergeStrategy = "append" | "prepend" | "insert_at_index";

export type SortOrder = "asc" | "desc";

export type ArtifactStage =
  | "loading"
  | "hydrating"
  | "transforming"
  | "complete";

// Extract specific types from the inferred schema
export type ArtifactOperation = TableEditorData["operations"][number];
export type ArtifactVersion = TableEditorData["versions"][number];
export type ColumnProfile = NonNullable<
  NonNullable<TableEditorData["summary"]>["columnProfiles"]
>[number];
export type ArtifactSummary = NonNullable<TableEditorData["summary"]>;
export type CurrentOperation = NonNullable<TableEditorData["currentOperation"]>;

// Extended type that includes metadata not in the schema
export type ArtifactDataWithMetadata = TableEditorData & {
  artifactId?: string;
  artifactVersion?: number;
};

export type ArtifactInstance = {
  id: string;
  stream: UntypedJson; // The artifact stream instance
};

// Agent-related types for agent UI components
type AgentInputField = {
  name: string;
  type: "input" | "textarea";
  label: string;
  placeholder: string;
};

type AgentTool = {
  name: string;
  description: string;
};

export type AgentType = {
  id: string;
  name: string;
  description: string;
  context: string;
  parameter?: string;
  inputFields: AgentInputField[];
  averageTime?: number;
  output?: string;
  resultTabs?: string[];
  tools?: AgentTool[];
  steps?: string[];
  capabilities?: string[];
};

export const agentTypes: AgentType[] = [
  {
    id: "multi-step-tool-usage",
    name: "Multi-step Tool Agent",
    description:
      "Breaks a complex prompt into sequential tool invocations, calling calculators, planners, or other helpers before composing a final answer.",
    context: "Great for analytics workflows that require deterministic tool usage with explicit intermediate steps.",
    parameter: "gpt-5-mini",
    inputFields: [
      {
        name: "prompt",
        type: "textarea",
        label: "Problem Statement",
        placeholder: "Explain the problem and what you expect the agent to solve step-by-step.",
      },
    ],
    averageTime: 16,
    output: "Detailed reasoning trace with per-tool results and a final answer.",
    resultTabs: ["response", "steps"],
    tools: [
      {
        name: "calculate",
        description: "Evaluates mathematical expressions, unit conversions, and lightweight analytics.",
      },
      {
        name: "planTrip",
        description: "Structured itinerary planner used here as an example side tool.",
      },
    ],
    steps: ["Decompose prompt", "Call appropriate tool", "Summarise findings"],
    capabilities: ["Tool orchestration", "Deterministic reasoning", "Intermediate visibility"],
  },
  {
    id: "sequential-processing",
    name: "Sequential Processor",
    description:
      "Runs a fixed pipeline — analyse, summarise, then conclude — ensuring each stage builds on prior output.",
    context: "Use when you need predictable stage-by-stage transformations such as content reviews or SOP generation.",
    parameter: "gpt-5-mini",
    inputFields: [
      {
        name: "content",
        type: "textarea",
        label: "Source Content",
        placeholder: "Paste the material that needs to be analysed and transformed.",
      },
      {
        name: "instructions",
        type: "textarea",
        label: "Guidance",
        placeholder: "Clarify the lens or output expectations for the final stage.",
      },
    ],
    averageTime: 12,
    output: "Structured JSON containing step results and a consolidated conclusion.",
    resultTabs: ["response", "steps"],
    capabilities: ["Deterministic pipelines", "Content normalisation", "Summarisation"],
  },
  {
    id: "parallel-processing",
    name: "Parallel Analyst",
    description:
      "Spawns multiple workers that attack different parts of a brief simultaneously, then aggregates their findings.",
    context: "Ideal when you want quick comparisons or need to explore multiple vectors (product, marketing, technical) in one pass.",
    inputFields: [
      {
        name: "request",
        type: "textarea",
        label: "Analysis Brief",
        placeholder: "Explain the scenario and what each parallel worker should investigate.",
      },
      {
        name: "dimensions",
        type: "textarea",
        label: "Focus Areas",
        placeholder: "List the lenses or swimlanes you want analysed (comma separated).",
      },
    ],
    averageTime: 10,
    output: "Independent worker reports plus a composite summary.",
    resultTabs: ["response"],
    capabilities: ["Parallel research", "Cross-comparison", "Aggregation"],
  },
  {
    id: "orchestrator-worker",
    name: "Orchestrator Worker",
    description:
      "Generates a project plan, spins up workers for each task, and tracks status via a coordinator tool.",
    context: "Use for delivery plans, implementation breakdowns, or multi-team coordination.",
    inputFields: [
      {
        name: "requirements",
        type: "textarea",
        label: "Requirements",
        placeholder: "Describe the project objectives, constraints, and success criteria.",
      },
      {
        name: "constraints",
        type: "textarea",
        label: "Constraints",
        placeholder: "List budget, timeline, or technical constraints (optional).",
      },
    ],
    averageTime: 20,
    output: "Task breakdown with worker assignments and deliverable summaries.",
    resultTabs: ["response", "steps"],
    tools: [
      { name: "orchestrator", description: "Breaks work into structured tasks." },
      { name: "coordinator", description: "Tracks progress, resolves blockers." },
      { name: "worker", description: "Executes specialised subtasks." },
    ],
    capabilities: ["Project decomposition", "Workflow management", "Status reporting"],
  },
  {
    id: "evaluator-optimizer",
    name: "Evaluator / Optimizer",
    description:
      "Runs iterative evaluate ➝ improve loops to raise content quality against custom criteria.",
    context: "Perfect for copywriting polish, proposal refinement, or code review checklists.",
    inputFields: [
      {
        name: "content",
        type: "textarea",
        label: "Draft Content",
        placeholder: "Paste the material that should be critiqued and improved.",
      },
      {
        name: "criteria",
        type: "textarea",
        label: "Evaluation Criteria",
        placeholder: "Explain the rubric or success bar you expect.",
      },
    ],
    averageTime: 18,
    output: "Iteration history with scores, feedback, and improved drafts.",
    resultTabs: ["response", "iterations"],
    capabilities: ["Quality scoring", "Iterative improvements", "Rubric enforcement"],
  },
  {
    id: "routing",
    name: "Routing Classifier",
    description:
      "Classifies a user request and suggests which agent stack should handle it, along with rationale.",
    context: "Drop into intake flows or customer triage funnels to auto-route work to the right specialist.",
    inputFields: [
      {
        name: "query",
        type: "textarea",
        label: "User Query",
        placeholder: "Paste the inbound question or ticket payload that needs routing.",
      },
    ],
    averageTime: 6,
    output: "Classification metadata with routing recommendation and reasoning.",
    resultTabs: ["response", "classification"],
    capabilities: ["Intent detection", "Route recommendation", "Confidence scoring"],
  },
  {
    id: "third-party-swap",
    name: "Third-party Swap Agent",
    description:
      "Builds a token swap quote using the connected third-party aggregator, summarising pricing, route, and risk info.",
    context:
      "Invoke when a user wants to exchange one asset for another using their integrated liquidity provider without leaving the chat.",
    parameter: "swap-aggregator",
    inputFields: [
      {
        name: "fromToken",
        type: "input",
        label: "From Token",
        placeholder: "e.g. ETH, SOL, USDC",
      },
      {
        name: "toToken",
        type: "input",
        label: "To Token",
        placeholder: "e.g. AAVE, USDT, WBTC",
      },
      {
        name: "amount",
        type: "input",
        label: "Amount",
        placeholder: "Size of the swap (optional).",
      },
      {
        name: "notes",
        type: "textarea",
        label: "Extra Context",
        placeholder: "Wallet address, slippage prefs, or venue requirements.",
      },
    ],
    averageTime: 7,
    output: "Swap preview with token balances, USD notionals, route, execution ETA, and warnings.",
    resultTabs: ["response"],
    tools: [
      {
        name: "aggregatorQuote",
        description: "Fetches live swap quotes and price impact metrics from partner aggregators.",
      },
      {
        name: "tokenMetadata",
        description: "Resolves token logos, symbols, and portfolio balances.",
      },
    ],
    capabilities: ["DEX aggregation", "Route visualisation", "Risk flagging"],
  },
  {
    id: "crypto-market-analyst",
    name: "Crypto Market Analyst",
    description:
      "Fetches live Pyth Network data for a token pair, renders an interactive chart, surfaces key metrics, and highlights fresh headlines.",
    context: "Use when you need real-time market colour before making a trading call or writing a market wrap.",
    parameter: "pyth + news",
    inputFields: [
      {
        name: "ticker",
        type: "input",
        label: "Ticker",
        placeholder: "e.g. BTC/USD, SOL/USD, ETH/USD",
      },
      {
        name: "focus",
        type: "textarea",
        label: "Focus Points",
        placeholder: "Optional: add notes (e.g. look at funding, catalysts, or on-chain flows).",
      },
    ],
    averageTime: 8,
    output: "Live chart, 24h performance metrics, curated news, and a markdown summary.",
    resultTabs: ["response"],
    capabilities: ["Real-time pricing", "Headline surfacing", "Quick market insights"],
  },
];

export type ExamplePrompt = Record<string, string>;
export const examplePrompts: Record<string, ExamplePrompt[]> = {
  "multi-step-tool-usage": [
    {
      prompt:
        "Estimate the total cost of launching a 3-city pop-up tour (venue, staffing, marketing) and outline action steps.",
    },
  ],
  "sequential-processing": [
    {
      content: "Paste the latest product changelog",
      instructions: "Summarise for executives and highlight risky updates.",
    },
  ],
  "parallel-processing": [
    {
      request: "Review the AI roadmap for GTM, product, and technical risks.",
      dimensions: "GTM, Product, Technical",
    },
  ],
  "orchestrator-worker": [
    {
      requirements: "Launch a referral program in 6 weeks with analytics and fraud checks.",
      constraints: "Budget $20k, small growth team, must support Stripe payouts.",
    },
  ],
  "evaluator-optimizer": [
    {
      content: "Writeup of our Series B deck intro",
      criteria: "Clarity, momentum, proof points, founder voice.",
    },
  ],
  routing: [
    {
      query:
        "Customer wants a new Zapier integration with custom auth, urgent for enterprise pilot—where should this go?",
    },
  ],
  "third-party-swap": [
    {
      fromToken: "ETH",
      toToken: "AAVE",
      amount: "3.5",
      notes:
        "Swap via our integrated aggregator at <=0.5% slippage. Wallet: 0xabc...123. Share min received and route.",
    },
  ],
  "crypto-market-analyst": [
    {
      ticker: "SOL/USD",
      focus: "Pay attention to 24h volatility, funding catalysts, and notable whale moves.",
    },
  ],
};

export interface ExecutionResult {
  template: string;
  stdout: string[];
  stderr: string[];
  runtime: number;
  cellId: string;
  executionId: string;
}

export interface ExecutionResultInterpreter extends ExecutionResult {
  results: {
    text: string;
    html?: string;
    png?: string;
    jpeg?: string;
    pdf?: string;
    svg?: string;
    json?: UntypedJson;
    is_main_result?: boolean;
  }[];
}

export interface ExecutionResultWeb extends ExecutionResult {
  url: string;
}

