export const CtaIllustration = () => {
    return (
        <div className="max-lg:hidden">
            <div className="relative [--color-border-illustration:--alpha(var(--color-zinc-950)/10%)] [--color-border:--alpha(var(--color-zinc-950)/10%)]">
                <div className="h-120 relative mx-auto grid max-w-6xl grid-cols-3 overflow-hidden rounded-2xl lg:px-12">
                    <div className="grid grid-cols-2 pr-6">
                        <div className="grid h-full grid-rows-3 border-r">
                            <div className="flex flex-col justify-end p-6">
                                <div className="**:rounded-full flex w-full flex-wrap justify-end gap-1 rounded border p-4">
                                    <div className="space-y-1">
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-linear-to-b to-card/50 size-full rounded-full border"></div>
                                        </div>
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-linear-to-b to-card/50 size-full rounded-full border"></div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-linear-to-b to-card/50 size-full rounded-full border"></div>
                                        </div>
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-linear-to-b to-card/50 size-full rounded-full border"></div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-linear-to-b to-card/50 size-full rounded-full border"></div>
                                        </div>
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-linear-to-b to-card/50 size-full rounded-full border"></div>
                                        </div>
                                    </div>

                                    <span className="w-full pt-6 font-mono text-[10px] uppercase">Experience seamless payments.</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 grid-rows-2 gap-2 rounded-l-2xl border-y border-l p-2">
                                <div className="bg-linear-to-b to-card/75 ring-border size-full rounded rounded-l-lg ring-1"></div>
                                <div className="bg-linear-to-b to-card/75 ring-border size-full rounded rounded-r-lg ring-1"></div>
                                <div className="bg-linear-to-b to-card/75 ring-border size-full rounded rounded-l-lg ring-1"></div>
                                <div className="bg-linear-to-b to-card/75 ring-border size-full rounded rounded-r-lg ring-1"></div>
                            </div>
                        </div>

                        <div className="grid h-full grid-rows-3 p-6">
                            <div>
                                <div
                                    aria-hidden
                                    className="scale-85 flex w-28 flex-wrap gap-2.5 opacity-75">
                                    {Array.from({ length: 10 }).map((_, index) => (
                                        <div
                                            key={index}
                                            aria-hidden
                                            className="h-5 w-2.5 max-sm:last:hidden">
                                            <div className="bg-card rounded-t-xs ring-foreground/5 h-1.5 shadow ring-1" />
                                            <div className="bg-foreground/5 border-foreground/10 relative mx-auto h-2 w-2 border-x" />
                                            <div className="bg-card rounded-b-xs ring-foreground/5 h-1.5 shadow ring-1" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="mr-auto p-6">
                                <div className="flex gap-1">
                                    <div className="size-7 border p-1">
                                        <div className="bg-card ring-border size-full ring-1"></div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-card ring-border size-full ring-1"></div>
                                        </div>
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-card ring-border size-full ring-1"></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 py-2">
                                    <div className="h-1 w-12 bg-[repeating-linear-gradient(90deg,var(--color-border-illustration),var(--color-border-illustration)_1px,transparent_1px,transparent_3px)]" />
                                    <div className="flex justify-between gap-4">
                                        <div className="h-1.5 w-6 bg-[repeating-linear-gradient(90deg,var(--color-border-illustration),var(--color-border-illustration)_1px,transparent_1px,transparent_3px)]" />
                                        <div className="h-1.5 w-10 bg-[repeating-linear-gradient(90deg,var(--color-border-illustration),var(--color-border-illustration)_1px,transparent_1px,transparent_3px)]" />
                                    </div>
                                </div>

                                <div className="flex justify-between gap-1">
                                    <div className="space-y-1">
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-linear-to-b to-card/50 size-full border"></div>
                                        </div>
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-linear-to-b to-card/50 size-full border"></div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-linear-to-b to-card/50 size-full border"></div>
                                        </div>
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-linear-to-b to-card/50 size-full border"></div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-linear-to-b to-card/50 size-full border"></div>
                                        </div>
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-linear-to-b to-card/50 size-full border"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div />
                    <div className="grid grid-rows-[1fr_auto]">
                        <div className="grid grid-cols-2 pl-6">
                            <div className="flex h-full flex-col items-center justify-between p-4">
                                <div className="flex flex-col justify-center">
                                    <div className="space-y-2 py-2">
                                        <div className="h-2 w-32 bg-[repeating-linear-gradient(90deg,var(--color-border-illustration),var(--color-border-illustration)_1px,transparent_1px,transparent_2px)]" />
                                        <div className="h-2 w-20 bg-[repeating-linear-gradient(90deg,var(--color-border-illustration),var(--color-border-illustration)_1px,transparent_1px,transparent_2px)]" />
                                    </div>
                                    <div className="flex">
                                        <div
                                            aria-hidden
                                            className="scale-85 flex w-16 flex-wrap justify-end gap-2.5 opacity-75">
                                            {Array.from({ length: 5 }).map((_, index) => (
                                                <div
                                                    key={index}
                                                    aria-hidden
                                                    className="h-5 w-2.5 max-sm:last:hidden">
                                                    <div className="bg-card rounded-t-xs ring-foreground/5 h-1.5 shadow ring-1" />
                                                    <div className="bg-foreground/5 border-foreground/10 relative mx-auto h-2 w-2 border-x" />
                                                    <div className="bg-card rounded-b-xs ring-foreground/5 h-1.5 shadow ring-1" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mask-b-from-75% -mt-4 ml-auto h-20 w-6 bg-[repeating-linear-gradient(90deg,var(--color-border-illustration),var(--color-border-illustration)_1px,transparent_1px,transparent_3px)]" />
                                    </div>
                                </div>
                                <div className="**:rounded-full flex w-full flex-wrap justify-end gap-1 rounded border p-4">
                                    <div className="space-y-1">
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-linear-to-b to-card/50 size-full rounded-full border"></div>
                                        </div>
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-linear-to-b to-card/50 size-full rounded-full border"></div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-linear-to-b to-card/50 size-full rounded-full border"></div>
                                        </div>
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-linear-to-b to-card/50 size-full rounded-full border"></div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-linear-to-b to-card/50 size-full rounded-full border"></div>
                                        </div>
                                        <div className="size-3 border p-0.5">
                                            <div className="bg-linear-to-b to-card/50 size-full rounded-full border"></div>
                                        </div>
                                    </div>

                                    <span className="w-full pt-6 font-mono text-[10px] uppercase">Experience seamless payments.</span>
                                </div>

                                <div>
                                    <div
                                        aria-hidden
                                        className="scale-85 flex w-28 flex-wrap justify-end gap-2.5 opacity-75">
                                        {Array.from({ length: 10 }).map((_, index) => (
                                            <div
                                                key={index}
                                                aria-hidden
                                                className="h-5 w-2.5 max-sm:last:hidden">
                                                <div className="bg-card rounded-t-xs ring-foreground/5 h-1.5 shadow ring-1" />
                                                <div className="bg-foreground/5 border-foreground/10 relative mx-auto h-2 w-2 border-x" />
                                                <div className="bg-card rounded-b-xs ring-foreground/5 h-1.5 shadow ring-1" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="relative grid h-full grid-rows-2 border-l">
                                <div className="m-2 bg-[repeating-linear-gradient(45deg,var(--color-border-illustration),var(--color-border-illustration)_1px,transparent_1px,transparent_6px)]"></div>

                                <div className="-mb-2 flex flex-col justify-center rounded-r-xl border-y border-r p-6">
                                    <div className="space-y-2 py-2">
                                        <div className="h-2 w-32 bg-[repeating-linear-gradient(90deg,var(--color-border-illustration),var(--color-border-illustration)_1px,transparent_1px,transparent_2px)]" />
                                        <div className="h-2 w-20 bg-[repeating-linear-gradient(90deg,var(--color-border-illustration),var(--color-border-illustration)_1px,transparent_1px,transparent_2px)]" />
                                    </div>
                                    <div className="flex">
                                        <div
                                            aria-hidden
                                            className="scale-85 flex w-16 flex-wrap justify-end gap-2.5 opacity-75">
                                            {Array.from({ length: 5 }).map((_, index) => (
                                                <div
                                                    key={index}
                                                    aria-hidden
                                                    className="h-5 w-2.5 max-sm:last:hidden">
                                                    <div className="bg-card rounded-t-xs ring-foreground/5 h-1.5 shadow ring-1" />
                                                    <div className="bg-foreground/5 border-foreground/10 relative mx-auto h-2 w-2 border-x" />
                                                    <div className="bg-card rounded-b-xs ring-foreground/5 h-1.5 shadow ring-1" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mask-b-from-75% -mt-4 ml-auto h-20 w-6 bg-[repeating-linear-gradient(90deg,var(--color-border-illustration),var(--color-border-illustration)_1px,transparent_1px,transparent_3px)]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative pb-2 pr-2"></div>
                    </div>
                </div>
            </div>
        </div>
    )
}