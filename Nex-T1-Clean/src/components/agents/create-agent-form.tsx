"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Settings2 } from "lucide-react";
import { motion } from "framer-motion";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";

import { AgentQualityGauge } from "@/components/agents/create/agent-quality-gauge";
import { 
    Wallet, 
    Database, 
    Search, 
    BarChart3, 
    Coins, 
    Globe, 
    Activity, 
} from "lucide-react";

import Image from "next/image";
import { DEFAULT_AGENT_MODEL } from "@/lib/constants/models";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";


import { logger } from '@/lib/logger';
// --- Tool Catalog based on MCP_CONFIGS in functions.ts ---
type CatalogTool = {
  id: string;
  name: string;
  description: string;
  type: string;
  icon: typeof Wallet;
  customIcon?: ReactNode;
  defaultConfig?: Record<string, UntypedJson>;
};

const TOOL_CATALOG: CatalogTool[] = [
  {
    id: "moralis",
    name: "Moralis",
    description: "On-chain data (EVM + Solana) via Moralis MCP",
    type: "MCP",
    icon: Globe,
    defaultConfig: { url: "https://moralis.nex-t1.ai/mcp" },
  },
  {
    id: "uniswap",
    name: "Uniswap",
    description: "Uniswap swaps, quotes, and positions via MCP (prepare → execute required)",
    type: "MCP",
    icon: Activity,
    customIcon: (
      <Image
        src="/icons/web3-icons/uniswap.svg"
        alt="Uniswap"
        width={18}
        height={18}
        className="transition-all"
      />
    ),
  },
  {
    id: "evmWallet", 
    name: "EVM Wallet", 
    description: "Create wallets, send TXs, check balances (Ethereum/Polygon/Base)", 
    type: "Wallet", 
    icon: Wallet,
    customIcon: (
      <div className="flex items-center -space-x-1.5 transition-all">
        <Image src={LIQUID_GLASS_LOGOS.ethereum} alt="ETH" width={18} height={18} className="rounded-full ring-2 ring-background z-30" />
        <Image src="/icons/chain-icons/arbitrum.svg" alt="ARB" width={18} height={18} className="rounded-full ring-2 ring-background z-20" />
        <Image src={LIQUID_GLASS_LOGOS.bnb} alt="BNB" width={18} height={18} className="rounded-full ring-2 ring-background z-10" />
        <Image src="/icons/chain-icons/optimism.svg" alt="OP" width={18} height={18} className="rounded-full ring-2 ring-background z-0" />
      </div>
    )
  },
  { 
    id: "tokenMinter", 
    name: "Token Minter", 
    description: "Deploy ERC20 tokens and manage supplies", 
    type: "Web3", 
    icon: Coins,
    customIcon: (
      <div className="flex items-center -space-x-1.5 transition-all">
        <Image src="/icons/chain-icons/shibainu.svg" alt="SHIB" width={18} height={18} className="rounded-full ring-2 ring-background z-20" />
        <Image src={LIQUID_GLASS_LOGOS.usdc} alt="USDC" width={18} height={18} className="rounded-full ring-2 ring-background z-10" />
        <Image src="/icons/web3-icons/1inch.svg" alt="1inch" width={18} height={18} className="rounded-full ring-2 ring-background z-0" />
      </div>
    )
  },
  { 
    id: "etherscan", 
    name: "Etherscan", 
    description: "Blockchain exploration, ABIs, gas prices", 
    type: "Web3", 
    icon: Search,
    customIcon: <Image src="/icons/web3-icons/etherscan.svg" alt="Etherscan" width={18} height={18} className="transition-all" />
  },
  { id: "binance", name: "Binance", description: "Market data & spot trading", type: "Exchange", icon: BarChart3 },
  { id: "sentiment", name: "Santiment", description: "Social volume & sentiment analysis", type: "Analytics", icon: Activity },
  { id: "uniswapSpy", name: "Uniswap Spy", description: "Monitor new pools and liquidity events", type: "DeFi", icon: Activity },
  { id: "defillama", name: "DeFi Llama", description: "TVL, protocols, and yields data", type: "Analytics", icon: BarChart3 },
  { id: "helius", name: "Helius", description: "Solana RPC & enhanced APIs", type: "Solana", icon: Globe, customIcon: <Image src={LIQUID_GLASS_LOGOS.solana} alt="Solana" width={18} height={18} className="transition-all" /> },
  { id: "bitcoin", name: "Bitcoin", description: "Key gen, address validation, LN invoices", type: "Crypto", icon: Coins, customIcon: <Image src={LIQUID_GLASS_LOGOS.bitcoin} alt="Bitcoin" width={18} height={18} className="transition-all" /> },
  { id: "blocknative", name: "Blocknative", description: "Real-time mempool data", type: "Web3", icon: Activity },
  { id: "chainlink", name: "Chainlink", description: "Price feeds & CCIP", type: "Oracle", icon: Activity, customIcon: <Image src={LIQUID_GLASS_LOGOS.chainlink} alt="Chainlink" width={18} height={18} className="transition-all" /> },
  { id: "dexscreener", name: "DexScreener", description: "DEX charts and token profiles", type: "DeFi", icon: BarChart3 },
];

const formSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    handle: z
      .string()
      .min(3, { message: "Handle must be at least 3 characters." })
      .regex(/^[a-z0-9_]+$/, "Handle must be lowercase alphanumeric with underscores."),
    description: z.string().optional(),
    instructions: z.string().optional(),
    avatarUrl: z.string().optional(),
    tools: z.array(z.object({
        id: z.string(),
        enabled: z.boolean(),
        config: z.any().optional()
    }))
});

export function CreateAgentForm() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            handle: "",
            description: "",
            instructions: "",
            avatarUrl: "",
            tools: TOOL_CATALOG.map((tool) => ({
              id: tool.id,
              enabled: false,
              config: tool.defaultConfig ?? {},
            })),
        }
    });

    const { isValid } = form.formState;
    const watchedTools = form.watch("tools");
    const enabledToolsCount = watchedTools.filter(t => t.enabled).length;
    const { setValue } = form;

    // Watch individual fields for score calculation
    const name = form.watch("name");
    const handle = form.watch("handle");
    const description = form.watch("description");
    const instructions = form.watch("instructions");
    const avatarUrl = form.watch("avatarUrl");

    const qualityScore = useMemo(() => {
        let score = 10; 
        if (name && name.length > 2) score += 15;
        if (handle && handle.length > 2) score += 15;
        if (description && description.length > 10) score += 10;
        if (instructions && instructions.length > 20) score += 10;
        if (avatarUrl) score += 10;
        
        // Tool impact (max 40)
        score += Math.min(enabledToolsCount * 5, 40);
        
        return Math.min(score, 100);
    }, [enabledToolsCount, name, handle, description, instructions, avatarUrl]);

    async function onSubmit(data: z.infer<typeof formSchema>) {
      try {
        setSubmitting(true);

        const enabledTools = data.tools
          .filter((tool) => tool.enabled)
          .map((tool) => ({ id: tool.id, config: tool.config ?? {} }));

        const payload = {
          slug: data.handle,
          name: data.name,
          description: data.description?.trim() ? data.description.trim() : undefined,
          visibility: "private",
          systemPrompt: data.instructions?.trim() ? data.instructions.trim() : undefined,
          avatarUrl: data.avatarUrl?.trim() ? data.avatarUrl.trim() : undefined,
          versionConfig: {
            model: {
              id: DEFAULT_AGENT_MODEL,
              temperature: 0.7,
              maxTokens: 4096,
            },
            tools: enabledTools,
            assets: {
              avatarPath: null,
              bannerPath: null,
            },
          },
        };

        const response = await fetch("/api/agents/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to create agent");
        }

        const json = (await response.json().catch(() => null)) as UntypedJson;
        const agentId =
          json && typeof json === "object" && "agent" in json && typeof (json as { agent?: { id?: unknown } }).agent?.id === "string"
            ? (json as { agent: { id: string } }).agent.id
            : null;
        if (!agentId) {
          throw new Error("Create agent response is malformed");
        }
        toast.success("Agent created! Wallets are being provisioned...");
        router.push(`/agents/${agentId}`);
      } catch (error) {
        logger.error(error);
        toast.error("Failed to create agent");
      } finally {
        setSubmitting(false);
      }
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <Form {...form}>
                <div className="flex flex-col md:flex-row h-full flex-1 overflow-hidden"> 
                    
                    {/* LEFT COLUMN - Agent Details */}
                    {/* Fixed width 360px, Scrollable independently */}
                    <div className="w-full md:w-[360px] md:shrink-0 flex flex-col gap-6 p-6 border-r border-[#F1F1FF]/5 md:overflow-y-auto no-scrollbar">
                        <div className="space-y-4">
                            <h2 className="text-2xl font-semibold tracking-tight">Agent Profile</h2>
                            <p className="text-sm text-muted-foreground">Define your agent&apos;s identity and core instructions.</p>
                        </div>

                        <div className="space-y-6 pb-8">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input className="h-10 text-base bg-secondary/20 border-secondary/40 focus:border-sky-500/50 transition-all placeholder:text-muted-foreground/50" placeholder="e.g. Market Analyst" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="handle"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Handle</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                                                    <Input className="h-10 text-base pl-7 bg-secondary/20 border-secondary/40 focus:border-sky-500/50 transition-all placeholder:text-muted-foreground/50" placeholder="market_analyst" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="space-y-2">
                                     <FormLabel>Knowledge Base</FormLabel>
                                     <Button variant="outline" className="w-full justify-start text-muted-foreground font-normal h-10 bg-secondary/20 border-secondary/40 hover:bg-secondary/30 transition-all" disabled type="button">
                                         <Database className="w-4 h-4 mr-2" />
                                         Select Data Source
                                     </Button>
                                </div>
                            </div>

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea className="resize-none min-h-[80px] text-base bg-secondary/20 border-secondary/40 focus:border-sky-500/50 transition-all placeholder:text-muted-foreground/50" placeholder="Briefly describe what this agent does..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="instructions"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>System Instructions</FormLabel>
                                        <FormControl>
                                            <Textarea className="resize-none min-h-[150px] text-base bg-secondary/20 border-secondary/40 focus:border-sky-500/50 transition-all placeholder:text-muted-foreground/50" placeholder="You are a helpful assistant..." {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Detailed prompt defining behavior and constraints.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    {/* RIGHT COLUMN: QUALITY METER & INTEGRATIONS */}
                    {/* Split into fixed top and scrollable list */}
                    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                        
                        {/* Static Header & Quality Gauge */}
                        <div className="shrink-0 p-8 pb-0">
                             <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Quality Score</h3>
                                <Badge variant="secondary" className="bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border-sky-500/20">
                                    Live Preview
                                </Badge>
                             </div>

                            <div className="flex flex-col items-center justify-center py-4 min-h-[300px]">
                                 <AgentQualityGauge 
                                    score={qualityScore} 
                                    value={avatarUrl}
                                    onChange={(val) => setValue("avatarUrl", val, { shouldDirty: true, shouldValidate: true })}
                                 />
                            </div>
                            
                            <div className="flex items-center justify-between mt-8 mb-4">
                                <h3 className="text-sm font-normal uppercase tracking-widest text-muted-foreground">
                                   Integrations {enabledToolsCount > 0 && `(${enabledToolsCount})`}
                                </h3>
                                 <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" type="button">
                                    <Settings2 className="w-3 h-3" /> Manage
                                 </Button>
                           </div>
                        </div>

                        {/* Scrollable Integrations List */}
                        <div className="flex-1 overflow-y-auto no-scrollbar p-8 pt-0 pb-32">
                            <div className="flex flex-col gap-2"> 
                                {/* Decreased spacing for tighter list */}
                                {TOOL_CATALOG.map((tool) => {
                                     const isEnabled = watchedTools.find(t => t.id === tool.id)?.enabled || false;
                                     const toolIndex = watchedTools.findIndex(t => t.id === tool.id);
                                     
                                     return (
                                        <motion.div 
                                            key={tool.id}
                                            layout
                                            initial={false}
                                            className={cn(
                                                "group flex items-center justify-between py-2 px-1 border-b transition-all duration-200", 
                                                /* Changed to border-b, removed rounded-xl/border wrapper styles for cleaner look */
                                                isEnabled 
                                                    ? "border-sky-500/30 bg-sky-500/5" 
                                                    : "border-border/40 hover:border-border/80"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "h-8 w-14 flex items-center justify-center shrink-0 transition-all duration-200", 
                                                    /* Increased width for multi-icons, removed background/rounded */
                                                    isEnabled ? "text-sky-400" : "text-muted-foreground",
                                                    /* Apply grayscale when not enabled (for both Lucide and Custom Icons) */
                                                    !isEnabled && "grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100"
                                                )}>
                                                    {/* Render Custom Icon if available, else default Lucide icon */}
                                                    {tool.customIcon ? (
                                                        <div className="flex items-center justify-center w-full">
                                                            {tool.customIcon}
                                                        </div>
                                                    ) : (
                                                        <tool.icon className="w-5 h-5" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={cn("text-sm font-medium", isEnabled ? "text-foreground" : "text-muted-foreground")}>
                                                        {tool.name}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground/70 uppercase">{tool.type}</span>
                                                </div>
                                            </div>
                                            
                                            <Switch 
                                                checked={isEnabled}
                                                onCheckedChange={(checked) => {
                                                    const currentTools = form.getValues("tools");
                                                    if (toolIndex >= 0) {
                                                        currentTools[toolIndex].enabled = checked;
                                                        setValue("tools", currentTools, { shouldDirty: true, shouldValidate: true });
                                                    }
                                                }}
                                                size="xs"
                                            />
                                        </motion.div>
                                     );
                                })}
                            </div>
                        </div>

                        {/* FOOTER ACTIONS */}
                        <div 
                            className="absolute bottom-0 left-0 w-full z-50 flex justify-center pointer-events-none"
                            style={{ height: '81px' }} 
                        >
                            <div className="w-full h-full bg-background/80 backdrop-blur-md border-t flex items-center justify-between px-8 pointer-events-auto">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="w-2 h-2 rounded-full bg-[#8eb94f]/50" />
                                    Draft
                                    <span className="w-px h-3 bg-border mx-1" />
                                    <span className="opacity-70">Auto-saved</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button variant="ghost" size="sm" className="h-9 text-muted-foreground hover:text-foreground">
                                        Esc
                                    </Button>
                                    <Button 
                                        type="submit" 
                                        onClick={form.handleSubmit(onSubmit)}
                                        disabled={submitting || !isValid} 
                                        className="h-9 px-6 bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/20"
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        Create Agent
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Form>
        </div>
    );
}
