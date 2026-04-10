import React from 'react'
import { Search } from 'lucide-react'

export default function HeroSection() {
    return (
        <section className="bg-background py-24">
            <div className="mx-auto max-w-5xl px-6">
                <div className="mx-auto max-w-4xl text-center">
                    <span className="text-primary bg-primary/5 border-primary/10 rounded-full border px-2 py-1 text-sm font-medium">Support</span>
                    <h1 className="mt-4 text-balance text-4xl font-semibold md:text-5xl lg:text-6xl lg:tracking-tight">How can we help?</h1>
                    <p className="text-muted-foreground mb-6 mt-4 text-balance text-lg">Find answers to your questions and get support for our services.</p>

                    <div className="relative mx-auto max-w-lg">
                        <Search className="absolute left-5 top-1/2 size-4 -translate-y-1/2" />
                        <input
                            type="text"
                            name="search"
                            id="search"
                            className="focus:ring-primary border-foreground/15 h-14 w-full rounded-full border py-3 pl-12 pr-4 outline-none focus:border-transparent focus:ring-2"
                            placeholder="Ask a question"
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}