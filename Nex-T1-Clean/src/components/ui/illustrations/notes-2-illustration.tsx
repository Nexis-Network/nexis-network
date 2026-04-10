import { LassoSelect, NotepadText, Play, Target } from 'lucide-react'

export const Notes2Illustration = () => {
    return (
        <div
            aria-hidden
            className="min-w-sm max-w-md px-6 pt-1">
            <div className="bg-illustration/95 shadow-black/4 ring-border-illustration z-1 relative rounded-2xl p-6 shadow-md ring-1">
                <div className="mask-t-from-5% bg-illustration/50 mask-t-to-65% absolute inset-0 rounded-2xl backdrop-blur" />
                <span className="text-muted-foreground text-xs">
                    Today <span className="bg-foreground/50 size-0.5 rounded-full"></span> <span>09:15 AM</span>{' '}
                </span>
                <div className="mt-1 text-lg font-semibold">Marketing Website Launch</div>

                <div className="bg-foreground/10 group relative mb-4 mt-3 h-fit w-fit cursor-pointer overflow-hidden rounded-full p-px shadow shadow-black/5">
                    <div className="bg-linear-to-br/increasing mask-r-to-75% mask-r-from-25% duration-2000 absolute inset-0 aspect-square -translate-y-1/3 animate-spin from-emerald-400 via-blue-500 to-indigo-400 opacity-50"></div>
                    <div className="group-hover:bg-illustration bg-background/95 relative flex h-8 items-center gap-1.5 rounded-full px-3 text-sm duration-100">
                        <Play className="fill-foreground *:not-first:opacity-50 size-3" />
                        03:47
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="*:not-first:text-foreground/50 flex gap-5 border-b *:-mb-px *:flex *:cursor-pointer *:items-center *:gap-1.5 *:py-2 *:text-sm *:[&>svg]:size-3.5">
                        <div className="border-primary border-b">
                            <Target />
                            <span>Summary</span>
                        </div>
                        <div>
                            <NotepadText />
                            <span>Transcript</span>
                        </div>
                        <div>
                            <LassoSelect />
                            <span>Creations</span>
                        </div>
                    </div>
                    <div className="space-y-3 text-sm">
                        <p className="text-muted-foreground">Key decisions from today's marketing sync:</p>
                        <ul className="text-muted-foreground list-disc space-y-1.5 pl-4">
                            <li>
                                <span className="text-foreground font-medium">Launch date confirmed:</span> Monday, March 18th at 9 AM EST
                            </li>
                            <li>
                                <span className="text-foreground font-medium">Hero section:</span> New animated product showcase with A/B testing enabled
                            </li>
                            <li>
                                <span className="text-foreground font-medium">SEO improvements:</span> Meta tags updated, sitemap regenerated, Core Web Vitals optimized
                            </li>
                        </ul>
                        <p className="text-muted-foreground">Next steps: QA review by Friday, staging deployment Thursday EOD.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Notes2Illustration