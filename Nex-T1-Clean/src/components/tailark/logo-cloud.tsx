import { BeaconLogo as Beacon } from '@/components/ui/svgs/beaconLogo'
import { Hulu } from '@/components/ui/svgs/hulu'
import { Stripe } from '@/components/ui/svgs/stripe'
import { SupabaseWordmarkDark as Supabase } from '@/components/ui/svgs/supabaseWordmarkDark'
import { VercelWordmark as VercelFull } from '@/components/ui/svgs/vercelWordmark'
import { SpotifyWordmark as Spotify } from '@/components/ui/svgs/spotifyWordmark'
import { TailwindcssWordmark as TailwindCSS } from '@/components/ui/svgs/tailwindcssWordmark'

import { cn } from '@/lib/utils'
import Link from 'next/link'

export function LogoCloud({ verticalAligned }: { verticalAligned?: boolean }) {
    return (
        <div className={cn('relative py-24', verticalAligned && 'py-6')}>
            <div className="mx-auto max-w-5xl px-6">
                <div className={cn('grid items-center gap-12 lg:grid-cols-[auto_1fr] lg:gap-6', verticalAligned && 'mx-auto max-w-3xl lg:grid-cols-1 lg:gap-12')}>
                    <div className={cn('space-y-4 max-lg:text-center', verticalAligned && 'mx-auto max-w-md text-center')}>
                        <p className="text-foreground w-fit max-w-sm text-balance text-xl max-lg:mx-auto">Trusted by fast-growing companies around the world</p>

                        <Link
                            href="#"
                            className="text-primary text-sm underline">
                            Read case studies
                        </Link>
                    </div>
                    <div className="**:fill-foreground grid grid-cols-3 items-center gap-y-12 sm:grid-cols-4">
                        <div className="flex h-full items-center justify-center px-2">
                            <Hulu
                                height={16}
                                width="auto"
                            />
                        </div>

                        <div className="flex items-center justify-center px-2">
                            <Spotify
                                height={22}
                                width="auto"
                            />
                        </div>
                        <div className="flex items-center justify-center px-2">
                            <Supabase
                                height={20}
                                width="auto"
                            />
                        </div>
                        <div className="flex items-center justify-center px-2">
                            <Beacon
                                height={16}
                                width="auto"
                            />
                        </div>
                        <div className="flex items-center justify-center px-2">
                            <VercelFull
                                height={16}
                                width="auto"
                            />
                        </div>

                        <div className="flex items-center justify-center px-2">
                            <Stripe
                                height={20}
                                width="auto"
                            />
                        </div>
                        <div className="flex items-center justify-center px-2">
                            <TailwindCSS
                                height={20}
                                width="auto"
                            />
                        </div>
                        <div className="flex items-center justify-center px-2">
                            <Stripe
                                height={20}
                                width="auto"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}