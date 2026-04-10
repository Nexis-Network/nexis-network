import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CtaIllustration } from '@/components/illustrations/cta-illustration'

export function CallToAction() {
    return (
        <section className="relative border-b">
            <div className="mask-b-from-65% absolute inset-0">
                <CtaIllustration />
            </div>
            <div className="relative mx-auto max-w-5xl px-6">
                <div className="relative overflow-hidden p-8 md:px-32 md:py-20">
                    <div className="relative text-center">
                        <h2 className="text-balance text-4xl font-semibold md:text-5xl">Create, Sell and Grow</h2>
                        <p className="text-muted-foreground mb-6 mt-4 text-balance">Join a community of over 1000+ companies and developers who have already discovered the power of Tailark. </p>

                        <Button asChild>
                            <Link href="#">Contact Sales</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}