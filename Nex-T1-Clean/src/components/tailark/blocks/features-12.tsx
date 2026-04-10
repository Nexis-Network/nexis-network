import { IntegrationsIllustration } from "@/components/illustrations/integrations-illustration"
import { Zap, Sparkles, Lock, Cpu } from 'lucide-react'
import { InvoiceIllustration } from "@/components/illustrations/invoice-illustration"
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import IntelliJIDEA from '@/components/ui/svgs/intellij'
import VisualStudioCode from '@/components/ui/svgs/vs-code'
import Windsurf from '@/components/ui/svgs/windsurf'

export default function FeaturesSection({ className }: { className?: string }) {
    return (
        <section 
            className={cn("bg-background", className)}
            style={{
                "--background": "var(--color-white)",
                "--foreground": "var(--color-zinc-950)",
                "--card": "var(--color-white)",
                "--card-foreground": "var(--color-zinc-950)",
                "--popover": "var(--color-white)",
                "--popover-foreground": "var(--color-zinc-950)",
                "--primary": "var(--color-zinc-950)",
                "--primary-foreground": "var(--color-white)",
                "--secondary": "var(--color-zinc-100)",
                "--secondary-foreground": "var(--color-zinc-950)",
                "--muted": "var(--color-zinc-100)",
                "--muted-foreground": "var(--color-zinc-500)",
                "--accent": "var(--color-zinc-100)",
                "--accent-foreground": "var(--color-zinc-950)",
                "--destructive": "var(--color-red-600)",
                "--destructive-foreground": "var(--color-white)",
                "--border": "var(--color-zinc-200)",
                "--border-illustration": "color-mix(in oklab,var(--color-zinc-950) 7.5%, transparent)",
                "--input": "var(--color-zinc-200)",
                "--ring": "var(--color-zinc-950)",
                "--chart-1": "var(--color-blue-500)",
                "--chart-2": "var(--color-indigo-500)",
                "--chart-3": "var(--color-purple-500)",
                "--chart-4": "var(--color-indigo-400)",
                "--chart-5": "var(--color-red-500)",
                "--radius": "0.5rem",
                "--illustration": "var(--color-white)",
            } as React.CSSProperties}
        >
            <div className="bg-background @container py-24">
                <div className="mx-auto w-full max-w-5xl px-6 xl:px-0">
                    <div className="relative">
                        <PlusDecorator className="-translate-[calc(50%-0.5px)]" />
                        <PlusDecorator className="right-0 -translate-y-[calc(50%-0.5px)] translate-x-[calc(50%-0.5px)]" />
                        <PlusDecorator className="bottom-0 right-0 translate-x-[calc(50%-0.5px)] translate-y-[calc(50%-0.5px)]" />
                        <PlusDecorator className="bottom-0 -translate-x-[calc(50%-0.5px)] translate-y-[calc(50%-0.5px)]" />

                        <div className="border-border/30 @max-3xl:*:nth-6:border-r @max-3xl:*:nth-4:border-r *:nth-[1n+1]:nth-[-n+5]:border-b @3xl:*:nth-[1n+1]:nth-[-n+3]:border-b *:nth-3:border-r-0! @3xl:*:nth-[1n+2]:nth-[-n+6]:border-r divide-foreground/10 @3xl:grid-cols-4 @4xl:*:p-8 relative grid grid-cols-2 overflow-hidden border *:p-4">
                            <div className="col-span-full">
                                <div className="mx-auto max-w-xl pt-8 text-center">
                                    <h2 className="text-balance text-4xl font-semibold text-[rgba(0,0,0,0.9)]">The First Autonomous Web3 DevOps Agent</h2>
                                    <p className="my-6 text-balance text-lg text-[#52525d]">Autonomous, secure Web3 AI agent. Bridge natural language to DevOps with strictly typed, policy-governed execution.</p>
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm">
                                        <Link href="/pricing" className="text-[rgba(0,0,0,0.9)]">Get Started</Link>
                                    </Button>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-x-0 bottom-4 z-10 mx-auto max-w-56 space-y-3">
                                        <h3 className="text-center font-medium text-[rgba(0,0,0,0.9)]">Replaces Manual Ops</h3>
                                        <div className="*:bg-foreground/5 grid grid-cols-3 gap-0.5 *:flex *:items-center *:justify-center *:rounded *:px-2 *:py-3">
                                            <div className="!rounded-l-lg">
                                                <IntelliJIDEA className="size-5" />
                                            </div>
                                            <div>
                                                <VisualStudioCode className="size-5" />
                                            </div>
                                            <div className="!rounded-r-lg">
                                                <Windsurf className="size-5" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mask-b-from-35% @4xl:px-8 mx-auto mt-16 max-w-4xl px-4 pt-1">
                                        <div className="bg-background rounded-(--radius) ring-border-illustration @4xl:h-80 relative h-64 overflow-hidden border border-transparent shadow-xl shadow-black/10 ring-1">
                                            <Image
                                                src="https://res.cloudinary.com/dohqjvu9k/image/upload/v1755171585/tailark_zazuhl.png"
                                                alt="app screen"
                                                width="2880"
                                                height="1842"
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1000px"
                                                className="object-top-left size-full object-cover"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8! col-span-2 row-span-2 grid grid-rows-subgrid gap-8">
                                <div className="max-w-84 mx-auto w-full self-center">
                                    <InvoiceIllustration />
                                </div>
                                <div className="mx-auto max-w-sm text-center">
                                    <h3 className="text-balance font-semibold text-[rgba(0,0,0,0.9)]">Real-Time Market Intelligence</h3>
                                    <p className="mt-3 text-[#52525d]">Track whale wallets, monitor pump.fun bonding curves, and analyze volume spikes for meme breakouts.</p>
                                </div>
                            </div>
                            <div className="p-8! relative col-span-2 row-span-2 grid grid-rows-subgrid gap-8">
                                <PlusDecorator className="bottom-0 -translate-x-[calc(50%+0.5px)] translate-y-[calc(50%+0.5px)]" />

                                <div className="@4xl:px-8 mx-auto max-w-sm self-center">
                                    <IntegrationsIllustration />
                                </div>
                                <div className="relative z-10 mx-auto max-w-sm text-center">
                                    <h3 className="text-balance font-semibold text-[rgba(0,0,0,0.9)]">Automated Trading Execution</h3>
                                    <p className="mt-3 text-[#52525d]">Execute snipes, limit orders, and copy-trades automatically with our low-latency distinct solver.</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Zap className="size-4 text-[rgba(0,0,0,0.9)]" />
                                    <h3 className="text-sm font-medium text-[rgba(0,0,0,0.9)]">Fast</h3>
                                </div>
                                <p className="text-sm text-[#52525d]">Snipe token launches with sub-second block inclusion.</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Cpu className="size-4 text-[rgba(0,0,0,0.9)]" />
                                    <h3 className="text-sm font-medium text-[rgba(0,0,0,0.9)]">Smart</h3>
                                </div>
                                <p className="text-sm text-[#52525d]">Detects honey-pots and rug-pulls before you sign txs.</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Lock className="size-4 text-[rgba(0,0,0,0.9)]" />
                                    <h3 className="text-sm font-medium text-[rgba(0,0,0,0.9)]">Secure</h3>
                                </div>
                                <p className="text-sm text-[#52525d]">Enterprise-grade policy-governed safety.</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="size-4 text-[rgba(0,0,0,0.9)]" />

                                    <h3 className="text-sm font-medium text-[rgba(0,0,0,0.9)]">AI Driven</h3>
                                </div>
                                <p className="text-sm text-[#52525d]">Predicts trends via semantic analysis.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

const PlusDecorator = ({ className }: { className?: string }) => (
    <div
        aria-hidden
        className={cn('mask-radial-from-15% before:bg-foreground/25 after:bg-foreground/25 absolute size-3 before:absolute before:inset-0 before:m-auto before:h-px after:absolute after:inset-0 after:m-auto after:w-px', className)}
    />
)
