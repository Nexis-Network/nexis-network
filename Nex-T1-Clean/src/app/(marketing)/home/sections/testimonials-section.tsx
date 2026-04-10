import { Testimonials } from '@/components/tailark/testimonials'

export function TestimonialsSection() {
    return (
        <section className="py-24">
            <div className="mx-auto w-full max-w-5xl px-6">
                <div className="mx-auto mb-16 max-w-2xl space-y-6 text-center">
                    <span className="text-primary font-mono text-sm uppercase">Testimonials</span>
                    <h2 className="text-foreground mt-8 text-balance text-4xl font-semibold md:text-5xl">What our customers are saying about Tailark Quartz</h2>
                    <p className="text-muted-foreground text-balance text-lg">Join the increasing number of customers and advocates who rely on Tailark for seamless and effective user A/B testing.</p>
                </div>

                <Testimonials />
            </div>
        </section>
    )
}