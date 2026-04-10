import Link from 'next/link'
import { ReactNode } from 'react'

import { Stripe } from '@/components/ui/svgs/stripe'
import { Hulu } from '@/components/ui/svgs/hulu'
import { VercelWordmark as VercelFull } from '@/components/ui/svgs/vercel'
import { Beacon } from '@/components/ui/svgs/beacon'
import { SupabaseLight as Supabase } from '@/components/ui/svgs/supabase'
import { OpenaiWordmarkLight as OpenAIFull } from '@/components/ui/svgs/openai'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface Customer {
    name: string
    logo: ReactNode
    title: string
    description: string
    url: string
}

export function Customers() {
    const customers: Customer[] = [
        {
            name: 'Stripe',
            logo: <Stripe className="h-7 w-16" />,
            title: '65% Faster',
            description: 'How Stripe is scaling their marketing websites.',
            url: '#',
        },
        {
            name: 'Hulu',
            logo: <Hulu className="w-17 h-6" />,
            title: 'High-performance',
            description: 'How Hulu is building and scaling their marketing websites.',
            url: '#',
        },
        {
            name: 'Vercel',
            logo: <VercelFull className="h-6 w-28" />,
            title: 'Fast and secure',
            description: 'How Vercel is building and scaling their marketing websites.',
            url: '#',
        },
        {
            name: 'Beacon',
            logo: <Beacon className="h-6 w-24" />,
            title: 'Improved workflow',
            description: 'How Beacon is transforming their marketing websites.',
            url: '#',
        },
        {
            name: 'Supabase',
            logo: <Supabase className="h-7 w-32" />,
            title: 'Improved workflow',
            description: 'How Supabase is transforming their marketing websites.',
            url: '#',
        },
        {
            name: 'OpenAI',
            logo: <OpenAIFull className="h-6 w-24" />,
            title: 'Improved workflow',
            description: 'How OpenAI is transforming their marketing websites.',
            url: '#',
        },
    ]

    return (
        <section
            id="customers"
            className="@container">
            <div className="mx-auto max-w-5xl px-6 pb-32">
                <div>
                    <span className="text-primary font-mono text-sm uppercase">More customers</span>
                    <div className="mt-8 grid max-w-xl gap-6">
                        <h2 className="text-foreground text-balance text-4xl font-semibold md:text-5xl">The world’s best teams build with Tailark</h2>
                        <p className="text-muted-foreground text-balance">Tailark is trusted by over 100 companies to help them scale their business and stay ahead of the competition.</p>
                    </div>
                </div>
                <div className="@3xl:grid-cols-2 @4xl:grid-cols-3 mt-16 grid gap-6 lg:-mx-8">
                    {customers.map((customer) => (
                        <Card
                            key={customer.name}
                            className="hover:bg-card group relative row-span-3 grid grid-rows-subgrid gap-8 p-6 lg:p-8">
                            <div className="not-group-hover:**:fill-foreground mb-6 shrink-0">{customer.logo}</div>

                            <div>
                                <span className="text-muted-foreground text-sm">{customer.title}.</span>
                                <p className="text-foreground balance mt-3 text-xl font-semibold">{customer.description}</p>
                            </div>
                            <Link
                                href={customer.url}
                                className="text-muted-foreground group-hover:text-primary flex items-center text-sm font-medium before:absolute before:inset-0">
                                Read Story
                                <ChevronRight
                                    className="ml-2 size-3 translate-y-px duration-200 group-hover:translate-x-0.5"
                                    strokeWidth={3}
                                />
                            </Link>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    )
}