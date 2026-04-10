import { LogoIcon } from '@/components/brand/logo'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { InfiniteSlider } from '@/components/motion-primitives/infinite-slider'
import VSCode from '@/components/ui/svgs/vs-code'
import Windsurf from '@/components/ui/svgs/windsurf'
import { ClaudeAI } from '@/components/ui/svgs/claude'
import { OpenAI } from '@/components/ui/svgs/openai'
import { Vercel } from '@/components/ui/svgs/vercel'
import { Linear } from '@/components/ui/svgs/linear'
import Gemini from '@/components/ui/svgs/gemini'
import Replit from '@/components/ui/svgs/replit'
import VSCodium from '@/components/ui/svgs/vsCodium'
import MagicUI from '@/components/ui/svgs/magicUI'
import GooglePaLM from '@/components/ui/svgs/googlePaLM'
import MediaWiki from '@/components/ui/svgs/mediaWiki'

export default function IntegrationsSection() {
    return (
        <section className="bg-background">
            <div className="bg-muted/50 py-24">
                <div className="perspective-dramatic group mx-auto max-w-5xl px-6">
                    <div className="rotate-x-6 hover:rotate-x-0 mask-radial-from-70% mask-radial-[50%_90%] group relative mx-auto max-w-2xl scale-y-90 items-center justify-between space-y-6 from-transparent pb-1 transition-transform duration-1000 hover:scale-y-100">
                        <div className="mask-radial-to-55% absolute inset-0 bg-[radial-gradient(var(--color-foreground)_1px,transparent_1px)] opacity-25 [background-size:16px_16px]" />
                        <div>
                            <InfiniteSlider
                                gap={56}
                                speed={20}
                                speedOnHover={10}>
                                <IntegrationCard>
                                    <VSCode />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <MediaWiki />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Windsurf />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <ClaudeAI />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <OpenAI />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <MagicUI />
                                </IntegrationCard>
                            </InfiniteSlider>
                        </div>

                        <div>
                            <InfiniteSlider
                                gap={56}
                                speed={20}
                                speedOnHover={10}
                                reverse>
                                <IntegrationCard>
                                    <Gemini />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Linear />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Vercel />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <MagicUI />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <VSCodium />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <GooglePaLM />
                                </IntegrationCard>
                            </InfiniteSlider>
                        </div>
                        <div>
                            <InfiniteSlider
                                gap={56}
                                speed={15}
                                speedOnHover={10}>
                                <IntegrationCard>
                                    <Replit />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <MagicUI />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Gemini />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <VSCodium />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <MediaWiki />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <GooglePaLM />
                                </IntegrationCard>
                            </InfiniteSlider>
                        </div>
                        <div className="absolute inset-0 m-auto flex size-fit -translate-y-3.5 justify-center gap-2">
                            <IntegrationCard
                                className="ring-foreground/50 relative size-24 rounded-2xl border border-white/20 bg-zinc-700/50 shadow-xl shadow-black/20 ring-1 backdrop-blur-lg backdrop-blur-md"
                                isCenter={true}>
                                <LogoIcon
                                    _uniColor
                                    className="text-white drop-shadow-sm"
                                />
                            </IntegrationCard>
                        </div>
                    </div>
                    <div className="mx-auto mt-12 max-w-xl text-center">
                        <h2 className="text-balance text-3xl font-semibold md:text-5xl">Seamlessly Integrate with your favorite Tools</h2>
                        <p className="text-muted-foreground mb-6 mt-4 text-balance">Connect seamlessly with popular platforms and services to enhance your workflow.</p>

                        <Button
                            size="sm"
                            asChild
                            variant="outline">
                            <Link href="#">Get Started</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}

const IntegrationCard = ({ children, className, isCenter = false }: { children: React.ReactNode; className?: string; position?: 'left-top' | 'left-middle' | 'left-bottom' | 'right-top' | 'right-middle' | 'right-bottom'; isCenter?: boolean }) => {
    return (
        <div
            aria-hidden
            className={cn('bg-card relative z-20 flex size-20 rounded-xl border', className)}>
            <div className={cn('m-auto size-fit *:size-8', isCenter && '*:size-8')}>{children}</div>
        </div>
    )
}