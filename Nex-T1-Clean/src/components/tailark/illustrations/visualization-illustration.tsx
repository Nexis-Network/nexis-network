export const MainIllustration = () => {
    return (
        <div className="bg-illustration ring-border-illustration relative z-10 rounded-xl border border-transparent p-5 pb-4 shadow-xl shadow-black/5 ring-1">
            <div className="text-foreground font-medium">
                <span className="bg-amber-100 py-1 text-amber-900">Spending</span> Limit
            </div>
            <div className="text-muted-foreground mt-0.5 text-sm">New users by First user primary channel group</div>
            <div className="relative mb-4 mt-4 flex gap-0.5 *:rounded">
                <div className="bg-primary h-5 w-2/5 shadow duration-300 group-hover:w-3/5" />
                <div className="relative h-5 w-3/5 border duration-300 before:absolute before:inset-0.5 before:bg-[repeating-linear-gradient(-45deg,var(--color-foreground),var(--color-foreground)_1px,transparent_1px,transparent_4px)] before:opacity-15 group-hover:w-2/5" />
            </div>

            <div className="mt-3 space-y-1">
                <div className="grid grid-cols-[auto_1fr] items-center gap-2">
                    <div className="size-1.5 rounded-full bg-[color-mix(in_oklab,var(--color-foreground)50%,var(--color-primary))]"></div>
                    <div className="line-clamp-1 text-sm font-medium">
                        Running <span className="text-muted-foreground">(20%)</span> average of 12 Minutes
                    </div>
                </div>
                <div className="grid grid-cols-[auto_1fr] items-center gap-2">
                    <div className="bg-primary size-1.5 rounded-full"></div>
                    <div className="line-clamp-1 text-sm font-medium">
                        Swimming <span className="text-muted-foreground">(20%)</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export const VisualizationIllustration = () => {
    return (
        <div className="mask-radial-from-50% mask-radial-at-center mask-radial-to-[75%_50%] group relative -mx-8 max-md:-mx-6">
            <div className="grid grid-cols-5 items-center gap-2">
                <div className="*:ring-foreground/10 grid h-full grid-rows-[1fr_auto_1fr] space-y-2 *:rounded-xl *:ring-1">
                    <div></div>
                    <div className="bg-card/50 h-48"></div>
                    <div></div>
                </div>
                <div className="col-span-3 grid grid-rows-[1fr_auto_1fr] space-y-2">
                    <div className="bg-card/50 ring-foreground/10 flex rounded-b-xl p-6 ring-1"></div>
                    <div className="relative">
                        <div className="bg-linear-to-r absolute inset-4 from-indigo-900/50 via-sky-500 to-purple-500 opacity-40 blur-xl"></div>
                        <MainIllustration />
                    </div>
                    <div className="bg-card/50 ring-foreground/10 rounded-t-xl p-6 ring-1"></div>
                </div>
                <div className="*:ring-foreground/10 grid h-full grid-rows-[1fr_auto_1fr] space-y-2 *:rounded-xl *:ring-1">
                    <div></div>
                    <div className="bg-card/50 h-48"></div>
                    <div></div>
                </div>
            </div>
        </div>
    )
}