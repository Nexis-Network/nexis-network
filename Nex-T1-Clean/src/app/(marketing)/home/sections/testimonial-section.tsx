import { Quote } from 'lucide-react'
import { MESCHAC_AVATAR } from '@/lib/const'

export function TestimonialSection() {
    return (
        <section className="py-16 md:py-32">
            <div className="mx-auto max-w-5xl px-6">
                <div className="mx-auto max-w-2xl">
                    <Quote className="fill-card stroke-card size-5 drop-shadow-md" />
                    <p className="my-12 text-lg font-medium sm:text-xl md:text-3xl md:leading-10">Using Tailark has been like unlocking a secret design superpower. It&apos;s the perfect fusion of simplicity and versatility, enabling us to create UIs that are as stunning as they are user-friendly.</p>

                    <div className="grid grid-cols-[auto_1fr] items-center gap-3 pl-px">
                        <div className="ring-foreground/10 aspect-square size-12 overflow-hidden rounded-xl border border-transparent shadow-md shadow-black/15 ring-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={MESCHAC_AVATAR}
                                alt="Avatar of Méschac"
                                loading="lazy"
                                width={460}
                                height={460}
                            />
                        </div>
                        <div className="space-y-0.5 text-base *:block">
                            <span className="text-foreground font-medium">Méschac Ngandu</span>
                            <span className="text-muted-foreground text-sm">UI Engineer</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}