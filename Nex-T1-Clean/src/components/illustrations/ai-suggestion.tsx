import { Apple, CornerDownLeft, X } from 'lucide-react'

export const AiSuggestionIllustration = () => {
    return (
        <div
            aria-hidden
            className="min-w-xs relative max-w-sm">
            <div className="z-1 absolute inset-x-6 top-6">
                <div className="absolute inset-0 scale-100 opacity-75 blur-lg transition-all duration-300 dark:opacity-50">
                    <div className="bg-linear-to-r/increasing animate-hue-rotate absolute inset-x-6 bottom-0 top-12 -translate-y-3 from-pink-400 to-purple-400"></div>
                </div>
                <div className="bg-illustration/95 ring-border-illustration shadow-black/6.5 relative rounded-xl shadow-lg ring-1 backdrop-blur">
                    <X className="absolute right-2 top-2 size-3" />

                    <span className="text-muted-foreground block p-3 text-xs">Enter instruction</span>

                    <div className="flex justify-between border-t p-2">
                        <span className="hover:bg-foreground/5 text-muted-foreground hover:text-foreground flex h-6 cursor-pointer items-center gap-1.5 rounded-md p-2 duration-100">
                            <Apple className="size-3.5 opacity-75" />
                            <span className="text-xs">Professional</span>
                        </span>
                        <div className="bg-primary before:border-foreground/20 relative flex size-6 rounded-md text-white shadow before:absolute before:inset-0 before:rounded-md before:border">
                            <CornerDownLeft className="m-auto size-3.5 drop-shadow" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="mask-b-from-25% mask-b-to-85% space-y-3 text-sm leading-relaxed">
                <div className="text-muted-foreground">
                    Web applications with <span className="bg-linear-to-r from-primary rounded to-emerald-500 bg-clip-text px-1 text-transparent">React and TypeScript</span> using best practices.
                </div>
                <div className="text-muted-foreground">This guide covers component architecture, state management, and performance optimization techniques.</div>
            </div>
        </div>
    )
}