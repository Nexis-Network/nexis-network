import { create } from "zustand";
import type { TokenAssetInfo } from "@/modules/tokens/types";

export type TokenInfo = TokenAssetInfo;

export type SwapQuote = {
  amountOut: number;
  aggregator?: {
    quote?: {
      fromAmountUSD?: string;
      toAmountUSD?: string;
    };
  };
};

export interface SwapState {
  sellToken: TokenInfo | null;
  buyToken: TokenInfo | null;
  sellAmount: string;
  buyAmount: string;
  slippage: number; // Percentage, e.g., 0.5
  deadline: number; // Minutes, e.g., 30
  quote: SwapQuote | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSellToken: (token: TokenInfo | null) => void;
  setBuyToken: (token: TokenInfo | null) => void;
  setSellAmount: (amount: string) => void;
  setBuyAmount: (amount: string) => void;
  setSlippage: (slippage: number) => void;
  setDeadline: (deadline: number) => void;
  setQuote: (quote: SwapQuote | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  resetQuoteState: () => void;
  switchTokens: () => void;
}

export const useSwapStore = create<SwapState>((set) => ({
  sellToken: null,
  buyToken: null,
  sellAmount: "",
  buyAmount: "",
  slippage: 0.5,
  deadline: 30, // Default 30 minutes
  quote: null,
  isLoading: false,
  error: null,

  setSellToken: (token) =>
    set({
      sellToken: token,
      buyAmount: "",
      quote: null,
      isLoading: false,
      error: null,
    }),
  setBuyToken: (token) =>
    set({
      buyToken: token,
      buyAmount: "",
      quote: null,
      isLoading: false,
      error: null,
    }),
  setSellAmount: (amount) =>
    set({
      sellAmount: amount,
      buyAmount: "",
      quote: null,
      isLoading: false,
      error: null,
    }),
  setBuyAmount: (amount) => set({ buyAmount: amount }),
  setSlippage: (slippage) =>
    set({
      slippage,
      quote: null,
      isLoading: false,
      error: null,
    }),
  setDeadline: (deadline) => set({ deadline }),
  setQuote: (quote) => set({ quote }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  resetQuoteState: () =>
    set({
      quote: null,
      isLoading: false,
      error: null,
    }),
  
  switchTokens: () =>
    set((state) => ({
      sellToken: state.buyToken,
      buyToken: state.sellToken,
      sellAmount: state.buyAmount,
      buyAmount: "",
      quote: null,
      isLoading: false,
      error: null,
    })),
}));
