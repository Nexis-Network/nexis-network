import { CalendarDays, Clock2, Zap } from 'lucide-react'
import Image from 'next/image'

export function ProductDirectionFeaturesSection() {
    return (
        <section className="@container py-24">
            <div className="mx-auto w-full max-w-5xl px-6">
                <div className="relative">
                    <div className="max-w-xl">
                        <span className="text-primary font-mono text-sm uppercase">Product direction</span>
                        <h2 className="text-foreground mb-4 mt-8 text-4xl font-semibold md:text-5xl">Set the product direction</h2>
                        <p className="text-muted-foreground text-balance">
                            Monitor your application&apos;s activity in real-time. <span className="text-muted-foreground"> Instantly identify and resolve issues.</span>
                        </p>
                    </div>

                    <div className="py-16 max-lg:-mx-6 max-lg:overflow-hidden max-lg:pl-6">
                        <div className="bg-background min-w-3xl ring-foreground/10 overflow-hidden rounded-2xl p-1 shadow-2xl shadow-indigo-900/35 ring-1 backdrop-blur">
                            <div className="border-background relative aspect-video origin-top rounded-xl border-l-4">
                                <Image
                                    className="object-top-left size-full object-cover"
                                    src="https://res.cloudinary.com/dohqjvu9k/image/upload/v1757920810/circle_un3f39.png"
                                    alt="app screenshot"
                                    width={2880}
                                    height={1920}
                                    sizes="(max-width: 640px) 768px, (max-width: 768px) 1024px, (max-width: 1024px) 1280px, 1280px"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="@4xl:gap-12 @4xl:grid-cols-3 relative grid grid-cols-2 gap-6">
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
            </div>
        </section>
    )
}