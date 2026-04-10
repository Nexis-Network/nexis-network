import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Stripe } from '@/components/ui/svgs/stripe'
import { SupabaseLight as Supabase } from '@/components/ui/svgs/supabase'
import { Hulu } from '@/components/ui/svgs/hulu'
import { VercelWordmark as Vercel } from '@/components/ui/svgs/vercel'
import { Polars } from '@/components/ui/svgs/polars'
import { Cisco } from '@/components/ui/svgs/cisco'
import { Spotify } from '@/components/ui/svgs/spotify'
import { Beacon } from '@/components/ui/svgs/beacon'
import { PrimeVideo as Primevideo } from '@/components/ui/svgs/prime-video'
import { LeapWalletLight as LeapWallet } from '@/components/ui/svgs/leap-wallet'

export function MainCustomers() {
    return (
        <section className="@container">
            <div className="mx-auto max-w-5xl px-6 pb-24 pt-12 md:py-24 lg:pb-36">
                <div className="lg:-mx-12">
                    <div className="@3xl:grid-cols-4 @3xl:grid-rows-5 grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8">
                        <Card className="@3xl:col-span-2 @3xl:row-span-2 group relative col-span-full p-6 shadow-2xl shadow-indigo-900/25 lg:p-12">
                            <div className="max-w-md space-y-12">
                                <Stripe className="w-18 h-8" />
                                <p className="text-3xl font-normal">
                                    Bolt implemented our streaming optimization suite to <span className="text-foreground font-semibold">reduce buffering by 62% during peak viewing hours.</span>
                                </p>
                                <Link
                                    href="#"
                                    className="text-primary flex items-center font-medium before:absolute before:inset-0">
                                    Read Story
                                    <ChevronRight
                                        className="ml-2 size-3 translate-y-0.5 duration-200 group-hover:translate-x-0.5"
                                        strokeWidth={3}
                                    />
                                </Link>
                            </div>
                        </Card>
                        <Card className="flex items-center justify-center bg-transparent p-6 shadow-none lg:p-12">
                            <Polars className="*:fill-foreground w-18 h-8" />
                        </Card>
                        <Card className="flex items-center justify-center bg-transparent p-6 shadow-none lg:p-12">
                            <Cisco className="*:last:fill-foreground! w-18 h-8" />
                        </Card>
                        <Card className="@3xl:col-span-2 @3xl:row-span-2 group relative col-span-full p-6 shadow-2xl shadow-indigo-900/25 lg:p-12">
                            <div className="max-w-md space-y-12">
                                <Supabase className="h-8 w-36" />
                                <p className="text-3xl font-normal">
                                    Bolt implemented our streaming optimization suite to <span className="text-foreground font-semibold">reduce buffering by 62% during peak viewing hours.</span>
                                </p>
                                <Link
                                    href="#"
                                    className="text-primary flex items-center font-medium before:absolute before:inset-0">
                                    Read Story
                                    <ChevronRight
                                        className="ml-2 size-3 translate-y-0.5 duration-200 group-hover:translate-x-0.5"
                                        strokeWidth={3}
                                    />
                                </Link>
                            </div>
                        </Card>
                        <Card className="flex items-center justify-center bg-transparent p-6 shadow-none lg:p-12">
                            <Hulu className="*:fill-foreground w-18 h-8" />
                        </Card>
                        <Card className="flex items-center justify-center bg-transparent p-6 shadow-none lg:p-12">
                            <Vercel className="*:fill-foreground w-18 h-8" />
                        </Card>
                        <Card className="@3xl:col-start-2 flex items-center justify-center bg-transparent p-6 shadow-none lg:p-12">
                            <Spotify className="*:fill-foreground h-8 w-24" />
                        </Card>
                        <Card className="@3xl:col-start-3 flex items-center justify-center bg-transparent p-6 shadow-none lg:p-12">
                            <Beacon className="*:fill-foreground h-8 w-24" />
                        </Card>
                        <Card className="@3xl:col-start-4 flex items-center justify-center bg-transparent p-6 shadow-none lg:p-12">
                            <Primevideo className="*:fill-foreground h-8 w-24" />
                        </Card>
                        <Card className="@3xl:col-start-3 @3xl:row-start-5 flex items-center justify-center bg-transparent p-6 shadow-none lg:p-12">
                            <LeapWallet className="*:fill-foreground h-8 w-24" />
                        </Card>
                    </div>
                </div>
            </div>
        </section>
    )
}