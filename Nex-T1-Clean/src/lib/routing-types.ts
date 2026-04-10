import type { ToolUIPart, UIMessage } from "ai";
import type {
  ClassificationCategory,
  ClassificationComplexity,
  ClassificationModelTier,
  ClassificationRoute,
} from "./routing-classification";
import type { HeuristicSignals } from "./routing-heuristics";

// Define custom data part types for different stages
export type RoutingDataParts = {
  "transient-stage-data": {
    s: string; // stage
    m: string; // message
  };
  "agent-metadata": {
    classification?: {
      type: ClassificationCategory;
      complexity: ClassificationComplexity;
      confidence: number;
    };
    heuristics?: {
      category: ClassificationCategory;
      route: ClassificationRoute;
      tier: ClassificationModelTier;
      confidence: number;
      signals?: HeuristicSignals;
    };
    agent?: {
      task: string;
      icon: string;
      color: string;
    };
    processing?: {
      startTime: number;
      endTime?: number;
      duration?: number;
    };
    model?: {
      name: string;
      provider: string;
    };
    // reasoning: string;
  };
  "agent-info": {
    task: string;
    icon: string;
    color: string;
    systemPrompt: string;
  };
};

// Define custom metadata type
export type RoutingMetadata = {
  classification: {
    type: ClassificationCategory;
    complexity: ClassificationComplexity;
    confidence: number;
  };
  agent: {
    task: string;
    icon: string;
    color: string;
  };
  processing: {
    startTime: number;
    endTime?: number;
    duration?: number;
  };
  model: {
    name: string;
    provider: string;
  };
  heuristics?: {
    category: ClassificationCategory;
    route: ClassificationRoute;
    tier: ClassificationModelTier;
    confidence: number;
    signals: HeuristicSignals;
  };
};

// Create the custom UIMessage type
export type RoutingToolInvocation = ToolUIPart & {
  toolName: string;
  input?: UntypedJson;
  output?: UntypedJson;
  errorText?: string;
  [key: string]: UntypedJson;
};

export type RoutingUIMessage = UIMessage<RoutingMetadata, RoutingDataParts> & {
  ui?: RoutingToolInvocation[];
};

export const agentConfigs = {
  general_chat: {
    task: "General Chat",
    icon: "🧠",
    color: "bg-indigo-300 border-indigo-300",
    systemPrompt:
      "You are a thoughtful, friendly general conversationalist. Keep responses natural, helpful, and succinct. Offer clear next steps when useful.",
  },
  general_support: {
    task: "General Support",
    icon: "🤝",
    color: "bg-blue-300 border-blue-300",
    systemPrompt:
      "You are a general support specialist. Provide helpful, accurate, and comprehensive responses to general questions and information requests. Focus on being informative and helpful.",
  },
  product_support: {
    task: "Product Support",
    icon: "📦",
    color: "bg-green-300 border-green-300",
    systemPrompt:
      "You are a product support specialist. Focus on product features, functionality, usage guidance, and feature requests. Help users understand and get the most out of the product.",
  },
  technical_support: {
    task: "Technical Support",
    icon: "⚙️",
    color: "bg-purple-300 border-purple-300",
    systemPrompt:
      "You are a technical support specialist. Focus on technical solutions, API issues, implementation guidance, and troubleshooting. Provide detailed technical expertise and debugging help.",
  },
  refund_support: {
    task: "Refund Support",
    icon: "💰",
    color: "bg-red-300 border-red-300",
    systemPrompt:
      "You are a refund support specialist. Handle refund requests, billing disputes, and payment issues with empathy and professionalism. Focus on resolution and customer satisfaction.",
  },
  account_support: {
    task: "Account Support",
    icon: "👤",
    color: "bg-orange-300 border-orange-300",
    systemPrompt:
      "You are an account support specialist. Help with login issues, password resets, account access problems, and account management. Focus on security and account recovery.",
  },
  billing_support: {
    task: "Billing Support",
    icon: "💳",
    color: "bg-teal-300 border-teal-300",
    systemPrompt:
      "You are a billing support specialist. Handle billing questions, payment issues, subscription changes, and pricing inquiries. Focus on clarity and billing resolution.",
  },
  other: {
    task: "General Assistant",
    icon: "🤖",
    color: "bg-gray-300 border-gray-300",
    systemPrompt:
      "You are a general AI assistant. Handle off-topic conversations, general questions, and any requests that don't fit other categories. Be friendly and helpful while steering conversations back to relevant topics when appropriate.",
  },
};
export function getAgentConfig(type: string) {
  const agentConfigs = {
    general_chat: {
      task: "General Chat",
      icon: "🧠",
      color: "bg-indigo-300",
      systemPrompt:
        "You are a thoughtful, friendly general conversationalist. Keep responses natural, helpful, and succinct. Offer clear next steps when useful.",
    },
    general_support: {
      task: "General Support",
      icon: "🤝",
      color: "bg-blue-300",
      systemPrompt:
        "You are a general support specialist. Provide helpful, accurate, and comprehensive responses to general questions and information requests. Focus on being informative and helpful.",
    },
    product_support: {
      task: "Product Support",
      icon: "📦",
      color: "bg-green-300",
      systemPrompt:
        "You are a product support specialist. Focus on product features, functionality, usage guidance, and feature requests. Help users understand and get the most out of the product.",
    },
    technical_support: {
      task: "Technical Support",
      icon: "⚙️",
      color: "bg-purple-300",
      systemPrompt:
        "You are a technical support specialist. Focus on technical solutions, API issues, implementation guidance, and troubleshooting. Provide detailed technical expertise and debugging help.",
    },
    refund_support: {
      task: "Refund Support",
      icon: "💰",
      color: "bg-red-300",
      systemPrompt:
        "You are a refund support specialist. Handle refund requests, billing disputes, and payment issues with empathy and professionalism. Focus on resolution and customer satisfaction.",
    },
    account_support: {
      task: "Account Support",
      icon: "👤",
      color: "bg-orange-300",
      systemPrompt:
        "You are an account support specialist. Help with login issues, password resets, account access problems, and account management. Focus on security and account recovery.",
    },
    billing_support: {
      task: "Billing Support",
      icon: "💳",
      color: "bg-teal-300",
      systemPrompt:
        "You are a billing support specialist. Handle billing questions, payment issues, subscription changes, and pricing inquiries. Focus on clarity and billing resolution.",
    },
    other: {
      task: "General Assistant",
      icon: "🤖",
      color: "bg-gray-300",
      systemPrompt:
        "You are a general AI assistant. Handle off-topic conversations, general questions, and any requests that don't fit other categories. Be friendly and helpful while steering conversations back to relevant topics when appropriate.",
    },
  };

  return agentConfigs[type as keyof typeof agentConfigs] || agentConfigs.other;
}
