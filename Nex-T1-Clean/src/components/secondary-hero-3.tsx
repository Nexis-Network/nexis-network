import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { IntegrationsIllustration } from "@/components/ui/illustrations/integrations-illustration"

export default function HeroSection() {
    return (
        <section className="bg-background py-24">
            <div className="mx-auto max-w-5xl px-6">
                <IntegrationsIllustration />

                <div className="mx-auto mt-20 max-w-2xl text-center">
                    <span className="text-primary bg-primary/5 border-primary/10 rounded-full border px-2 py-1 text-sm font-medium">Integrations</span>
                    <h1 className="mt-4 text-balance text-4xl font-semibold md:text-5xl lg:text-6xl">Connect all your preferred applications</h1>
                    <p className="text-muted-foreground mx-auto mb-6 mt-4 max-w-xl text-balance text-lg">With Tailark's integrations, connect with all your preferred applications and get your projects to the finish line faster.</p>

                    <Button asChild>
                        <Link href="#link">Browse Integrations</Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}