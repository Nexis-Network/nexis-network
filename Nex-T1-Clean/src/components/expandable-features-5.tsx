'use client'

import { cn } from '@/lib/utils'
import { useState } from 'react'
import Notes2Illustration from "@/components/ui/illustrations/notes-2-illustration"
import Calendar10Illustration from "@/components/ui/illustrations/calendar-10-illustration"
import { AnimatePresence, motion } from 'motion/react'
import AgentTaskPlanningIllustration from "@/components/ui/illustrations/agent-task-planning-illustration"
import { Brain, Globe, Bot } from 'lucide-react'
import Image from 'next/image'

const features = [
    {
        title: 'AI Models',
        description: 'Access and switch between multiple AI models including GPT, Claude, and Gemini from a unified interface with seamless provider switching.',
        image: 'https://images.unsplash.com/photo-1723873591148-342982be8bca?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        icon: Brain,
    },
    {
        title: 'Global Reach',
        description: 'Work with teammates across the globe with real-time presence indicators, seamless syncing, and automatic conflict resolution.',
        image: 'https://images.unsplash.com/photo-1721111648084-5e4f18a8635c?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        icon: Globe,
    },
    {
        title: 'Smart Agent',
        description: 'Deploy intelligent agents that learn your workflow patterns and automate repetitive tasks with context-aware suggestions.',
        image: 'https://images.unsplash.com/photo-1770106678115-ec9aa241cdf6?q=80&w=2342&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        icon: Bot,
    },
]

const illustrations = [<Notes2Illustration key="m3" />, <Calendar10Illustration key="map" />, <AgentTaskPlanningIllustration key="m4" />]

export default function ExpandableFeatures() {
    const [expandedIndex, setExpandedIndex] = useState<number>(0)

    const handleSelect = (index: number) => {
        if (index === expandedIndex) return
        setExpandedIndex(index)
    }

    return (
        <section className="bg-background @container overflow-hidden py-24">
            <div className="mx-auto max-w-5xl">
                <div className="mb-12 grid items-end gap-6 text-balance px-6 md:mb-16 md:grid-cols-2">
                    <h2 className="text-foreground max-w-lg text-3xl font-semibold lg:text-4xl">Ship with confidence using our unified platform</h2>
                    <p className="text-muted-foreground text-lg">Streamline your workflow with tools designed to enhance productivity at every step.</p>
                </div>

                <div className="relative max-sm:pr-1 sm:pl-1 md:px-4">
                    <div className="lg:bottom-22 pl-6 max-sm:pb-6 sm:absolute sm:bottom-20 sm:left-0 sm:z-20 sm:pl-8 sm:pt-4 md:bottom-14 md:pl-6 lg:pl-10">
                        <div className="mt-auto flex flex-col">
                            {features.map((feature, index) => (
                                <button
                                    key={feature.title}
                                    onClick={() => handleSelect(index)}
                                    className={cn('active:scale-98 relative flex w-fit cursor-pointer items-center gap-2.5 pb-3 pt-2 text-left text-sm font-medium duration-200 md:px-6', expandedIndex === index ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/75')}>
                                    <feature.icon className="size-4" />
                                    {feature.title}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mask-[url(/illustration-mask.svg)] mask-cover max-sm:mask-right md:mask-contain mask-no-repeat relative">
                        <div className="absolute inset-0">
                            <AnimatePresence
                                initial={false}
                                mode="popLayout">
                                <motion.div
                                    variants={{
                                        initial: { opacity: 0, scale: 0.95, filter: 'blur(4px)' },
                                        animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
                                        exit: { opacity: 0, scale: 0.95, filter: 'blur(4px)' },
                                    }}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={{ duration: 0.5, type: 'spring', bounce: 0.1 }}
                                    className="scale-80 relative z-10 flex h-full items-center justify-center"
                                    key={expandedIndex}>
                                    {illustrations[expandedIndex]}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <AnimatePresence
                            initial={false}
                            mode="popLayout">
                            <motion.div
                                key={expandedIndex}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className="@max-xl:aspect-5/7 aspect-6/5 pointer-events-none md:aspect-video">
                                <Image
                                    src={features[expandedIndex].image}
                                    alt={features[expandedIndex].title}
                                    fill
                                    sizes={'min'}
                                    className="bg-muted size-full object-cover opacity-75 dark:opacity-50"
                                />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    )
}