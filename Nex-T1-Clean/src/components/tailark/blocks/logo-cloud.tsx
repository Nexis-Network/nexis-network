'use client'
import { Beacon } from '@/components/ui/svgs/beaconLogo'
import { Bolt } from '@/components/ui/svgs/boltNew'
import { Cisco } from '@/components/ui/svgs/ciscoLight'
import { Hulu } from '@/components/ui/svgs/hulu'
import { OpenAIFull } from '@/components/ui/svgs/openai'
import { Primevideo } from '@/components/ui/svgs/primeVideo'
import { Stripe } from '@/components/ui/svgs/stripe'
import { Supabase } from '@/components/ui/svgs/supabase'
import { Polars } from '@/components/ui/svgs/polarsLogo'
import { AnimatePresence, motion } from 'motion/react'
import React, { useEffect, useState } from 'react'
import { VercelFull } from '@/components/ui/svgs/vercel'
import { Spotify } from '@/components/ui/svgs/spotify'
import { PayPal } from '@/components/ui/svgs/paypalWordmark'
import { LeapWallet } from '@/components/ui/svgs/leapWalletWordmarkDark'

const aiLogos: React.ReactNode[] = [
    <OpenAIFull
        key="openai"
        height={24}
        width="auto"
    />,
    <Bolt
        key="bolt"
        height={20}
        width="auto"
    />,
    <Cisco
        key="cisco"
        height={32}
        width="auto"
    />,
    <Hulu
        key="hulu"
        height={22}
        width="auto"
    />,
    <Spotify
        key="spotify"
        height={24}
        width="auto"
    />,
]

const hostingLogos: React.ReactNode[] = [
    <Supabase
        key="supabase"
        height={24}
        width="auto"
    />,
    <Cisco
        key="cisco"
        height={32}
        width="auto"
    />,
    <Hulu
        key="hulu"
        height={22}
        width="auto"
    />,
    <Spotify
        key="spotify"
        height={24}
        width="auto"
    />,
    <VercelFull
        key="vercel"
        height={20}
        width="auto"
    />,
]

const paymentsLogos: React.ReactNode[] = [
    <Stripe
        key="stripe"
        height={24}
        width="auto"
    />,
    <PayPal
        key="paypal"
        height={24}
        width="auto"
    />,
    <LeapWallet
        key="leapwallet"
        height={24}
        width="auto"
    />,
    <Beacon
        key="beacon"
        height={20}
        width="auto"
    />,
    <Polars
        key="polars"
        height={24}
        width="auto"
    />,
]

const streamingLogos: React.ReactNode[] = [
    <Primevideo
        key="primevideo"
        height={28}
        width="auto"
    />,
    <Hulu
        key="hulu"
        height={22}
        width="auto"
    />,
    <Spotify
        key="spotify"
        height={24}
        width="auto"
    />,
    <Cisco
        key="cisco"
        height={32}
        width="auto"
    />,
    <Beacon
        key="beacon"
        height={20}
        width="auto"
    />,
]

const logos: Record<'ai' | 'hosting' | 'streaming' | 'payments', React.ReactNode[]> = {
    ai: aiLogos,
    hosting: hostingLogos,
    payments: paymentsLogos,
    streaming: streamingLogos,
}

type LogoGroup = keyof typeof logos

export default function LogoCloudTwo() {
    const [currentGroup, setCurrentGroup] = useState<LogoGroup>('ai')

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentGroup((prev) => {
                const groups = Object.keys(logos) as LogoGroup[]
                const currentIndex = groups.indexOf(prev)
                const nextIndex = (currentIndex + 1) % groups.length
                return groups[nextIndex]
            })
        }, 2500)

        return () => clearInterval(interval)
    }, [])

    return (
        <section
            data-theme="dark"
            className="bg-background pb-16">
            <div className="mx-auto max-w-5xl px-6">
                <div className="mx-auto mb-12 max-w-xl text-balance text-center md:mb-16">
                    <p
                        data-current={currentGroup}
                        className="text-muted-foreground text-lg">
                        Tailark is trusted by leading teams from <span className="in-data-[current=ai]:text-foreground transition-colors duration-200">Generative AI Companies,</span> <span className="in-data-[current=hosting]:text-foreground transition-colors duration-200">Hosting Providers,</span> <span className="in-data-[current=payments]:text-foreground transition-colors duration-200">Payments Providers,</span>{' '}
                        <span className="in-data-[current=streaming]:text-foreground transition-colors duration-200">Streaming Providers</span>
                    </p>
                </div>
                <div className="perspective-dramatic mx-auto grid max-w-5xl grid-cols-3 items-center gap-8 md:h-10 md:grid-cols-5">
                    <AnimatePresence
                        initial={false}
                        mode="popLayout">
                        {logos[currentGroup].map((logo, i) => (
                            <motion.div
                                key={`${currentGroup}-${i}`}
                                className="**:fill-foreground! flex items-center justify-center"
                                initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -24, filter: 'blur(6px)', scale: 0.5 }}
                                transition={{ delay: i * 0.05, duration: 0.4 }}>
                                {logo}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    )
}