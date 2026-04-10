import { cn } from "@/lib/utils"
import { LogoIcon } from "@/components/brand/logo"
import { Signature } from 'lucide-react'

export const InvoiceIllustration = ({ className }: { className?: string }) => {
    return (
        <div
            aria-hidden
            className="relative">
            <div className={cn('mask-b-from-65% before:bg-card before:border-border after:ring-border-illustration after:bg-card/75 before:z-1 before:ring-border-illustration group relative -mx-4 px-4 pt-6 before:absolute before:inset-x-6 before:bottom-0 before:top-4 before:rounded-2xl before:ring-1 before:backdrop-blur after:absolute after:inset-x-9 after:bottom-0 after:top-2 after:rounded-2xl after:ring-1', className)}>
                <div className="bg-card ring-border-illustration shadow-black/6.5 relative z-10 overflow-hidden rounded-2xl border border-transparent p-8 text-sm shadow-xl ring-1">
                    <div className="mb-6 flex items-start justify-between gap-8">
                        <div className="space-y-0.5">
                            <LogoIcon />
                            <div className="mt-4 font-mono text-xs">INV-456789</div>
                            <div className="mt-1 -translate-x-1 font-mono text-2xl font-semibold">$284,342.57</div>
                            <div className="text-xs font-medium">Due in 15 days</div>
                        </div>

                        <DocumentIllustration />
                    </div>

                    <div className="space-y-1.5 [--color-border:color-mix(in_oklab,var(--color-foreground)10%,transparent)]">
                        <div className="grid grid-cols-[auto_1fr] items-center">
                            <span className="text-muted-foreground w-18 block">To</span>
                            <span className="bg-border h-2 w-1/4 rounded-full px-2"></span>
                        </div>

                        <div className="grid grid-cols-[auto_1fr] items-center">
                            <span className="text-muted-foreground w-18 block">From</span>
                            <span className="bg-border h-2 w-1/2 rounded-full px-2"></span>
                        </div>

                        <div className="grid grid-cols-[auto_1fr] items-center">
                            <span className="text-muted-foreground w-18 block">Address</span>
                            <span className="bg-border h-2 w-2/3 rounded-full px-2"></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export const DocumentIllustration = () => {
    return (
        <div
            aria-hidden
            className="bg-illustration ring-border-illustration shadow-black/6.5 w-16 space-y-2 rounded-md p-2 shadow-md ring-1 [--color-border:color-mix(in_oklab,var(--color-foreground)15%,transparent)]">
            <div className="flex items-center gap-1">
                <div className="bg-border size-2.5 rounded-full" />
                <div className="bg-border h-[3px] w-4 rounded-full" />
            </div>
            <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                    <div className="bg-border h-[3px] w-2.5 rounded-full" />
                    <div className="bg-border h-[3px] w-6 rounded-full" />
                </div>
                <div className="flex items-center gap-1">
                    <div className="bg-border h-[3px] w-2.5 rounded-full" />
                    <div className="bg-border h-[3px] w-6 rounded-full" />
                </div>
            </div>

            <div className="space-y-1.5">
                <div className="bg-border h-[3px] w-full rounded-full" />
                <div className="flex items-center gap-1">
                    <div className="bg-border h-[3px] w-2/3 rounded-full" />
                    <div className="bg-border h-[3px] w-1/3 rounded-full" />
                </div>
            </div>

            <Signature className="ml-auto size-3" />
        </div>
    )
}

export default InvoiceIllustration