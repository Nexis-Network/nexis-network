import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react'

export const AgentFeedbackIllustration = () => {
    return (
        <div
            aria-hidden
            className="min-w-xs">
            <div className="bg-card/95 ring-border-illustration shadow-black/6.5 rounded-2xl p-6 shadow-lg ring-1">
                <div className="text-sm font-medium">Self-Correction Loop</div>

                <div className="mt-4 space-y-6">
                    <div className="relative">
                        <div className="flex items-start gap-2.5">
                            <div className="ring-border-illustration flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium shadow ring-1">1</div>
                            <div className="flex-1 space-y-2 pt-1">
                                <div className="text-xs font-medium">Initial Attempt</div>
                                <div className="bg-illustration ring-border-illustration mt-1 rounded-md p-2 font-mono text-[10px] shadow shadow-black/5 ring-1">
                                    <span className="text-muted-foreground">fetch(</span>
                                    <span className="text-green-600 dark:text-green-400">"/api/users"</span>
                                    <span className="text-muted-foreground">)</span>
                                </div>
                                <div className="mt-1 flex items-center gap-1">
                                    <XCircle className="size-3 text-red-500" />
                                    <span className="text-xs text-red-600 dark:text-red-400">Validation failed</span>
                                </div>
                            </div>
                        </div>
                        <div className="border-border absolute -bottom-2.5 left-2.5 top-8 border-l border-dashed"></div>
                    </div>

                    <div className="relative">
                        <div className="flex items-start gap-2">
                            <div className="ring-border-illustration flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium shadow ring-1">2</div>
                            <div className="flex-1 space-y-2 pt-0.5">
                                <div className="text-xs font-medium">Analyzing Error</div>
                                <div className="bg-illustration ring-border-illustration mt-1 rounded-md p-1 shadow shadow-black/5 ring-1">
                                    <div className="space-y-1 border-l-2 border-amber-600 py-1 pl-2 pr-1">
                                        <div className="flex items-center gap-1.5">
                                            <AlertTriangle className="size-3.5 fill-amber-500/15 text-amber-600 dark:text-amber-400" />
                                            <div className="text-xs font-medium text-amber-900 dark:text-amber-300">Warning</div>
                                        </div>

                                        <div className="text-xs">Missing parameter detected in your prompt</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="border-border absolute -bottom-2.5 left-2.5 top-8 border-l border-dashed"></div>
                    </div>

                    <div className="flex items-start gap-2">
                        <div className="ring-border-illustration flex size-5 shrink-0 items-center justify-center rounded-full shadow ring-1">
                            <RefreshCw
                                className="size-3 animate-spin"
                                style={{ animationDuration: '2s' }}
                            />
                        </div>
                        <div className="flex-1 space-y-2 pt-0.5">
                            <div className="text-xs font-medium">Retry with Fix</div>
                            <div className="mt-1 rounded-md p-2 font-mono text-[10px] shadow shadow-blue-900/10 ring-1 ring-blue-500/50 dark:bg-blue-500/5">
                                <span className="text-muted-foreground">fetch(</span>
                                <span className="text-green-600 dark:text-green-400">"/api/users"</span>
                                <span className="text-muted-foreground">
                                    , {'{'}headers{'}'}
                                </span>
                                <span className="text-muted-foreground">)</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1">
                                <span className="text-muted-foreground text-xs">Validating...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AgentFeedbackIllustration