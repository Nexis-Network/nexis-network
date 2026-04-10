"use client";

import { PumpFunArtifact } from "@/components/artifacts/features/trading/pump-fun-artifact";
import { TransactionSimulationArtifact } from "@/components/artifacts/features/trading/transaction-simulation-artifact";
import { BurnRateArtifact } from "@/components/artifacts/features/analysis/burn-rate-artifact";
import { TableEditorArtifact } from "@/components/artifacts/features/general/table-editor-artifact";
import { CombinedHoldingsArtifact } from "@/components/artifacts/features/analysis/combined-holdings-artifact";
import { StakingPositionsArtifact } from "@/components/artifacts/features/analysis/staking-positions-artifact";
import { AgentDaosArtifact } from "@/components/artifacts/features/analysis/agent-daos-artifact";
import { AgentWalletArtifact } from "@/components/artifacts/agent-wallet-artifact";
import { PortfolioAnalysisArtifact } from "@/components/artifacts/features/analysis/portfolio-analysis-artifact";
import { CodeView } from "@/components/chat/artifacts/code-view";
import { ImageArtifact } from "@/components/chat/artifacts/image-artifact";
import { FragmentWeb } from "@/components/chat/artifacts/fragment-web";
import { FragmentInterpreter } from "@/components/chat/artifacts/fragment-interpreter-view";
import { FlightStatusArtifact } from "@/components/artifacts/demos/flight-status-artifact";
import { TransactionChartArtifact } from "@/components/artifacts/demos/transaction-chart-artifact";
import { PriceChartArtifact } from "@/components/artifacts/features/analytics/price-chart-artifact";
import { InteractiveChartArtifact } from "@/components/artifacts/features/analysis/chart-artifact";
import { CodeArtifact } from "@/components/artifacts/features/development/code-artifact";
import { InterpreterArtifact } from "@/components/artifacts/features/development/interpreter-artifact";
import { PreviewArtifact } from "@/components/artifacts/features/development/preview-artifact";
import { CanvasArtifact } from "@/components/artifacts/features/general/canvas-artifact";
import { ResearchArtifact } from "@/components/artifacts/features/general/research-artifact";
// Skip static prerender — React SSR context unavailable during build

