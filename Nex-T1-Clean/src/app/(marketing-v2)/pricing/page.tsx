import { Pricing } from '@/app/(marketing-v2)/pricing/sections/pricing'
import { Testimonial } from '@/app/(marketing-v2)/pricing/sections/testimonial'
import { Comparator } from '@/app/(marketing-v2)/pricing/sections/comparator'
import { FAQs } from '@/app/(marketing-v2)/pricing/sections/faqs'

export default function PricingPage() {
    return (
        <>
            <section
                id="home"
                className="bg-muted/50">
                <div className="relative mx-auto max-w-5xl px-6 pt-32 text-center sm:pt-44">
                    <div className="mx-auto max-w-2xl text-center">
                        <h1 className="text-foreground text-balance text-5xl font-semibold sm:text-6xl lg:tracking-tight">Pricing that scale with your business</h1>
                        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-balance text-lg">Choose the perfect plan for your needs and start optimizing your workflow today</p>
                    </div>
                </div>
            </section>
            <Pricing />
            <Testimonial />
            <Comparator />
            <FAQs />
        </>
    )
}