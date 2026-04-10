import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChatIllustration } from "./chat-illustration"

export default function HeroSection() {
    return (
        <section className="bg-linear-to-b to-muted">
            <div className="pb-36 pt-24">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="mx-auto max-w-4xl">
                        <ChatIllustration />
                    </div>
                    <div className="mx-auto mt-20 max-w-2xl text-center">
                        <span className="text-primary bg-primary/5 border-primary/10 rounded-full border px-2 py-1 text-sm font-medium">Tailark AI</span>
                        <h1 className="mt-4 text-balance text-4xl font-semibold md:text-5xl lg:text-6xl">AI-driven insights, seamless execution.</h1>
                        <p className="text-muted-foreground mx-auto mb-6 mt-4 max-w-md text-balance text-lg">With Tailark's personal AI, get your projects to the finish line faster and with context.</p>

                        <Button asChild>
                            <Link href="#link">Get Started</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}