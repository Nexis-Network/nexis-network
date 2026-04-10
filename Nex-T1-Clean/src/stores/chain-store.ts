import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChainStore {
  activeChainIds: number[];
  toggleChain: (chainId: number) => void;
  setActiveChains: (chainIds: number[]) => void;
  resetChains: () => void;
}

// Default active chains (Ethereum, Base, Arbitrum, etc.)
const DEFAULT_CHAINS = [
  1, // Ethereum
  8453, // Base
  42161, // Arbitrum
  // Add others as needed or based on user preference
];

export const useChainStore = create<ChainStore>()(
  persist(
    (set) => ({
      activeChainIds: DEFAULT_CHAINS,
      toggleChain: (chainId) =>
        set((state) => {
          const isActive = state.activeChainIds.includes(chainId);
          if (isActive) {
            return { activeChainIds: state.activeChainIds.filter((id) => id !== chainId) };
          } else {
            return { activeChainIds: [...state.activeChainIds, chainId] };
          }
        }),
      setActiveChains: (chainIds) => set({ activeChainIds: chainIds }),
      resetChains: () => set({ activeChainIds: DEFAULT_CHAINS }),
    }),
    {
      name: "nexis-active-chains",
    }
  )
);
