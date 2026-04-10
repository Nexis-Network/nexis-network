import { CallToAction } from '@/components/call-to-action'
import { MainCustomers } from '@/app/(marketing-v2)/customers/sections/main-customers'
import { Customers } from '@/app/(marketing-v2)/customers/sections/customers'
import { WallOfLoveSection } from '@/app/(marketing-v2)/customers/sections/wall-of-love'

export default function PricingPage() {
    return (
        <>
            <section
                id="home"
                className="bg-muted/50">
                <div className="relative mx-auto max-w-5xl px-6 pt-32 text-center sm:pt-44">
                    <div className="mx-auto max-w-2xl text-center">
                        <h1 className="text-foreground text-balance text-5xl font-semibold sm:text-6xl lg:tracking-tight">Companies building with Tailark</h1>
                        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-balance text-lg">Tailark is trusted by over 100 companies to help them scale their business and stay ahead of the competition.</p>
                    </div>
                </div>
            </section>
            <MainCustomers />
            <Customers />
            <WallOfLoveSection />
            <CallToAction />
        </>
    )
}