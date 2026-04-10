import { SpotifyWordmark as Spotify } from '@/components/ui/svgs/spotifyWordmark'
import { Hulu } from '@/components/ui/svgs/hulu'
import { SupabaseWordmarkDark as Supabase } from '@/components/ui/svgs/supabaseWordmarkDark'
import { BeaconLogo } from '@/components/ui/svgs/beaconLogo'
import { Stripe } from '@/components/ui/svgs/stripe'
import { VercelWordmark as VercelFull } from '@/components/ui/svgs/vercelWordmark'
import { Cloudflare } from '@/components/ui/svgs/cloudflare'
import { OpenaiWordmarkLight as OpenAIFull } from '@/components/ui/svgs/openaiWordmarkLight'
import { Container, Separator } from '@/components/tailark/container'

export function LogoCloud() {
    return (
        <section>
            <Container asGrid>
                <div>
                    <div
                        data-grid-content
                        className="p-12 text-center">
                        <p className="text-muted-foreground mx-auto max-w-xl text-balance md:text-lg">Tailark is trusted by leading teams from Generative AI Companies, Hosting Providers, Payments Providers, Streaming Providers</p>
                    </div>
                </div>

                <div className="**:fill-foreground *:bg-card/75 grid grid-cols-2 items-center justify-center gap-px p-[0.5px] *:h-20 sm:grid-cols-4">
                    <div className="flex items-center justify-center px-6">
                        <Hulu
                            height={20}
                            width="auto"
                        />
                    </div>

                    <div className="flex items-center justify-center px-6">
                        <Spotify
                            height={26}
                            width="auto"
                        />
                    </div>
                    <div className="flex items-center justify-center px-6">
                        <Supabase
                            height={24}
                            width="auto"
                        />
                    </div>
                    <div className="flex items-center justify-center px-6">
                        <BeaconLogo
                            height={20}
                            width="auto"
                        />
                    </div>
                    <div className="flex items-center justify-center px-6">
                        <VercelFull
                            height={20}
                            width="auto"
                        />
                    </div>

                    <div className="flex items-center justify-center px-6">
                        <Stripe
                            height={26}
                            width="auto"
                        />
                    </div>
                    <div className="flex items-center justify-center px-6">
                        <OpenAIFull
                            height={24}
                            width="auto"
                        />
                    </div>
                    <div className="flex items-center justify-center px-6">
                        <Cloudflare
                            height={20}
                            width="auto"
                        />
                    </div>
                </div>
            </Container>
            <Separator />
        </section>
    )
}