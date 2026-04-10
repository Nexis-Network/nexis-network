'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useState, useEffect, useRef, useCallback } from 'react'
import Notes2Illustration from "@/components/ui/illustrations/notes-2-illustration"
import { AnimatePresence, motion } from 'motion/react'
import AgentTaskPlanningIllustration from "@/components/ui/illustrations/agent-task-planning-illustration"
import Calendar6Illustration from "@/components/ui/illustrations/calendar-6-illustration"

const AUTOPLAY_DURATION = 6000

const features = [
    {
        title: 'AI Models',
        description: 'Access and switch between multiple AI models including GPT, Claude, and Gemini from a unified interface with seamless provider switching.',
        illustration: <Notes2Illustration key="m3" />,
        image: 'https://images.unsplash.com/photo-1664398557235-f2a18403f68a?q=80&w=2338&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
        title: 'Global Reach',
        description: 'Work with teammates across the globe with real-time presence indicators, seamless syncing, and automatic conflict resolution.',
        illustration: <Calendar6Illustration key="map" />,
        image: 'https://images.unsplash.com/photo-1721111648084-5e4f18a8635c?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
        title: 'Smart Agent',
        description: 'Deploy intelligent agents that learn your workflow patterns and automate repetitive tasks with context-aware suggestions.',
        illustration: <AgentTaskPlanningIllustration key="m4" />,
        image: 'https://images.unsplash.com/photo-1770106678115-ec9aa241cdf6?q=80&w=2342&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
]

export default function ExpandableFeatures() {
    const [expandedIndex, setExpandedIndex] = useState<number>(0)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const resetTimer = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = setInterval(() => {
            setExpandedIndex((current) => (current + 1) % features.length)
        }, AUTOPLAY_DURATION)
    }, [])

    useEffect(() => {
        resetTimer()
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [resetTimer])

    const handleSelect = (index: number) => {
        if (index === expandedIndex) return
        setExpandedIndex(index)
        resetTimer()
    }

    return (
        <section className="bg-background @container overflow-hidden py-24">
            <div className="mx-auto max-w-6xl px-6 lg:px-12">
                <div className="grid gap-6 sm:grid-cols-2 sm:gap-12 lg:grid-cols-3">
                    <div className="grid pt-6 max-lg:row-span-2 max-lg:grid-rows-subgrid lg:pb-6">
                        <div className="text-balance">
                            <h2 className="text-foreground text-4xl font-medium">Ship with confidence using Tailark engine</h2>
                            <p className="text-muted-foreground mt-6 text-lg">Streamline your workflow with tools designed to enhance productivity at every step.</p>
                        </div>

                        <div className="-ml-6 mt-auto flex flex-col">
                            {features.map((feature, index) => (
                                <button
                                    key={feature.title}
                                    onClick={() => handleSelect(index)}
                                    className={cn('active:scale-98 relative flex cursor-pointer items-center gap-2 py-2 pr-6 text-left text-sm font-medium duration-200', expandedIndex === index ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/75')}>
                                    <div className="size-4">{expandedIndex === index && <Loader isActive={expandedIndex === index} />}</div>

                                    {feature.title}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="relative grid max-lg:row-span-2 max-lg:grid-rows-subgrid lg:col-span-2 lg:grid-cols-7 lg:gap-0">
                        <div className="relative lg:col-span-4">
                            <div
                                aria-hidden
                                className="mask-x-from-45% border-foreground/15 pointer-events-none absolute -inset-x-1 -inset-y-8 rotate-45 border-y border-dashed"
                            />
                            <div
                                aria-hidden
                                className="mask-y-from-75% border-foreground/15 pointer-events-none absolute -inset-x-1 -inset-y-24 border-x border-dashed"
                            />

                            <div className="corner-tr-bevel corner-bl-bevel bg-muted aspect-4/5 lg:aspect-3/4 relative overflow-hidden rounded-xl rounded-bl-[3rem] rounded-tr-[3rem] lg:h-full">
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
                                        className="scale-85 relative z-10 flex h-full items-center justify-center"
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
                                        className="absolute inset-0">
                                        <Image
                                            src={features[expandedIndex].image}
                                            alt="feature background image"
                                            fill
                                            className="size-full object-cover opacity-75 dark:opacity-50"
                                        />
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                        <div className="flex flex-col justify-center gap-3 lg:col-span-3 lg:pl-12">
                            <h3 className="text-foreground text-lg font-medium">{features[expandedIndex].title}</h3>
                            <p className="text-muted-foreground text-balance text-sm">{features[expandedIndex].description}</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

const r = 10
const circumference = 2 * Math.PI * r

const Loader = ({ isActive = false }: { isActive?: boolean }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        opacity={isActive ? 1 : 0}
        className="size-4">
        <circle
            cx="12"
            cy="12"
            r={r}
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.1"
        />
        <circle
            cx="12"
            cy="12"
            r={r}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            transform="rotate(-90 12 12)"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}>
            <animate
                attributeName="stroke-dashoffset"
                from={circumference}
                to={0}
                dur={`${AUTOPLAY_DURATION}ms`}
                fill="freeze"
            />
        </circle>
    </svg>
)