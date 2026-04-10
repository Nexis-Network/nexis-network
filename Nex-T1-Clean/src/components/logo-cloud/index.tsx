'use client';

import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useState } from 'react';

import { BeaconLogo as Beacon } from '../ui/svgs/beaconLogo';
import { BoltNew as Bolt } from '../ui/svgs/boltNew';
import { CiscoLight as Cisco } from '../ui/svgs/ciscoLight';
import { Hulu } from '../ui/svgs/hulu';
import { OpenaiWordmarkLight as OpenAIFull } from '../ui/svgs/openaiWordmarkLight';
import { PrimeVideo as Primevideo } from '../ui/svgs/primeVideo';
import { Stripe } from '../ui/svgs/stripe';
import { SupabaseWordmarkDark as Supabase } from '../ui/svgs/supabaseWordmarkDark';
import { PolarsLogo as Polars } from '../ui/svgs/polarsLogo';
import { VercelWordmark as VercelFull } from '../ui/svgs/vercelWordmark';
import { SpotifyWordmark as Spotify } from '../ui/svgs/spotifyWordmark';
import { PaypalWordmark as PayPal } from '../ui/svgs/paypalWordmark';
import { LeapWalletWordmarkDark as LeapWallet } from '../ui/svgs/leapWalletWordmarkDark';

const logoStyle = { width: 'auto' } as const;

const aiLogos: React.ReactNode[] = [
    <OpenAIFull
        key="openai"
        height={24}
        style={logoStyle}
    />,
    <Bolt
        key="bolt"
        height={20}
        style={logoStyle}
    />,
    <Cisco
        key="cisco-ai"
        height={32}
        style={logoStyle}
    />,
    <Hulu
        key="hulu-ai"
        height={22}
        style={logoStyle}
    />,
    <Spotify
        key="spotify-ai"
        height={24}
        style={logoStyle}
    />,
]

const hostingLogos: React.ReactNode[] = [
    <Supabase
        key="supabase"
        height={24}
        style={logoStyle}
    />,
    <Cisco
        key="cisco-hosting"
        height={32}
        style={logoStyle}
    />,
    <Hulu
        key="hulu-hosting"
        height={22}
        style={logoStyle}
    />,
    <Spotify
        key="spotify-hosting"
        height={24}
        style={logoStyle}
    />,
    <VercelFull
        key="vercel"
        height={20}
        style={logoStyle}
    />,
]

const paymentsLogos: React.ReactNode[] = [
    <Stripe
        key="stripe"
        height={24}
        style={logoStyle}
    />,
    <PayPal
        key="paypal"
        height={24}
        style={logoStyle}
    />,
    <LeapWallet
        key="leapwallet"
        height={24}
        style={logoStyle}
    />,
    <Beacon
        key="beacon"
        height={20}
        style={logoStyle}
    />,
    <Polars
        key="polars"
        height={24}
        style={logoStyle}
    />,
]

const streamingLogos: React.ReactNode[] = [
    <Primevideo
        key="primevideo"
        height={28}
        style={logoStyle}
    />,
    <Hulu
        key="hulu-streaming"
        height={22}
        style={logoStyle}
    />,
    <Spotify
        key="spotify-streaming"
        height={24}
        style={logoStyle}
    />,
    <Cisco
        key="cisco-streaming"
        height={32}
        style={logoStyle}
    />,
    <Beacon
        key="beacon-streaming"
        height={20}
        style={logoStyle}
    />,
]

const logos: Record<'ai' | 'hosting' | 'streaming' | 'payments', React.ReactNode[]> = {
    ai: aiLogos,
    hosting: hostingLogos,
    payments: paymentsLogos,
    streaming: streamingLogos,
}

type LogoGroup = keyof typeof logos

export function LogoCloud() {
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
            className="bg-[#09090b] pb-16 text-[#f4f4f4]">
            <div className="mx-auto max-w-5xl px-6">
                <div className="mx-auto mb-12 max-w-xl text-balance text-center md:mb-16">
                    <p
                        data-current={currentGroup}
                        className="text-[#a1a1aa] text-lg">
                        Nex-T1 powers autonomous runbooks for <span className="in-data-[current=ai]:text-[#f4f4f4] transition-colors duration-200">Generative AI treasuries,</span>{' '}
                        <span className="in-data-[current=hosting]:text-[#f4f4f4] transition-colors duration-200">Global Infrastructure Platforms,</span>{' '}
                        <span className="in-data-[current=payments]:text-[#f4f4f4] transition-colors duration-200">Next-gen Payment Networks,</span>{' '}
                        <span className="in-data-[current=streaming]:text-[#f4f4f4] transition-colors duration-200">and Streaming Marketplaces</span>
                    </p>
                </div>
                <div className="perspective-dramatic mx-auto grid max-w-5xl grid-cols-3 items-center gap-8 md:h-10 md:grid-cols-5">
                    <AnimatePresence
                        initial={false}
                        mode="popLayout">
                        {logos[currentGroup].map((logo, i) => (
                            <motion.div
                                key={`${currentGroup}-${i}`}
                                className="**:fill-foreground! mask-b-from-55% flex h-10 items-center justify-center"
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
