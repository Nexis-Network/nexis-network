import { CalendarDays, Clock2, Zap } from 'lucide-react'
import { Linear } from '@/components/ui/svgs/linear'
import { Vercel } from '@/components/ui/svgs/vercel'
import { Cloudflare } from '@/components/ui/svgs/cloudflare'
import Image from 'next/image'

export function AnalyticsFeatures() {
    return (
        <section className="@container py-16">
            <div className="mx-auto max-w-5xl px-6">
                <div className="@3xl:grid-cols-3 @3xl:gap-12 relative grid">
                    <div className="@3xl:pb-3 flex flex-col justify-between gap-12">
                        <div>
                            <h2 className="relative z-10 text-balance text-4xl font-semibold md:text-5xl">Powerful integrations with our API</h2>
                            <p className="text-muted-foreground my-6 max-w-2xl text-lg">Generate payment links at scale, enabling seamless marketing campaigns, efficient sales processes, and faster payment.</p>
                        </div>

                        <div className="max-w-56 space-y-3">
                            <h3 className="font-medium">Native IDE Support</h3>
                            <div className="*:bg-foreground/5 grid grid-cols-3 gap-0.5 *:flex *:items-center *:justify-center *:rounded *:px-2 *:py-3">
                                <div className="rounded-l-lg!">
                                    <Linear className="size-5" />
                                </div>
                                <div>
                                    <Vercel className="size-5" />
                                </div>
                                <div className="rounded-r-lg!">
                                    <Cloudflare className="size-5" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="@3xl:col-span-2 mt-auto h-fit max-lg:-mx-6 max-lg:overflow-hidden max-lg:pb-16 max-lg:pl-6 max-lg:pt-12">
                        <div className="bg-background min-w-3xl ring-foreground/10 overflow-hidden rounded-2xl p-1 shadow-2xl shadow-indigo-900/35 ring-1 backdrop-blur">
                            <div className="relative aspect-video origin-top rounded-xl">
                                <Image
                                    className="object-top-left size-full object-cover"
                                    src="https://res.cloudinary.com/dohqjvu9k/image/upload/v1757920810/circle-4_lkhxqm.png"
                                    alt="app screenshot"
                                    width={1520}
                                    height={1013}
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1520px"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="@4xl:gap-12 @4xl:grid-cols-3 relative grid grid-cols-2 gap-6 lg:mt-16">
                    <div className="space-y-1.5">
                        <Clock2 className="fill-foreground/10 size-4" />
                        <h3 className="mt-3 font-medium">Speed Is Everything</h3>
                        <p className="text-muted-foreground line-clamp-2 text-sm">Tailark is a fast and efficient AI-powered code editor that can help you write code faster and more efficiently.</p>
                    </div>
                    <div className="space-y-1.5">
                        <Zap className="fill-foreground/10 size-4" />
                        <h3 className="mt-3 font-medium">Speed Is Everything</h3>
                        <p className="text-muted-foreground line-clamp-2 text-sm">Tailark is a fast and efficient AI-powered code editor that can help you write code faster and more efficiently.</p>
                    </div>
                    <div className="space-y-1.5">
                        <CalendarDays className="fill-foreground/10 size-4" />
                        <h3 className="mt-3 font-medium">Speed Is Everything</h3>
                        <p className="text-muted-foreground line-clamp-2 text-sm">Tailark is a fast and efficient AI-powered code editor that can help you write code faster and more efficiently.</p>
                    </div>
                    <div className="space-y-1.5 md:hidden">
                        <CalendarDays className="fill-foreground/10 size-4" />
                        <h3 className="mt-3 font-medium">Speed Is Everything</h3>
                        <p className="text-muted-foreground line-clamp-2 text-sm">Tailark is a fast and efficient AI-powered code editor that can help you write code faster and more efficiently.</p>
                    </div>
                </div>
            </div>
        </section>
    )
}