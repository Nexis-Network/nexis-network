import { create } from "zustand";

export type AgentWizardData = {
  name: string;
  ticker: string;
  bio: string;
  
  // Personality / ElizaOS
  systemPrompt: string; // The core instruction/lore
  adjectives: string[]; // e.g. ["helpful", "witty"]
  knowledge: string[]; // Array of facts
  
  // Economics
  initialBuyAmount: number; // Amount of Native Token to buy initial supply with
  antiSniperMode: boolean; // Virtualz mechanic enablement
};

type AgentWizardState = {
  data: AgentWizardData;
  currentStep: number;
  totalSteps: number;
  
  setData: (update: Partial<AgentWizardData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: number) => void;
  reset: () => void;
};

const INITIAL_DATA: AgentWizardData = {
  name: "",
  ticker: "",
  bio: "",
  systemPrompt: "You are an AI assistant...",
  adjectives: [],
  knowledge: [],
  initialBuyAmount: 0.1,
  antiSniperMode: true,
};

export const useAgentWizardStore = create<AgentWizardState>((set) => ({
  data: INITIAL_DATA,
  currentStep: 0,
  totalSteps: 4, // Basic, Personality, Economics, Review
  
  setData: (update) =>
    set((state) => ({
      data: { ...state.data, ...update },
    })),
    
  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, state.totalSteps - 1),
    })),
    
  prevStep: () =>
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 0),
    })),
    
  setStep: (step) => set({ currentStep: step }),
  
  reset: () => set({ data: INITIAL_DATA, currentStep: 0 }),
}));
