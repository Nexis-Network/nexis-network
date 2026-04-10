import { Button } from '@/components/ui/button'
import { DocumentIllustation } from '@/components/illustrations/document-illustration'
import { CurrencyIllustration } from '@/components/illustrations/currency-illustration'
import { ArrowBigRight } from 'lucide-react'
import Link from 'next/link'

export function HowItWorksSection() {
    return (
        <section className="relative">
            <div
                aria-hidden
                className="mask-b-from-65% pointer-events-none absolute -left-2 right-0 -mt-12 sm:-top-24 lg:inset-x-0 lg:-top-32">
                <svg
                    viewBox="0 0 2400 1653"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-foreground/15 fill-background/35 w-full">
                    <path
                        d="M6.81602 605.752L38.684 642.748C42.4362 647.104 44.5 652.662 44.5 658.411V1628.23C44.5 1641.59 55.4076 1652.38 68.7652 1652.23L2375.26 1626.76C2388.42 1626.62 2399 1615.92 2399 1602.76V2L2153.06 247.941C2144.06 256.943 2131.85 262 2119.12 262H90.4852C84.094 262 77.9667 264.549 73.4616 269.083L7.97632 334.98C3.50795 339.476 1 345.558 1 351.897V590.089C1 595.838 3.06383 601.396 6.81602 605.752Z"
                        stroke="currentColor"
                    />
                </svg>
            </div>
            <div className="relative py-24">
                <div className="@container relative mx-auto w-full max-w-5xl px-6">
                    <div className="mx-auto max-w-2xl text-center">
                        <span className="text-primary text-sm uppercase">Our Process</span>
                        <h2 className="text-foreground mt-8 text-4xl font-semibold md:text-5xl">Simple Three-Step Workflow</h2>
                        <p className="text-muted-foreground mt-4 text-balance text-lg">Experience our streamlined approach to data analysis that empowers your team to make informed decisions quickly and efficiently.</p>
                    </div>

                    <div className="@3xl:grid-cols-3 my-20 grid gap-12">
                        <div className="space-y-6">
                            <div className="text-center">
                                <span className="mx-auto flex size-6 items-center justify-center rounded-full bg-zinc-500/15 text-sm font-medium text-zinc-700">1</span>
                                <div className="relative">
                                    <div className="mx-auto my-6 w-fit">
                                        <DocumentIllustation />
                                    </div>
                                    <ArrowBigRight className="@3xl:block fill-background stroke-background absolute inset-y-0 right-0 my-auto hidden translate-x-[150%] drop-shadow" />
                                </div>
                                <h3 className="text-foreground mb-4 text-lg font-semibold">Data Collection</h3>
                                <p className="text-muted-foreground text-balance">Easily import data from multiple sources and formats with.</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="text-center">
                                <span className="mx-auto flex size-6 items-center justify-center rounded-full bg-zinc-500/15 text-sm font-medium text-zinc-700">2</span>
                                <div className="relative">
                                    <div className="mx-auto my-6 w-fit">
                                        <CurrencyIllustration />
                                    </div>
                                    <ArrowBigRight className="@3xl:block fill-background stroke-background absolute inset-y-0 right-0 my-auto hidden translate-x-[150%] drop-shadow" />
                                </div>
                                <h3 className="text-foreground mb-4 text-lg font-semibold">Automated Analysis</h3>
                                <p className="text-muted-foreground text-balance">Our AI-powered system processes complex datasets to identify patterns.</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="text-center">
                                <span className="mx-auto flex size-6 items-center justify-center rounded-full bg-zinc-500/15 text-sm font-medium text-zinc-700">3</span>
                                <div className="mx-auto my-6 flex w-fit gap-2">
                                    <DocumentIllustation />
                                    <DocumentIllustation />
                                </div>
                                <h3 className="text-foreground mb-4 text-lg font-semibold">Actionable Reports</h3>
                                <p className="text-muted-foreground text-balance">Transform insights into beautiful visualizations and shareable reports.</p>
                            </div>
                        </div>
                    </div>

                    <Button
                        asChild
                        variant="outline"
                        className="mx-auto flex w-fit">
                        <Link href="/sign-up">Get Started</Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}