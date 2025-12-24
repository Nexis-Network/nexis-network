import { ArrowRight, Download, Filter, Search } from "lucide-react";
import Image from "next/image";

import { DashboardHeader } from "@/components/dashboard/header-dash";
import { FixedFooter } from "@/components/layout/fixed-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
  return (
    <div className="min-h-screen bg-background-page pb-12">
      <DashboardHeader />
      <main className="h-full pt-[6.5rem] pb-8">
        <div className="container max-w-7xl mx-auto p-6 md:p-8 space-y-8">
          {/* Header Section */}
          <div className="space-y-2">
            <h1 className="text-[32px] font-medium text-text-primary leading-[45px]">Manage Funds</h1>
            <p className="text-sm text-text-secondary leading-5">
              Manage your funds and see full account transactions
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20 border-b border-border-default/50">
            {/* Cloud $IO Balance Card */}
            <div className="relative h-[224px] bg-[#0F0F10] border border-border-default rounded-[10px] p-6 flex flex-col justify-between overflow-hidden hover:border-border-highlight transition-colors">
              <div className="flex justify-between items-start z-10">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <span className="w-3 h-3 relative">
                         <Image src="/logo.svg" alt="Nexis" fill className="object-cover" />
                    </span>
                    Cloud $IO balance
                  </span>
                  <div className="text-[32px] font-medium text-accent-cyan leading-none mt-2">
                    -
                  </div>
                </div>
                {/* Graph Sparkline Placeholder (Visual only) */}
                <div className="w-[120px] h-8 relative opacity-50">
                    <svg viewBox="0 0 100 30" className="w-full h-full stroke-text-placeholder fill-none" preserveAspectRatio="none">
                         <path d="M0,30 Q20,10 40,20 T100,0" strokeWidth="2" />
                    </svg>
                </div>
              </div>

               {/* Button Group */}
               <div className="flex items-center gap-4 z-10 mt-auto">
                   <Button variant="secondary" className="bg-text-primary text-background-page hover:bg-text-secondary hover:text-background-page border-transparent font-medium h-10 px-4">
                       Claim Earnings
                   </Button>
                   <Button variant="secondary" className="bg-background-card text-text-primary border-border-default hover:bg-background-surface h-10 px-4 flex items-center gap-2">
                       Deploy Worker To Start Earning
                       <ArrowRight className="w-3.5 h-3.5" />
                   </Button>
               </div>

              {/* Background Vectors/Gradients */}
              <div className="absolute inset-0 z-0 pointer-events-none">
                 <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-bl from-accent-cyan/10 to-transparent opacity-20" />
              </div>
            </div>

            {/* Cloud USDC Balance Card */}
            <div className="relative h-[224px] bg-[#0F0F10] border border-border-default rounded-[10px] p-6 flex flex-col justify-between overflow-hidden hover:border-border-highlight transition-colors">
               <div className="flex justify-between items-start z-10">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-2">
                     <span className="w-3 h-3 relative">
                         <Image src="/logo.svg" alt="Nexis" fill className="object-cover" />
                    </span>
                    Cloud USDC balance
                  </span>
                   <div className="text-[32px] font-medium text-accent-green leading-none mt-2">
                    0.00
                  </div>
                </div>
                 {/* Graph Sparkline Placeholder */}
                <div className="w-[120px] h-8 relative opacity-50">
                    <svg viewBox="0 0 100 30" className="w-full h-full stroke-text-placeholder fill-none" preserveAspectRatio="none">
                         <path d="M0,15 Q30,30 50,15 T100,20" strokeWidth="2" />
                    </svg>
                </div>
              </div>
                
                 {/* Stat Row */}
                <div className="flex items-center gap-2 mt-auto mb-6 z-10">
                    <span className="text-xs text-text-secondary uppercase">Lifetime Block Rewards</span>
                     <span className="text-xs text-text-primary font-medium">0.00</span>
                </div>

                 {/* Button Group */}
               <div className="flex items-center gap-4 z-10">
                    <div className="flex items-center gap-2 text-xs text-text-secondary uppercase">
                       <span className="w-4 h-4 rounded-sm border border-text-secondary/50 flex items-center justify-center">
                           <span className="w-2 h-2 bg-text-secondary/50 rounded-[1px]" />
                       </span>
                       Block rewards already claimed
                    </div>
                   <Button variant="secondary" className="bg-background-card text-text-primary border-border-default hover:bg-background-surface h-10 px-4 flex items-center gap-2 ml-auto">
                       Claim Block Rewards
                   </Button>
               </div>

                {/* Background Vectors/Gradients */}
              <div className="absolute inset-0 z-0 pointer-events-none">
                  <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-bl from-accent-green/10 to-transparent opacity-20" />
              </div>
            </div>
          </div>

          {/* Transactions Section */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-medium text-text-primary">Transactions</h2>
                 <p className="text-sm text-text-secondary">View your transaction history here</p>
              </div>

              <div className="flex items-center gap-4">
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                      <Input 
                        placeholder="" 
                        className="bg-background-surface border-border-default w-[230px] pl-9 text-text-primary placeholder:text-text-placeholder h-10 rounded-md focus-visible:ring-0 focus-visible:border-border-highlight"
                        aria-label="Search transactions"
                      />
                  </div>
                  <Button variant="secondary" className="bg-background-surface border-border-default text-text-primary h-10 px-3 hover:bg-background-card">
                      <Filter className="w-4 h-4 mr-2 text-text-secondary" />
                       Filters
                  </Button>
                  <Button variant="secondary" className="bg-background-surface border-border-default text-text-primary w-10 h-10 p-0 flex items-center justify-center hover:bg-background-card">
                      <Download className="w-4 h-4 text-text-secondary" />
                  </Button>
              </div>
            </div>

            {/* Transactions Table Container */}
            <div className="bg-[#0F0F10] border border-border-default rounded-md min-h-[145px] relative">
                 {/* Table Header */}
                 <div className="grid grid-cols-6 gap-4 px-4 py-4 border-b border-border-default text-xs font-medium text-text-secondary uppercase tracking-wide">
                     <div className="col-span-1">Platform</div>
                     <div className="col-span-1">Type Of Transaction</div>
                     <div className="col-span-1">Transaction Amount</div>
                     <div className="col-span-1">Date</div>
                     <div className="col-span-1">Time</div>
                     <div className="col-span-1 text-right">Transaction ID</div>
                 </div>

                 {/* Empty State */}
                 <div className="flex items-center justify-center h-24">
                     <span className="text-sm text-text-primary">No results.</span>
                 </div>
            </div>
          </div>
        </div>
      </main>
      <FixedFooter />
    </div>
  );
}
