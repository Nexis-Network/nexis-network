import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CallToAction } from '@/components/call-to-action'
import { Container, Separator } from '@/components/container'
import { SecurityFeatures } from '@/app/(marketing-v2)/solutions/sections/security-features'
import { TestimonialsSection } from '@/app/(marketing-v2)/solutions/sections/testimonials-section'
import { EnterpriseForm } from "@/components/enterprise-form"
import { Stripe } from '@/components/ui/svgs/stripe'
import TailwindCSS from '@/components/ui/svgs/tailwindcss'
import { Beacon } from '@/components/ui/svgs/beacon'
import { VercelFull } from '@/components/ui/svgs/vercel'
import { CheckCircle2 } from 'lucide-react'
import { CollaborationSection } from '@/app/(marketing-v2)/solutions/sections/collaboration-section'
import MoreFeatures from '@/app/(marketing-v2)/solutions/sections/more-features'

export default function Home() {
    return (
        <>
            <section
                id="home"
                className="overflow-hidden">
                <div className="relative">
                    <Container className="@4xl:px-12 px-6 py-3">
                        <span className="text-muted-foreground font-mono text-sm uppercase">Enterprise</span>
                    </Container>
                    <Container asGrid>
                        <div className="@4xl:grid-cols-2 grid gap-px">
                            <div
                                data-grid-content
                                className="@4xl:p-12 p-6">
                                <div className="@max-4xl:text-center relative mx-auto max-w-3xl">
                                    <h1 className="text-foreground text-balance text-5xl font-semibold tracking-tight lg:text-6xl">Invoicing. Enterprise Efficiency. Real Impact.</h1>
                                    <p className="text-muted-foreground mx-auto mb-8 mt-6 text-balance text-lg">Our Enterprise Invoicing solution simplifies billing processes, enhances financial oversight, and ensures compliance with ease.</p>

                                    <Button
                                        asChild
                                        size="lg">
                                        <Link href="#link">Watch demo</Link>
                                    </Button>

                                    <ul className="mt-8 space-y-2">
                                        {['Create invoices', 'Track payments', 'Manage finances'].map((item, index) => (
                                            <li
                                                key={index}
                                                className="text-muted-foreground @max-4xl:justify-center flex items-center gap-2">
                                                <CheckCircle2 className="size-4 fill-emerald-400/25 text-emerald-600 dark:text-emerald-500" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div
                                data-grid-content
                                className="@4xl:p-12 bg-card/80! p-6">
                                <EnterpriseForm />
                            </div>
                        </div>
                    </Container>

                    <Container
                        asGrid
                        className="@4xl:**:data-grid-content:p-12 **:data-grid-content:p-6 @5xl:**:data-grid-content:p-12 @4xl:grid-cols-4 grid grid-cols-2 gap-px p-[0.5px]">
                        <div
                            data-grid-content
                            className="row-span-2 grid grid-rows-subgrid gap-6">
                            <p className="text-muted-foreground text-balance">
                                <strong className="text-foreground font-medium">99.9% Uptime guarantee</strong> ensured across all platforms.
                            </p>

                            <Stripe
                                height={22}
                                width={56}
                            />
                        </div>
                        <div
                            data-grid-content
                            className="row-span-2 grid grid-rows-subgrid gap-6">
                            <p className="text-muted-foreground text-balance">
                                <strong className="text-foreground font-medium">15X</strong> faster deployment daily speed.
                            </p>

                            <TailwindCSS
                                height={24}
                                width={120}
                            />
                        </div>
                        <div
                            data-grid-content
                            className="row-span-2 grid grid-rows-subgrid gap-6">
                            <p className="text-muted-foreground">
                                <strong className="text-foreground font-medium">24/7 Support</strong> with dedicated teams.
                            </p>

                            <Beacon
                                height={22}
                                width={68}
                            />
                        </div>
                        <div
                            data-grid-content
                            className="row-span-2 grid grid-rows-subgrid gap-6">
                            <p className="text-muted-foreground text-balance">
                                <strong className="text-foreground font-medium">Seamless Integration</strong> with top industry tools.
                            </p>

                            <VercelFull
                                height={24}
                                width={78}
                            />
                        </div>
                    </Container>
                </div>
            </section>
            <Separator className="h-32" />
            <CollaborationSection />
            <Separator className="h-24" />

            <SecurityFeatures />
            <Separator className="h-24" />

            <MoreFeatures />
            <TestimonialsSection />
            <CallToAction />
        </>
    )
}