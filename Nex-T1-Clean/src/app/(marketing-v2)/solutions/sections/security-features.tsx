import { Check, Clock, Globe, Scale, ShieldCheck } from 'lucide-react'
import { Container } from '@/components/container'
import { FeatureCard, FeatureCardContent } from '@/components/ui/feature-card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { SecurityAuditIllustration } from '@/components/illustrations/security-shield'

const subFeatures = [
    {
        icon: ShieldCheck,
        title: 'SOC 2 Type II',
        description: 'Independently audited controls for security, availability, and confidentiality.',
    },
    {
        icon: Clock,
        title: '99.99% Uptime SLA',
        description: 'Guaranteed availability backed by financially binding service-level agreements.',
    },
    {
        icon: Scale,
        title: 'GDPR Compliant',
        description: 'Full data protection compliance with built-in consent management and DPAs.',
    },
    {
        icon: Globe,
        title: 'ISO 27001',
        description: 'Certified information security management across all infrastructure and processes.',
    },
]

export function SecurityFeatures() {
    return (
        <section>
            <Container className="py-16 lg:py-24">
                <div className="mx-auto max-w-2xl space-y-6 text-center">
                    <h2 className="text-foreground text-balance text-4xl font-semibold lg:text-5xl">Enterprise-Grade Security</h2>
                    <p className="text-muted-foreground text-balance text-lg">Protect your data with infrastructure built for the most demanding security and compliance standards from day one.</p>
                </div>
            </Container>
            <Container asGrid>
                <div className="@2xl:grid-cols-2 @4xl:grid-cols-10 grid gap-px">
                    <div
                        aria-hidden
                        className="@max-4xl:hidden">
                        <div data-grid-content />
                    </div>
                    <div className="@4xl:col-span-4">
                        <FeatureCard className="@4xl:col-span-2 col-span-full grid-rows-1">
                            <FeatureCardContent className="@4xl:pb-12 flex h-full flex-col space-y-6">
                                <div className="bg-card ring-foreground/3 flex size-12 rounded-full shadow-xl shadow-black/5 ring-1">
                                    <ShieldCheck className="text-muted-foreground m-auto size-4" />
                                </div>
                                <h3 className="text-3xl font-semibold">Zero-Trust Architecture</h3>
                                <p className="text-muted-foreground text-balance">Every request is verified, every access is logged, and every connection is encrypted — no implicit trust, ever.</p>
                                <ul className="w-full space-y-2">
                                    {['Role-Based Access Controls', 'Automated Security Audits', 'Real-Time Incident Response'].map((feature, index) => (
                                        <li
                                            key={index}
                                            className="text-muted-foreground flex items-center gap-2">
                                            <Check className="size-4 text-emerald-500" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="mt-auto w-fit">
                                    <Link href="#">Learn more</Link>
                                </Button>
                            </FeatureCardContent>
                        </FeatureCard>
                    </div>
                    <div
                        data-grid-content
                        className="@4xl:col-span-4 @max-4xl:py-12 group flex items-center justify-center [--color-primary:var(--color-indigo-500)]">
                        <SecurityAuditIllustration />
                    </div>
                    <div
                        aria-hidden
                        className="@max-4xl:hidden">
                        <div data-grid-content />
                    </div>
                </div>
            </Container>
            <Container
                asGrid
                className="@4xl:**:data-grid-content:p-8 **:data-grid-content:p-6 @5xl:**:data-grid-content:p-12 @4xl:grid-cols-10 grid-cols-2">
                <div
                    aria-hidden
                    className="@max-4xl:hidden">
                    <div data-grid-content />
                </div>
                <div className="@4xl:grid-cols-3 @sm:grid-cols-2 col-span-8 grid gap-px">
                    {subFeatures.map((feature, index) => (
                        <div
                            key={index}
                            className="@4xl:last:hidden">
                            <div
                                data-grid-content
                                className="space-y-3">
                                <feature.icon className="size-4" />
                                <h3 className="mt-3 font-medium">{feature.title}</h3>
                                <p className="text-muted-foreground line-clamp-2 text-sm">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div
                    aria-hidden
                    className="@max-4xl:hidden">
                    <div data-grid-content />
                </div>
            </Container>
        </section>
    )
}