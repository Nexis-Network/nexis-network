import { AgentWizardData } from "@/components/launchpad/agent-wizard/store";

// Partial interface for ElizaOS Character (based on research)
export interface ElizaCharacter {
  name: string;
  clients: string[];
  modelProvider: string;
  bio: string[];
  lore: string[];
  knowledge: string[];
  messageExamples: Array<Array<{ user: string; content: { text: string } }>>;
  style: {
    all: string[];
    chat: string[];
    post: string[];
  };
  settings: {
    secrets: Record<string, string>;
    voice?: {
      model: string;
    };
  };
  plugins: string[];
}

export function generateCharacterConfig(data: AgentWizardData): ElizaCharacter {
  return {
    name: data.name,
    clients: [], // To be configured by user later or default to ["discord", "twitter"]
    modelProvider: "openai", // Defaulting to OpenAI for now
    bio: [data.bio],
    lore: [
      data.systemPrompt, 
      `Ticker: $${data.ticker}`,
      `Initial Launch Buy: ${data.initialBuyAmount} ETH`,
    ],
    knowledge: data.knowledge || [],
    messageExamples: [
      [
        { user: "{{user1}}", content: { text: "What is your ticker?" } },
        { user: data.name, content: { text: `My ticker is $${data.ticker}.` } },
      ],
      [
          { user: "{{user1}}", content: { text: "What do you do?" } },
          { user: data.name, content: { text: data.bio } },
        ],
    ],
    style: {
      all: data.adjectives || [],
      chat: data.adjectives || [],
      post: data.adjectives || [],
    },
    settings: {
      secrets: {},
    },
    plugins: [], // Will inject safe-plugin here in full implementation
  };
}
