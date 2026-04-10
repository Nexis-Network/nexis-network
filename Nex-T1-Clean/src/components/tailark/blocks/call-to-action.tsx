import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { LayoutIllustration } from "@/components/tailark/blocks/layout-illustration"

export default function CallToAction() {
    return (
        <section className="bg-muted py-12 md:py-24">
            <div className="mx-auto max-w-5xl px-6">
                <Card className="relative overflow-hidden pl-8 pt-8 shadow-lg md:p-20">
                    <div className="max-w-xl max-md:pr-8">
                        <div className="relative">
                            <h2 className="text-balance text-3xl font-semibold md:text-4xl">Create, Sell and Grow</h2>
                            <p className="text-muted-foreground mb-6 mt-4 text-balance">Join a community of over 1000+ companies and developers who have already discovered the power of Tailark. </p>

                            <Button asChild>
                                <Link href="#">Contact Sales</Link>
                            </Button>
                        </div>
                    </div>
                    <div className="max-lg:mask-b-from-35% max-lg:pt-6 max-md:mt-4 lg:absolute lg:inset-0 lg:top-12 lg:ml-auto lg:w-2/5">
                        <LayoutIllustration />
                    </div>
                </Card>
            </div>
        </section>
    )
}