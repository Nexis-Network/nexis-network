'use client'

import { cn } from '@/lib/utils'
import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion, LayoutGroup } from 'motion/react'
import { ChevronDown, ChevronUp, PlusCircle } from 'lucide-react'
import { ServerIllustration } from "@/components/ui/illustrations/server-illustration"
import { Button } from '@/components/ui/button'

const AUTOPLAY_DURATION = 7000

const features = [
    {
        title: 'AI Model Hub',
        description: 'Access and switch between multiple AI models from a unified interface with seamless provider switching.',
    },
    {
        title: 'Global Collaboration',
        description: 'Work with teammates across the globe with real-time presence indicators and automatic syncing.',
    },
    {
        title: 'Automated Workflows',
        description: 'Build custom automation pipelines with drag-and-drop simplicity and pre-built integrations.',
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
        <section className="bg-background @container pt-24">
            <div className="mx-auto max-w-5xl px-6">
                <div className="max-w-lg">
                    <h2 className="text-foreground text-3xl font-semibold lg:text-4xl">Ship with confidence</h2>
                    <p className="text-muted-foreground mx-auto mt-3 max-w-lg text-lg">From prototype to production, every tool you need in one place.</p>
                </div>
            </div>
            <div className="relative mt-16 pb-24">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="grid items-end max-lg:gap-12 lg:grid-cols-5">
                        <div className="relative lg:col-span-2 lg:pb-12">
                            <div className="absolute inset-y-0 flex items-center justify-center gap-3 max-sm:-inset-x-4 max-sm:justify-between sm:flex-col lg:-left-8 lg:-translate-x-full">
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="rounded-full"
                                    disabled={expandedIndex === 0}
                                    onClick={() => handleSelect(expandedIndex - 1)}>
                                    <ChevronUp />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="rounded-full"
                                    disabled={expandedIndex === features.length - 1}
                                    onClick={() => handleSelect(expandedIndex + 1)}>
                                    <ChevronDown />
                                </Button>
                            </div>
                            <div className="space-y-3 max-lg:px-16 max-sm:px-9">
                                <LayoutGroup>
                                    {features.map((feature, index) => {
                                        const isActive = expandedIndex === index
                                        return (
                                            <motion.div
                                                layout
                                                layoutDependency={expandedIndex}
                                                layoutId={feature.title}
                                                key={feature.title}
                                                data-expanded={isActive}
                                                initial={false}
                                                animate={{
                                                    paddingTop: isActive ? 18 : 0,
                                                    paddingBottom: isActive ? 18 : 0,
                                                    width: isActive ? '100%' : 'fit-content',
                                                }}
                                                transition={{
                                                    layout: { type: 'spring', bounce: 0.2, duration: 0.5 },
                                                    type: 'spring',
                                                    bounce: 0.2,
                                                    duration: 0.5,
                                                }}
                                                className={cn('ring-border group relative min-w-0 max-w-xs overflow-hidden rounded-3xl text-left ring transition-colors duration-500', isActive ? 'bg-card dark:bg-muted/50 shadow-black/4 ring-border w-full shadow-md' : 'text-muted-foreground hover:text-foreground')}>
                                                <AnimatePresence initial={false}>
                                                    {!isActive && (
                                                        <motion.button
                                                            layout="position"
                                                            onClick={() => handleSelect(index)}
                                                            initial={{ opacity: 0, filter: 'blur(4px)', y: 4 }}
                                                            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                                                            exit={{ opacity: 0, filter: 'blur(4px)', y: -4 }}
                                                            transition={{ duration: 0.5 }}
                                                            className="flex h-10 cursor-pointer items-center gap-2 px-4">
                                                            <PlusCircle className="size-3.5" />
                                                            <h3 className="text-nowrap text-sm font-medium">{feature.title}</h3>
                                                        </motion.button>
                                                    )}

                                                    {isActive && (
                                                        <motion.div
                                                            layout="position"
                                                            initial={{ opacity: 0, height: 0, filter: 'blur(4px)', y: 4 }}
                                                            animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)', y: 0 }}
                                                            exit={{ opacity: 0, height: 0, filter: 'blur(4px)', y: -4 }}
                                                            transition={{
                                                                duration: 0.6,
                                                                type: 'spring',
                                                                bounce: 0.2,
                                                            }}
                                                            className="px-6">
                                                            <p className="text-muted-foreground max-w-md">
                                                                <strong className="text-foreground font-medium">{feature.title}.</strong> {feature.description}
                                                            </p>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        )
                                    })}
                                </LayoutGroup>
                            </div>
                        </div>
                        <div className="@lg:grid-cols-[auto_1fr] flex grid gap-2 max-lg:row-start-1 max-lg:mx-auto max-lg:w-full max-lg:max-w-md lg:col-span-3">
                            <div className="@max-lg:mx-auto -space-y-28">
                                <motion.div
                                    initial={false}
                                    animate={{
                                        y: expandedIndex > 0 ? -20 : 0,
                                    }}
                                    transition={{ delay: expandedIndex === 0 ? 0.15 : 0, type: 'spring', bounce: 0.3, duration: 0.8 }}
                                    className="z-2 relative">
                                    <ServerIllustration isActive={expandedIndex === 0} />
                                </motion.div>
                                <motion.div
                                    initial={false}
                                    animate={{
                                        y: expandedIndex === 2 ? -26 : expandedIndex === 0 ? 12 : -6,
                                    }}
                                    transition={{ delay: expandedIndex === 1 ? 0.15 : 0.075, type: 'spring', bounce: 0.3, duration: 0.8 }}
                                    className="z-1 relative">
                                    <ServerIllustration isActive={expandedIndex === 1} />
                                </motion.div>
                                <motion.div
                                    initial={false}
                                    animate={{
                                        y: expandedIndex < 2 ? 6 : 0,
                                    }}
                                    transition={{ delay: 0.15, type: 'spring', bounce: 0.3, duration: 0.8 }}
                                    className="relative">
                                    <ServerIllustration isActive={expandedIndex === 2} />
                                </motion.div>
                            </div>
                            <motion.div
                                initial={false}
                                animate={{
                                    y: expandedIndex === 0 ? 0 : expandedIndex === 1 ? '105%' : '210%',
                                }}
                                transition={{ duration: expandedIndex === 0 ? 0.65 : 0.8, type: 'spring', bounce: 0.2 }}
                                className="h-30 @max-lg:hidden translate-y-15.5 grid grid-cols-[1fr_auto] items-center gap-3">
                                <div className="h-30 grid shrink-0 grid-cols-[1fr_auto] items-center">
                                    <div className="bg-border h-px w-full"></div>
                                    <div className="h-full w-4 rounded-l-lg border-y border-l"></div>
                                </div>
                                <p className="text-muted-foreground w-44 text-balance text-sm">From prototype to production, every tool you need in one place.</p>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}