export default function ArtifactGalleryPage() {
  return (
    <div className="p-8 space-y-12 bg-background min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Artifact Gallery Verification</h1>
      
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Trading: PumpFun (Trade)</h2>
        <div className="max-w-md">
            <PumpFunArtifact data={{
                view: "trade",
                headline: "Executed Buy Order",
                action: {
                    success: true,
                    command: "buy",
                    description: "buy 0.5 SOL of @user-token",
                    mint: "7EYnR...",
                    cluster: "mainnet-beta",
                    signature: "5Kj3...",
                    explorerUrl: "https://solscan.io"
                }
            }} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Trading: PumpFun (Analysis)</h2>
         <div className="max-w-2xl">
            <PumpFunArtifact data={{
                view: "coin_analysis",
                headline: "Token Deep Dive",
                overview: {
                    name: "Pepe Coin",
                    symbol: "PEPE",
                    mint: "PEPE...",
                    description: "High volatility meme coin with strong community.",
                    marketCapUsd: 1000000,

                    holders: 1200,
                    metrics: [
                        { label: "Market Cap", value: "$420k", change: 12.5 },
                        { label: "Volume", value: "$69k", change: -5.2 }
                    ],
                    twitter: "https://x.com"
                },
                relatedTokens: [],

            }} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Trading: Transaction Simulation</h2>
         <div className="max-w-md">
            <TransactionSimulationArtifact data={{
                status: "success",
                fromToken: { symbol: "SOL", amount: "1.0" },
                toToken: { symbol: "USDC", amount: "145.20" },
                gasEstimate: "0.000005 SOL",
                steps: [
                    { name: "Simulation", status: "completed" },
                    { name: "Signature Verification", status: "completed" }
                ]
            }} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Analysis: Burn Rate</h2>
         <div className="max-w-md">
            <BurnRateArtifact data={{
                monthlyBurn: 15000,
                runway: 4.5,
                recommendations: ["Reduce server costs", "Optimize audits"]
            }} />
        </div>
      </section>

       <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Analysis: Combined Holdings</h2>
         <div className="max-w-md">
            <CombinedHoldingsArtifact data={{
                totalValue: 125000,
                wallets: ["w1", "w2"],
                assets: [
                    { symbol: "ETH", chain: "Ethereum", source: "Wallet 1", value: 80000, amount: 25 },
                    { symbol: "SOL", chain: "Solana", source: "Wallet 2", value: 45000, amount: 300 }
                ]
            }} />
        </div>
      </section>

       <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Analysis: Staking Positions</h2>
         <div className="max-w-md">
            <StakingPositionsArtifact data={{
                totalStaked: 50000,
                averageApy: 12.5,
                positions: [
                    { protocol: "Lido", asset: "ETH", amount: 10, value: 32000, apy: 3.5, rewardsPending: 0.1 },
                    { protocol: "Jito", asset: "SOL", amount: 100, value: 15000, apy: 7.2 }
                ]
            }} />
        </div>
      </section>
      
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Analysis: Agent DAOs</h2>
         <div className="max-w-md">
            <AgentDaosArtifact data={{
                daos: [
                    { name: "Nexis DAO", chain: "Solana", role: "Admin", treasuryValue: 5000000, proposalCount: 3, contractAddress: "Dao123..." }
                ]
            }} />
        </div>
      </section>

       <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">General: Table Editor</h2>
         <div className="max-w-2xl">
            <TableEditorArtifact data={{
                columns: [{ key: "id", header: "ID" }, { key: "name", header: "Name" }, { key: "role", header: "Role" }],
                data: [
                    { id: 1, name: "Alice", role: "Admin" },
                    { id: 2, name: "Bob", role: "User" }
                ]
            }} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Legacy: Agent Wallet</h2>
         <div className="max-w-md">
            <AgentWalletArtifact data={{
                wallets: [
                    {
                        address: "5KQ...123",
                        chain: "Solana",
                        totalValue: 10.5,
                        balance: "10.5 SOL",
                        tags: ["Main"],
                        change24h: 2.5,
                        assets: [
                             { symbol: "SOL", amount: 10.5, value: 1500 }
                        ]
                    }
                ]
            }} />
        </div>
      </section>
      
       <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Legacy: Portfolio Analysis</h2>
         <div className="max-w-md">
            <PortfolioAnalysisArtifact data={{
                totalValue: 100000,
                riskScore: 65,
                assets: [],
                insights: ["Diversify"]
            }} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Generation: Code View</h2>
         <div className="max-w-2xl">
            <CodeView 
              code={`function helloWorld() {\n  logger.debug("Hello from the new artifact style!");\n  return true;\n}`} 
              language="typescript" 
            />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Generation: Image Artifact</h2>
         <div className="max-w-md">
            <ImageArtifact payload={{
                type: "image-artifact",
                url: "https://placehold.co/600x600/png",
                prompt: "A futuristic city with neon lights and flying cars, cyberpunk style, high detail.",
                revisedPrompt: "A high quality render of a futuristic cyberpunk city with neon lights."
            }} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Preview: Web Fragment</h2>
         <div className="max-w-3xl">
            <FragmentWeb result={{
                url: "https://example.com",
                template: "web-preview",
                stdout: [],
                stderr: [],
                runtime: 0,
                cellId: "mock-cell-id",
                executionId: "mock-exec-id"
            }} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Preview: Interpreter (Text & HTML)</h2>
         <div className="max-w-2xl">
            <FragmentInterpreter result={{
                results: [
                    { text: "Starting analysis process..." },
                    { text: "Loading dataset: sales_2024.csv" },
                    { text: "", html: "<div style='padding: 10px; background: rgba(0,255,0,0.1); border-radius: 4px; color: #4ade80;'>Analyzed 1,500 rows successfully.</div>" },
                    { text: "Generating summary statistics..." }
                ],
                template: "code-interpreter",
                stdout: [],
                stderr: [],
                runtime: 0,
                cellId: "mock-cell-id",
                executionId: "mock-exec-id"
            }} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Cloned: Flight Status</h2>
         <div className="max-w-2xl">
            <FlightStatusArtifact />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Cloned: Transactions Chart</h2>
         <div className="max-w-3xl">
            <TransactionChartArtifact />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Feature: Transaction Simulation (Success)</h2>
         <div className="max-w-md">
            <TransactionSimulationArtifact data={{
                status: "success",
                fromToken: { symbol: "USDC", amount: "1,000.00" },
                toToken: { symbol: "ETH", amount: "0.245" },
                gasEstimate: "$4.52",
                steps: [
                    { name: "Approve USDC", status: "completed" },
                    { name: "Sign Transaction", status: "completed" },
                    { name: "Execute Swap", status: "completed" }
                ]
            }} />
        </div>
      </section>



      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Cloned: Price Chart (OHLC/Line)</h2>
         <div className="max-w-3xl">
            <PriceChartArtifact 
                symbol="ETH" 
                name="Ethereum" 
                type="line"
                data={Array.from({ length: 20 }, (_, i) => ({
                    time: `Day ${i}`,
                    open: 2000,
                    high: 2100,
                    low: 1900,
                    close: 2000 + Math.sin(i) * 100,
                    volume: 5000
                }))}
            />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Enhanced: Transaction Volume (Real Data Props)</h2>
         <div className="max-w-2xl">
            <TransactionChartArtifact 
                title="DEX Volume Comparison"
                period="30d"
                tokens={[
                    { symbol: "UNI", name: "Uniswap", color: "#FF007A" },
                    { symbol: "JUP", name: "Jupiter", color: "#16A34A" },
                    { symbol: "SOL", name: "Solana", color: "#000000" }
                ]}
                data={[
                    { name: "Week 1", value: 500 },
                    { name: "Week 2", value: 750 },
                    { name: "Week 3", value: 600 },
                    { name: "Week 4", value: 900 }
                ]}
            />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Analysis: Interactive Chart (Scatter)</h2>
         <div className="max-w-2xl h-[400px]">
            <InteractiveChartArtifact data={{
                config: {
                    type: "scatter",
                    title: "Token Correlation Analysis",
                    description: "Correlation between Price and Volume over 24h",
                    xAxisKey: "volume",
                    yAxisKeys: ["price"],
                    xAxisLabel: "Volume (M)",
                    yAxisLabel: "Price ($)",
                    colors: { price: "#10b981" }
                },
                data: [
                    { volume: 10, price: 100 },
                    { volume: 20, price: 120 },
                    { volume: 30, price: 110 },
                    { volume: 40, price: 140 },
                    { volume: 50, price: 130 },
                    { volume: 60, price: 160 },
                    { volume: 70, price: 150 },
                    { volume: 80, price: 180 },
                ]
            }} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Development: Code Artifact</h2>
         <div className="max-w-2xl">
            <CodeArtifact data={{
                title: "Calculate Metrics",
                language: "python",
                code: `def calculate_metrics(data):\n    """Calculates basic metrics from data array"""\n    total = sum(data)\n    average = total / len(data)\n    return {"total": total, "average": average}`
            }} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Development: Interpreter Execution</h2>
         <div className="max-w-2xl">
            <InterpreterArtifact data={{
                code: `import matplotlib.pyplot as plt\nplt.plot([1, 2, 3], [1, 4, 9])\nprint("Graph generated successfully")`,
                language: "python",
                result: {
                    stdout: "Graph generated successfully\n",
                    stderr: "",
                    results: [],
                    error: undefined
                }
            }} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">Development: Web Preview</h2>
         <div className="max-w-3xl">
            <PreviewArtifact data={{
                title: "Local Dev Server",
                url: "http://localhost:3000",
                logs: [
                    { type: 'info', content: 'Server started on port 3000' },
                    { type: 'warn', content: 'Database connection slow' }
                ]
            }} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">General: Canvas (Mermaid)</h2>
         <div className="max-w-2xl">
            <CanvasArtifact 
                code={`graph TD\n    A[Client] -->|Request| B(Load Balancer)\n    B --> C{Service}\n    C -->|Get| D[Database]\n    C -->|Cache| E[Redis]`}
            />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground border-b pb-2">General: Research Results</h2>
         <div className="max-w-2xl">
            <ResearchArtifact data={{
                query: "Next.js 15 Features",
                items: [
                    { title: "Next.js 15 RC", url: "https://nextjs.org/blog/next-15-rc", description: "The latest features in Next.js 15." },
                    { title: "React 19 Beta", url: "https://react.dev/blog/2024/04/25/react-19", description: "React 19 features included in Next.js 15." }
                ]
            }} />
        </div>
      </section>

    </div>
  );
}
