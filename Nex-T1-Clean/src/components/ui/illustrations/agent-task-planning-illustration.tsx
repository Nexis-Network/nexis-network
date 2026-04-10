import { CheckCircle2, CircleDashed, Play } from 'lucide-react'

export const AgentTaskPlanningIllustration = () => {
    return (
        <div
            aria-hidden
            className="min-w-xs max-w-xs">
            <div className="bg-card/95 ring-border-illustration shadow-black/4 rounded-2xl p-6 shadow-md ring-1">
                <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">Task Planning</div>
                    <div className="bg-primary/10 text-primary ml-auto rounded px-2 py-0.5 text-[10px]">Auto-generated</div>
                </div>

                <div className="bg-illustration ring-border-illustration mt-4 rounded-lg p-2.5 shadow shadow-black/5 ring-1">
                    <div className="text-muted-foreground text-[10px]">Goal</div>
                    <div className="mt-1 text-xs">Build a REST API endpoint for user authentication with JWT tokens</div>
                </div>

                <div className="mt-4 space-y-2">
                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-500" />
                        <div className="flex-1">
                            <div className="text-xs font-medium line-through opacity-50">1. Gather requirements</div>
                            <div className="text-muted-foreground text-[10px]">Completed in 2.3s</div>
                        </div>
                    </div>

                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-500" />
                        <div className="flex-1">
                            <div className="text-xs font-medium line-through opacity-50">2. Research solutions</div>
                            <div className="text-muted-foreground text-[10px]">Completed in 5.1s</div>
                        </div>
                    </div>

                    <div className="bg-primary/5 ring-primary/20 -mx-2 flex items-start gap-2 rounded-lg p-2 ring-1">
                        <div className="relative mt-0.5">
                            <CircleDashed
                                className="text-primary size-4 animate-spin"
                                style={{ animationDuration: '3s' }}
                            />
                            <Play className="text-primary absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-current" />
                        </div>
                        <div className="flex-1">
                            <div className="text-primary text-xs font-semibold">3. Implement solution</div>
                            <div className="text-primary/70 text-[10px]">In progress... 12s</div>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 opacity-40">
                        <CircleDashed className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                        <div className="flex-1">
                            <div className="text-xs font-medium">4. Test and validate</div>
                            <div className="text-muted-foreground text-[10px]">Pending</div>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 opacity-40">
                        <CircleDashed className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                        <div className="flex-1">
                            <div className="text-xs font-medium">5. Deliver result</div>
                            <div className="text-muted-foreground text-[10px]">Pending</div>
                        </div>
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[10px]">
                    <div className="text-muted-foreground">2/5 tasks complete</div>
                    <div className="text-muted-foreground">Est. 45s remaining</div>
                </div>
            </div>
        </div>
    )
}

export default AgentTaskPlanningIllustration