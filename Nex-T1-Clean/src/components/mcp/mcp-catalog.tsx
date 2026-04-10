"use client";

import * as React from "react";
import { AnimatePresence } from "framer-motion";
import { Search, Box, Database, Command, Lock, Sparkles, Wallet, Terminal, Globe } from "lucide-react";
import { McpServerCard } from "@/components/mcp/mcp-server-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { MCPRegistry } from "@/lib/mcp/registry";
import { cn } from "@/lib/utils";


import { logger } from '@/lib/logger';
interface McpCatalogProps {
  registry: MCPRegistry | null;
}

// Optimized Category Definitions
const CATEGORIES = [
  { 
    id: "all", 
    name: "All Servers", 
    icon: Box,
    keywords: [] 
  },
  { 
    id: "web3", 
    name: "Web3 & DeFi", 
    icon: Wallet, 
    keywords: ["web3", "defi", "crypto", "blockchain", "solana", "ethereum", "evm", "bitcoin", "wallet", "trading", "dex", "analyze", "memecoins", "pumpfun"] 
  },
  { 
    id: "ai", 
    name: "AI & Models", 
    icon: Sparkles, 
    keywords: ["ai", "llm", "model", "memory", "rag", "agents", "openai", "anthropic", "gemini", "machine learning", "wrapper"] 
  },
  { 
    id: "devtools", 
    name: "DevTools", 
    icon: Terminal, 
    keywords: ["devtools", "devops", "infrastructure", "kubernetes", "docker", "git", "github", "testing", "monitoring", "observability", "deployment", "framework", "sdk", "adapter", "python", "javascript", "typescript", "code"] 
  },
  { 
    id: "data", 
    name: "Data & Search", 
    icon: Database, 
    keywords: ["data", "database", "sql", "postgres", "sqlite", "analytics", "search", "scraping", "research", "fetching", "analysis"] 
  },
  { 
    id: "productivity", 
    name: "Productivity", 
    icon: Command, 
    keywords: ["productivity", "calendar", "mail", "communication", "messaging", "social", "crm", "office", "microsoft", "slack", "discord", "linear", "notion"] 
  },
  { 
    id: "security", 
    name: "Security", 
    icon: Lock, 
    keywords: ["security", "auth", "identity", "audit", "verification", "ghidra", "reverse engineering"] 
  },
   {
    id: "integrations",
    name: "Integrations",
    icon: Globe,
    keywords: ["integration", "api", "wrapper", "service", "cloud", "mapbox", "google", "slack", "github", "discord", "airbnb"]
   }
];

