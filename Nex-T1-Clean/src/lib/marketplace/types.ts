export type AgentVisibility = 'public' | 'private';
export type AgentLicense = 'open_source' | 'proprietary';

export interface AgentMarketplaceItem {
  id: string;
  name: string;
  tagline: string;
  description: string;
  imageUrl?: string; // For the avatar used in list items
  coverImageGradient?: string; // For the "New Listings" card background if applicable or subtle tint
  
  category: string; // e.g., "Conversational", "Arbitrage", "High-frequency"
  tags: string[];   // Extra tags like "Conversational", "NFT flipper"
  
  languages: string[]; // e.g. ["English", "American"]
  chains?: string[];   // e.g. ["solana", "ethereum"]
  
  stats: {
    users?: string;      // e.g. "18.5K", "5.3K"
    age?: string;        // e.g. "2y", "0d"
    uptime?: number;     // percentage maybe?
    rating?: number;
  };
  
  status: 'active' | 'inactive';
  
  pricing?: {
    model: 'free' | 'subscription' | 'one_time';
    amount?: number;
    currency?: string;
  };

  visibility: AgentVisibility;
  license: AgentLicense;
  
  // Specific for the "Featured" large cards logic?
  featured?: boolean; 
}

export type MarketplaceSection = {
  title: string;
  type: 'grid' | 'list' | 'carousel'; // grid for "New listings", list for "On-chain trading agents"
  items: AgentMarketplaceItem[];
  actionLink?: {
    label: string;
    href: string;
  };
};
