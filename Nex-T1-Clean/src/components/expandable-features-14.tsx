'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Globe, Bot, Brain } from 'lucide-react'
import { CampaignIllustration } from "@/components/ui/illustrations/campaign-illustration"
import { CollaborationIllustration } from "@/components/ui/illustrations/collaboration-illustration"
import { Notes2Illustration } from "@/components/ui/illustrations/notes-2-illustration"

const features = [
    {
        title: 'AI Models',
        description: 'Switch between LLMs from a unified interface.',
        icon: Brain,
        illustration: <CampaignIllustration />,
        image: 'https://images.unsplash.com/photo-1723869791623-3b6a012f996b?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
        title: 'Global Reach',
        description: 'Collaborate in real time with teammates across the globe.',
        icon: Globe,
        illustration: <CollaborationIllustration />,
        image: 'https://images.unsplash.com/photo-1721111648084-5e4f18a8635c?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
        title: 'Smart Agent',
        description: 'Automate repetitive tasks with context-aware AI agents.',
        icon: Bot,
        illustration: <Notes2Illustration />,
        image: 'https://images.unsplash.com/photo-1770106678115-ec9aa241cdf6?q=80&w=2342&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
]

export default function ExpandableFeatures() {
    const [expandedIndex, setExpandedIndex] = useState<number>(0)

    const handleSelect = (index: number) => {
        if (index === expandedIndex) return
        setExpandedIndex(index)
    }

    return (
        <section className="bg-background @container overflow-hidden py-24">
            <div className="mx-auto my-1 max-w-6xl px-6">
                <div className="mb-12 grid items-end gap-6 md:mb-20 md:grid-cols-2 lg:px-12">
                    <h2 className="text-foreground text-balance text-4xl font-semibold">Ship with confidence using our unified platform</h2>

                    <p className="text-muted-foreground text-balance text-lg">Streamline your workflow with tools designed to enhance productivity at every step.</p>
                </div>

                <div className="mask-b-from-35% mask-b-to-95%">
                    <div className="bg-background relative overflow-hidden rounded-t-2xl px-3 pt-3 sm:px-12 sm:pt-12">
                        <AnimatePresence
                            initial={false}
                            mode="popLayout">
                            <motion.div
                                variants={{
                                    initial: { opacity: 0 },
                                    animate: { opacity: 1 },
                                    exit: { opacity: 0 },
                                }}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.5, type: 'spring', bounce: 0.1 }}
                                className="bg-card *:scale-85 ring-border shadow-black/4 aspect-4/5 relative z-10 flex h-full items-center justify-center overflow-hidden rounded-xl shadow-md ring sm:aspect-square md:aspect-video"
                                key={expandedIndex}>
                                {features[expandedIndex].illustration}
                            </motion.div>
                        </AnimatePresence>

                        <AnimatePresence
                            initial={false}
                            mode="popLayout">
                            <motion.div
                                key={expandedIndex}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className="before:border-foreground/10 absolute inset-0 before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-t-2xl before:border">
                                <div className="dither absolute inset-0 opacity-25 dark:opacity-30">
                                    <Image
                                        src={features[expandedIndex].image}
                                        alt="feature background image"
                                        fill
                                        className="size-full object-cover opacity-50"
                                    />
                                </div>
                                <Image
                                    src={features[expandedIndex].image}
                                    alt="feature background image"
                                    fill
                                    className="size-full object-cover opacity-50"
                                />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                <div className="divide-foreground/10 grid divide-dashed max-sm:divide-y sm:mt-12 sm:grid-cols-3 sm:divide-x lg:px-6">
                    {features.map((feature, index) => (
                        <div
                            key={feature.title}
                            className="group">
                            <div
                                data-expanded={expandedIndex === index}
                                className="not-data-[expanded=true]:opacity-50 not-data-[expanded=true]:hover:opacity-75 group relative max-lg:group-first:pl-0 max-lg:group-last:pr-0 max-sm:py-6 sm:px-6">
                                <button
                                    onClick={() => handleSelect(index)}
                                    className="group flex w-full cursor-pointer items-center gap-3 text-left before:absolute before:inset-0">
                                    <feature.icon className={cn('size-4 shrink-0 transition-colors', expandedIndex === index ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
                                    <h3 className={cn('group-hover:text-foreground font-medium transition-colors', expandedIndex === index ? 'text-foreground' : 'text-muted-foreground')}>{feature.title}</h3>
                                </button>

                                <p className="text-muted-foreground mt-3 text-balance">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}