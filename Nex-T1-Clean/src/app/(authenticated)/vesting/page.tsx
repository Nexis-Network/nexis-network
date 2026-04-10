"use client";

import { ArrowUpRight, Copy, ArrowRightLeft, ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage, unwrapApiPayload } from "@/lib/api-platform";

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

// --- Types ---
type VestingScheduleItem = {
  id: string;
  amount: number;
  unlocked: boolean;
  unlockPercentage: number;
  timeRemaining: string; // "360 D 0 H 0 M"
};

type InvitationsResponse = {
  inviteUrl: string;
};

async function fetchInvitations(): Promise<InvitationsResponse> {
  const response = await fetch("/api/settings/invitations", {
    cache: "no-store",
    credentials: "include",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, "Failed to load invitations"));
  }
  const parsed = unwrapApiPayload<InvitationsResponse>(payload);
  if (!parsed) {
    throw new Error("Invalid invitations response");
  }
  return parsed;
}

// --- Mock Data ---
const VESTING_DATA: VestingScheduleItem[] = [
  { id: "001", amount: 166, unlocked: true, unlockPercentage: 100, timeRemaining: "" },
  { id: "002", amount: 166, unlocked: false, unlockPercentage: 10, timeRemaining: "360 D 0 H 0 M" },
  { id: "003", amount: 166, unlocked: false, unlockPercentage: 10, timeRemaining: "720 D 0 H 0 M" },
  { id: "004", amount: 166, unlocked: false, unlockPercentage: 10, timeRemaining: "900 D 0 H 0 M" },
  { id: "005", amount: 166, unlocked: false, unlockPercentage: 10, timeRemaining: "1080 D 0 H 0 M" },
  { id: "006", amount: 166, unlocked: false, unlockPercentage: 10, timeRemaining: "1260 D 0 H 0 M" },
];

const CHART_DATA = [
  { name: 'DEC 2024', value: 20000, active: true },
  { name: 'JUN 2025', value: 40000, active: false },
  { name: 'DEC 2026', value: 60000, active: false },
  { name: 'JUN 2026', value: 80000, active: false },
  { name: 'DEC 2026', value: 100000, active: false },
  { name: 'JUN 2027', value: 120000, active: false },
  { name: 'DEC 2027', value: 140000, active: false },
  { name: 'JUN 2028', value: 160000, active: false },
  { name: 'DEC 2028', value: 180000, active: false },
];

