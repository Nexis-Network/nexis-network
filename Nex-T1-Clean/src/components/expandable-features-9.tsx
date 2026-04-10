'use client'

import { cn } from '@/lib/utils'
import { useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { SceneIllustration } from "@/components/ui/illustrations/scene-illustration"
import { ChevronDown, ChevronUp, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
    {
        title: 'Server',
        description: 'Access and switch between multiple AI models from a unified interface with seamless provider switching.',
    },
    {
        title: 'Router',
        description: 'Work with teammates across the globe with real-time presence indicators and automatic syncing.',
    },
    {
        title: 'Database',
        description: 'Build custom automation pipelines with drag-and-drop simplicity and pre-built integrations.',
    },
    {
        title: 'Tab',
        description: 'Build custom automation pipelines with drag-and-drop simplicity and pre-built integrations.',
    },
    {
        title: 'Mobile',
        description: 'Build custom automation pipelines with drag-and-drop simplicity and pre-built integrations.',
    },
]

export default function ExpandableFeatures() {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

    const handleSelect = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index)
    }

    return (
        <section className="bg-background @container py-24">
            <div className="mx-auto max-w-5xl px-6">
                <div className="mb-12 grid items-end gap-4 text-balance md:grid-cols-2">
                    <h2 className="text-foreground text-4xl font-semibold">Ship with confidence using our unified platform</h2>
                    <p className="text-muted-foreground text-lg">Five pillars that power your development workflow from idea to deployment.</p>
                </div>
                <div className="grid items-center lg:grid-cols-5">
                    <div className="relative z-10 lg:col-span-2">
                        <AnimatePresence>
                            {typeof expandedIndex === 'number' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.75, y: 44, filter: 'blur(4px)' }}
                                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, scale: 0.75, y: 44, filter: 'blur(4px)' }}
                                    className="absolute inset-y-0 flex items-center justify-center gap-3 max-sm:-inset-x-4 max-sm:justify-between sm:flex-col lg:-left-8 lg:-translate-x-full">
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="rounded-full"
                                        disabled={expandedIndex === null || expandedIndex === 0}
                                        onClick={() => expandedIndex !== null && handleSelect(expandedIndex - 1)}>
                                        <ChevronUp />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="rounded-full"
                                        disabled={expandedIndex === null || expandedIndex === features.length - 1}
                                        onClick={() => expandedIndex !== null && handleSelect(expandedIndex + 1)}>
                                        <ChevronDown />
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>

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
                                                duration: 0.6,
                                            }}
                                            className={cn('ring-border group relative min-w-0 max-w-xs overflow-hidden rounded-3xl text-left ring transition-colors duration-500 max-md:mx-auto', isActive ? 'bg-card dark:bg-muted/50 shadow-black/4 ring-border w-full shadow-md' : 'text-muted-foreground hover:text-foreground')}>
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

                    <div className="max-lg:row-start-1 lg:col-span-3 lg:-translate-x-20">
                        <SceneIllustration activeDevice={expandedIndex} />
                    </div>
                </div>
            </div>
        </section>
    )
}