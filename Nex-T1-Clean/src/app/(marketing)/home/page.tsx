import React from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { LogoCloud } from '@/components/tailark/logo-cloud'

import { PlatformFeatures } from '@/app/(marketing)/home/sections/platform-features'
import { AnalyticsFeatures } from '@/app/(marketing)/home/sections/analytics-features'
import { TestimonialsSection } from '@/app/(marketing)/home/sections/testimonials-section'
import { CallToAction } from '@/components/tailark/call-to-action'
import { HeroIllustration } from '@/components/illustrations/hero-illustration'
import { ProductDirectionFeaturesSection } from '@/app/(marketing)/home/sections/product-direction-features'
import { MoreFeatures } from '@/app/(marketing)/home/sections/more-features'

export default function Home() {
    return (
        <>
            <section>
                <div className="bg-muted pt-32 lg:pt-44">
                    <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-12">
                        <div className="text-center">
                            <h1 className="text-foreground mx-auto text-balance text-5xl font-semibold lg:text-6xl xl:tracking-tight">
                                The <span>Financial OS</span> powering businesses on your platform
                            </h1>

                            <div className="mx-auto mb-20 mt-4 max-w-lg">
                                <p className="text-muted-foreground mb-6 text-balance text-lg lg:text-xl">Experience seamless payments, real-time collaboration, and actionable insights. Set up in minutes.</p>

                                <div className="bg-foreground/5 ring-border-illustration mx-auto w-fit rounded-lg p-1 ring-1">
                                    <Button
                                        asChild
                                        className="[--color-primary:var(--color-indigo-500)]">
                                        <Link href="/pricing">Get Started </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <HeroIllustration />
                    </div>
                </div>
                <LogoCloud />
            </section>
            <AnalyticsFeatures />
            <PlatformFeatures />
            <ProductDirectionFeaturesSection />
            <MoreFeatures />
            <TestimonialsSection />
            <CallToAction />
        </>
    )
}