export default function VestingPage() {
  const [activeTab, setActiveTab] = useState<"coin_unlock" | "transactions">("coin_unlock");

  const { data: invitationData, isLoading: isInvitationLoading } = useQuery({
    queryKey: ["settings", "invitations"],
    queryFn: fetchInvitations,
    retry: false,
  });

  const referralLink = invitationData?.inviteUrl || "LOADING...";

  const handleCopyReferral = async () => {
    if (!invitationData?.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(invitationData.inviteUrl);
      toast.success("Referral link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="flex flex-col gap-8 font-sans">
      {/* Header Title */}
      <h1 className="text-4xl font-light tracking-tight text-foreground mb-2">Dashboard</h1>

      {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border border-border bg-card dark:bg-[#0f0f10] divide-y md:divide-y-0 md:divide-x divide-border rounded-md overflow-hidden">
        
        {/* OCEAN / NEXIS Card */}
        <div className="p-6 flex flex-col gap-4 relative group hover:bg-muted/30 transition-colors bg-card dark:bg-[#0f0f10]">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-light text-foreground tracking-wide">NZT</h3>
            <ArrowUpRight className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed uppercase tracking-wider font-medium">
            ENGAGE WITH NZT&apos;S INTELLIGENCE. NZT DELIVERS PRACTICAL TOOLS, INSIGHTS, AND PERSONALIZED INTERACTIONS.
          </p>
        </div>

        {/* OPERATOR Card */}
        <div className="p-6 flex flex-col gap-4 relative group hover:bg-muted/30 transition-colors bg-card dark:bg-[#0f0f10]">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-light text-foreground tracking-wide">OPERATOR</h3>
            <ArrowUpRight className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed uppercase tracking-wider font-medium">
            CONTRIBUTE TO THE NEXIS ECOSYSTEM THROUGH VARIOUS ROLES. EARN REWARDS FOR YOUR CONTRIBUTIONS.
          </p>
        </div>

        {/* OUTLOOK Card */}
        <div className="p-6 flex flex-col gap-4 relative group hover:bg-muted/30 transition-colors bg-card dark:bg-[#0f0f10]">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-light text-zinc-500 tracking-wide">OUTLOOK</h3>
            <span className="bg-zinc-900 text-[9px] text-zinc-500 px-1.5 py-0.5 rounded font-mono uppercase">Coming Soon</span>
          </div>
          <p className="text-[11px] text-zinc-600 leading-relaxed uppercase tracking-wider font-medium">
            EXPLORER AND ECOSYSTEM ANALYTICS WITH REAL-TIME INSIGHTS INTO EVERYTHING HAPPENING ACROSS THE NEXIS NETWORK.
          </p>
        </div>

        {/* OWN Card */}
        <div className="p-6 flex flex-col gap-4 relative group hover:bg-muted/30 transition-colors bg-card dark:bg-[#0f0f10]">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-light text-zinc-500 tracking-wide">OWN</h3>
            <span className="bg-zinc-900 text-[9px] text-zinc-500 px-1.5 py-0.5 rounded font-mono uppercase">Coming Soon</span>
          </div>
          <p className="text-[11px] text-zinc-600 leading-relaxed uppercase tracking-wider font-medium">
            OWN REAL-WORLD ASSETS. FRACTIONALIZED OWNERSHIP THROUGH NFTS.
          </p>
        </div>

      </div>

      {/* Invite Banner */}
      <div className="bg-card dark:bg-[#0f0f10] border border-border p-4 flex flex-col md:flex-row items-center justify-between gap-4 rounded-md">
        <p className="text-xs uppercase tracking-widest text-zinc-300 font-medium">
          INVITE NEW CITIZENS TO NEX-T1.AI - <span className="text-pink-500">EARN 10% OF ALL THEIR REWARDS</span>
        </p>
        <div className="flex items-center gap-2 bg-background border border-border px-3 py-1.5 rounded-sm">
          <span className="text-[10px] text-zinc-500 font-mono tracking-wide">
             {isInvitationLoading ? "LOADING..." : referralLink}
          </span>
          <Copy 
            onClick={handleCopyReferral}
            className="w-3 h-3 text-zinc-500 cursor-pointer hover:text-foreground transition-colors" 
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-8">
        
        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-transparent">
          <button 
            onClick={() => setActiveTab("coin_unlock")}
            className={cn(
              "text-[10px] uppercase tracking-widest px-3 py-1 font-medium transition-colors border border-dashed rounded-md",
              activeTab === "coin_unlock" 
                ? "bg-white text-black border-white" 
                : "text-zinc-500 border-transparent hover:text-foreground"
            )}
          >
            COIN UNLOCK
          </button>
          <button 
            onClick={() => setActiveTab("transactions")}
            className={cn(
              "text-[10px] uppercase tracking-widest px-3 py-1 font-medium transition-colors border border-dashed rounded-md",
              activeTab === "transactions" 
                ? "bg-white text-black border-white" 
                : "text-zinc-500 border-transparent hover:text-foreground"
            )}
          >
            TRANSACTIONS
          </button>
        </div>

        {/* Balance Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
          
          <div className="flex flex-col sm:flex-row items-start gap-8 sm:gap-12">
            {/* Available Balance */}
            <div className="space-y-2">
              <h4 className="text-[10px] uppercase tracking-widest text-zinc-500">AVAILABLE BALANCE</h4>
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-zinc-900" />
                 </div>
                 <span className="text-5xl font-light tracking-tight text-foreground">0</span>
              </div>
              <p className="text-xs text-zinc-600 font-mono pl-10">$0.00 (USD)</p>
            </div>

            {/* Unclaimed Balance */}
             <div className="space-y-2">
              <div className="flex items-center gap-4">
                <h4 className="text-[10px] uppercase tracking-widest text-zinc-500">UNCLAIMED BALANCE</h4>
                <button className="text-[9px] bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 px-2 py-0.5 uppercase tracking-wide transition-colors rounded-md">
                  CLAIM ALL
                </button>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center bg-white">
                    <div className="w-full h-full rounded-full bg-white animate-pulse" /> 
                    {/* Placeholder for token icon style */}
                 </div>
                 <span className="text-5xl font-light tracking-tight text-foreground">166</span>
              </div>
              <p className="text-xs text-zinc-600 font-mono pl-10">$1.70 (USD)</p>
            </div>
          </div>

          {/* Wallet Actions */}
          <div className="flex flex-col gap-4 items-start lg:items-end w-full">
            <div className="flex items-center gap-2">
               <span className="text-[9px] uppercase tracking-widest text-zinc-600">WALLET ADDRESS</span>
               <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-zinc-400">0XF15C93562BC3944A68E938EF75D2A3360D98CA57</span>
                  <Copy className="w-3 h-3 text-zinc-600 cursor-pointer hover:text-foreground" />
               </div>
            </div>
            
            <div className="grid grid-cols-3 gap-1 w-full max-w-lg mt-2">
               <Button variant="outline" className="rounded-md border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground uppercase text-[10px] tracking-widest h-12 flex items-center gap-2">
                 SWAP <ArrowRightLeft className="w-3 h-3 rotate-90" />
               </Button>
               <Button variant="outline" className="rounded-md border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground uppercase text-[10px] tracking-widest h-12 flex items-center gap-2">
                 RECEIVE <ArrowDown className="w-3 h-3" />
               </Button>
               <Button variant="outline" className="rounded-md border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground uppercase text-[10px] tracking-widest h-12 flex items-center gap-2">
                 SEND <ArrowUp className="w-3 h-3" />
               </Button>
            </div>
          </div>
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-border">
          
          {/* Left Column: Unlock Table */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-light text-foreground">Upcoming NZT Unlocks</h3>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">TOTAL VESTING: <span className="text-foreground">1,000</span></p>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <span className="bg-white text-black text-[9px] font-bold px-1.5 py-0.5 uppercase rounded-sm">ALL</span>
              <span className="text-zinc-600 text-[9px] uppercase tracking-widest">[ Nex 001 ]</span>
            </div>

            <div className="w-full overflow-x-auto">
              {/* Custom Table Header */}
              <div className="min-w-[500px] grid grid-cols-12 gap-4 pb-2 border-b border-border text-[9px] uppercase tracking-widest text-zinc-500 font-medium">
                <div className="col-span-1">ID</div>
                <div className="col-span-4">COINS UNLOCKED</div>
                <div className="col-span-7">UNLOCK %</div>
              </div>
              
              <div className="flex flex-col gap-1 mt-2 min-w-[500px]">
                {VESTING_DATA.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 py-3 items-center hover:bg-muted/30 transition-colors border-b border-border/50 text-xs group">
                    <div className="col-span-1 text-zinc-500 font-mono">{item.id}</div>
                    <div className="col-span-4 text-foreground flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full border border-zinc-600" />
                       <span className="font-mono">{item.amount}</span>
                    </div>
                    <div className="col-span-7 flex items-center gap-4">
                       {/* Progress Bar */}
                       <div className="flex-1 h-1.5 bg-zinc-800 relative w-full max-w-[120px]">
                          <div 
                            className={cn("h-full absolute left-0 top-0", item.unlocked ? "bg-[#A3E635]" : "bg-white")} 
                            style={{ width: `${item.unlockPercentage}%` }} 
                          />
                       </div>
                       <span className="text-zinc-500 w-8 text-right font-mono">{item.unlockPercentage}%</span>
                       
                       {/* Action / Countdown */}
                       <div className="flex-1 flex justify-end">
                         {item.unlocked ? (
                           <div className="flex items-center gap-2">
                             <span className="text-[9px] uppercase tracking-widest text-foreground border-b border-foreground/20 pb-0.5 cursor-pointer hover:text-muted-foreground whitespace-nowrap">VIEW IN EXPLORER ↗</span>
                             <button className="text-[9px] bg-muted border border-border text-foreground px-2 py-0.5 uppercase tracking-wide hover:bg-muted/80 rounded-md">CLAIM</button>
                           </div>
                         ) : (
                           <div className="flex items-center gap-2 bg-zinc-900/50 px-2 py-1 rounded-md">
                              <span className="text-[10px] font-mono text-zinc-400 tracking-wide">{item.timeRemaining}</span>
                           </div>
                         )}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Chart */}
          <div className="space-y-6">
             <h3 className="text-xl font-light text-foreground">Coin Unlock Schedule</h3>
             <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-[#A3E635]" />
                <span className="text-[10px] uppercase tracking-widest text-zinc-400">Nex 001</span>
             </div>

             <div className="h-[300px] w-full mt-8">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={CHART_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#A3E635" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#A3E635" stopOpacity={0.1}/>
                      </linearGradient>
                       <linearGradient id="colorInactive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.4} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#666', fontSize: 9 }} 
                      dy={10}
                      interval={0}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#666', fontSize: 10 }}
                      tickFormatter={(value) => `${value / 1000}K`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                      itemStyle={{ color: 'var(--foreground)', fontSize: '12px' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="value" barSize={40} radius={[6, 6, 0, 0]}>
                      {CHART_DATA.map((entry, index) => (
                        <Cell 
                           key={`cell-${index}`} 
                           fill={entry.active ? 'url(#colorActive)' : 'url(#colorInactive)'}
                           stroke={entry.active ? '#A3E635' : '#0ea5e9'}
                           strokeWidth={1}
                           className="drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]"
                        />
                      ))}
                    </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>

        </div>

      </div>
    </div>
  );
}