export function McpCatalog({ registry }: McpCatalogProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [userConfigs, setUserConfigs] = React.useState<Record<string, boolean>>({});
  const [_loadingConfigs, setLoadingConfigs] = React.useState(true);
  const hasValidRegistry = registry !== null && Array.isArray(registry.servers);

  const registryServers = React.useMemo(
    () => (Array.isArray(registry?.servers) ? registry.servers : []),
    [registry]
  );
  
  // Fetch user configs on mount
  React.useEffect(() => {
      async function fetchConfigs() {
          try {
            // dynamic import to avoid server-side issues if any
            const { createClient } = await import("@/lib/supabase/client");
            const { McpService } = await import("@/lib/mcp/mcp-service");
            const supabase = createClient();
            
            // Check auth first? Service handles it but explicit check is good.
            // Just let service fail gracefully if no user.
            const configs = await McpService.getUserConfigs(supabase);
            
            // Map mcp_id or name? 
            // The Service returns joined data: mcp_registry { name }.
            // We want to map by 'name' to match 'registry.json' (server.name).
            const configMap: Record<string, boolean> = {};
            configs.forEach(c => {
                if (c.mcp_registry?.name) {
                    configMap[c.mcp_registry.name] = c.enabled;
                }
            });
            setUserConfigs(configMap);
          } catch (e) {
              logger.error("Failed to load user configs", e);
          } finally {
              setLoadingConfigs(false);
          }
      }
      fetchConfigs();
  }, []);

  const handleConfigChange = (serverName: string, enabled: boolean) => {
      setUserConfigs(prev => ({ ...prev, [serverName]: enabled }));
  };


  const filteredServers = React.useMemo(() => {
    if (registryServers.length === 0) return [];
    
    // Get the current category object
    const currentCategoryInfo = CATEGORIES.find(c => c.id === selectedCategory);
    const categoryKeywords = currentCategoryInfo?.keywords || [];

    return registryServers.filter((server) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        server.name.toLowerCase().includes(searchLower) ||
        server.description.toLowerCase().includes(searchLower) ||
        server.vendor.toLowerCase().includes(searchLower);

      let matchesCategory = true;
      if (selectedCategory !== "all") {
        if (!server.tags) {
            matchesCategory = false;
        } else {
             // Check if ANY of the server tags match ANY of the category keywords (partial match allowed)
            const serverTags = server.tags.map(t => t.toLowerCase());
            matchesCategory = serverTags.some(tag => 
                categoryKeywords.some(keyword => tag.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(tag))
            );
        }
      }

      return matchesSearch && matchesCategory;
    });
  }, [registryServers, searchQuery, selectedCategory]);

  const ITEMS_PER_PAGE = 72;
  const [currentPage, setCurrentPage] = React.useState(1);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const totalPages = Math.ceil(filteredServers.length / ITEMS_PER_PAGE);
  const paginatedServers = filteredServers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!hasValidRegistry) {
     return (
        <div className="w-full h-96 flex items-center justify-center text-[#C4C4C4]/60 text-sm">
            Registry unavailable
        </div>
     );
  }

  return (

    <div className="flex flex-col md:flex-row w-full min-h-[500px] gap-6 p-4 md:p-6 lg:p-8 font-sans">
      {/* Left Sidebar - Categories */}
      <div className="w-full md:w-[180px] flex-shrink-0 flex flex-col gap-4 md:gap-6">
        <div className="space-y-1">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-[#C4C4C4]/60 px-2 mb-2 hidden md:block">
            Categories
          </h3>
          {/* Mobile: Horizontal scroll, Desktop: Vertical list */}
          <div className="flex flex-row md:flex-col gap-2 md:gap-0.5 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 md:px-2 md:py-1.5 rounded-full md:rounded-[2px] text-[11px] font-medium transition-colors text-left flex-shrink-0 md:w-full border md:border-transparent",
                    isSelected
                      ? "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-500 border-sky-100 dark:border-transparent md:rounded-md"
                      : "bg-white dark:bg-transparent border-gray-200 dark:border-transparent text-gray-500 dark:text-[#C4C4C4] hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white md:hover:rounded-md"
                  )}
                >
                  <Icon className="w-3.5 h-3.5 md:w-3 md:h-3 opacity-70" />
                  <span className="whitespace-nowrap md:truncate">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters / Tags Placeholder - Hide on mobile for now to save space, or stack */}
        <div className="hidden md:block space-y-1 pt-4 border-t border-[#C4C4C4]/10">
           <h3 className="text-[10px] font-medium uppercase tracking-wider text-[#C4C4C4]/60 px-2 mb-2">
            Filters
          </h3>
          <div className="flex flex-wrap gap-1.5 px-2">
            {["Official", "Verified"].map((tag) => (
                <span key={tag} className="text-[10px] text-[#C4C4C4] px-1.5 py-0.5 rounded-sm bg-[#0F0F0F] border border-[#C4C4C4]/10 cursor-default opacity-50">
                    {tag}
                </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Top Bar: Search & Breadcrumbs */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col gap-1">
                 <div className="flex items-center gap-2 text-[10px] text-[#C4C4C4]/60">
                    <span>Home</span>
                    <span>/</span>
                    <span className="text-[#C4C4C4]">Explore MCP servers</span>
                 </div>
            </div>

          <div className="relative w-full md:w-[320px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#C4C4C4]/50" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by MCP name or use case"
              className="pl-8 h-8 text-[11px] bg-white dark:bg-[#0F0F0F] border-gray-200 dark:border-[#C4C4C4]/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#C4C4C4]/40 rounded-[2.3px] focus-visible:ring-1 focus-visible:ring-gray-300 dark:focus-visible:ring-white/20"
            />
          </div>
        </div>

        {/* Grid of Cards - 1 col mobile, 2 col sm, 3 col md, 4 col xl */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <AnimatePresence mode="popLayout">
            {paginatedServers.map((server, idx) => (
              <McpServerCard 
                key={`${server.vendor}-${server.name}-${idx}`} 
                server={server} 
                index={idx} 
                isEnabled={!!userConfigs[server.name]}
                onToggle={(newVal) => handleConfigChange(server.name, newVal)}
              />
            ))}
          </AnimatePresence>
          
          {filteredServers.length === 0 && (
            <div className="col-span-full py-12 text-center text-[#C4C4C4]/50 text-xs">
              No servers found matching your query.
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#C4C4C4]/10 pt-4 mt-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 text-xs text-[#C4C4C4] hover:text-white"
                >
                    Previous
                </Button>
                <span className="text-[10px] text-[#C4C4C4]">
                    Page {currentPage} of {totalPages}
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 text-xs text-[#C4C4C4] hover:text-white"
                >
                    Next
                </Button>
            </div>
        )}
      </div>
    </div>
  );
}
