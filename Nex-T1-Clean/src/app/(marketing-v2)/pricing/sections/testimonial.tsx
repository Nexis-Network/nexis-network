import { Container } from '@/components/container'
import { Quote } from 'lucide-react'
import { Stripe } from '@/components/ui/svgs/stripe'
import { MESCHAC_AVATAR } from '@/lib/const'

export const Testimonial = () => {
    return (
        <section>
            <Container className="**:data-[slot=content]:bg-background max-lg:**:data-[slot=content]:px-6 **:data-[slot=content]:py-0 border-dashed">
                <div className="mx-auto max-w-2xl py-12 lg:pt-16">
                    <Quote
                        aria-hidden
                        className="fill-background stroke-background size-6 drop-shadow-sm"
                    />
                    <Stripe className="mt-6 h-auto w-16" />
                    <div className="mt-6">
                        <p className='text-xl *:leading-relaxed before:mr-1 before:content-["\201C"] after:ml-1 after:content-["\201D"] md:text-2xl'>Using Tailark has been like unlocking a secret design superpower. It's the perfect fusion of simplicity and versatility, enabling us to create UIs that are as stunning as they are user-friendly.</p>

                        <div className="mt-12 flex items-center gap-3">
                            <div className="ring-foreground/10 aspect-square size-10 overflow-hidden rounded-lg border border-transparent shadow-md shadow-black/15 ring-1">
                                <img
                                    src={MESCHAC_AVATAR}
                                    alt="Méschac Irung"
                                    loading="lazy"
                                    width={460}
                                    height={460}
                                />
                            </div>
                            <div className="space-y-px">
                                <p className="text-sm font-medium">Méschac Irung</p>
                                <p className="text-muted-foreground text-xs">Founder & CEO, Stripe</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
            <Container
                aria-hidden
                className="**:data-[slot=content]:py-12 border-dashed">
                <div />
            </Container>
        </section>
    )
}