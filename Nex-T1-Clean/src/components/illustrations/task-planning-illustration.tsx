import { CheckCircle2, CircleDashed, Play } from 'lucide-react'

export const TaskPlanningIllustration = () => (
    <div>
        <div className="flex items-center gap-2">
            <div className="text-sm font-medium">Task Planning</div>
            <div className="bg-muted text-muted-foreground ml-auto rounded-full px-2 py-0.5 text-[10px]">Auto-generated</div>
        </div>

        <div className="relative -mx-2 mt-4">
            <div className="bg-linear-to-br absolute inset-0 rounded-xl from-purple-400 to-emerald-500 opacity-75 mix-blend-lighten blur-md dark:mix-blend-overlay" />

            <div className="bg-illustration ring-border-illustration rounded-lg p-2.5 shadow-md shadow-black/5 ring-1">
                <div className="text-muted-foreground text-[10px]">Goal</div>
                <div className="mt-1 text-xs">Build a REST API endpoint for user authentication with JWT tokens</div>
            </div>
        </div>
        <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-green-500" />

                <div className="flex-1 text-xs font-medium line-through opacity-50">1. Research solutions</div>
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
                    <div className="text-primary text-xs font-semibold">2. Implement solution</div>
                    <div className="text-primary/70 text-[10px]">In progress... 12s</div>
                </div>
            </div>

            <div className="flex items-start gap-2 opacity-40">
                <CircleDashed className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <div className="flex-1">
                    <div className="text-xs font-medium">3. Deliver result</div>
                    <div className="text-muted-foreground text-[10px]">Pending</div>
                </div>
            </div>
        </div>
    </div>
)