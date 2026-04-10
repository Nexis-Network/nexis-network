'use client'

import { motion, AnimatePresence } from 'motion/react'
import { useState, useCallback, useRef } from 'react'
import { ChevronDown, ChevronRight, ChevronUp, Star, Zap } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Stripe } from '@/components/ui/svgs/stripe'
import { Hulu } from '@/components/ui/svgs/hulu'
import { PrimeVideo } from '@/components/ui/svgs/primeVideo'
import { Button } from '@/components/ui/button'
import { TextEffect } from '@/components/ui/text-effect'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { BERNARD_AVATAR, GLODIE_AVATAR, MESCHAC_AVATAR } from '@/lib/const'

const testimonialsData = [
    {
        id: 'stripe' as const,
        LogoComponent: Stripe,
        cardLogoProps: { className: 'h-7 w-16' },
        buttonLogoProps: { height: 20, width: 56 },
        text: 'The component library from Tailark has been a game-changer for our development team. We can quickly build consistent interfaces across our payment platform with minimal effort. The documentation is excellent and the customization options are exactly what we needed.',
        avatar: BERNARD_AVATAR,
        name: 'Bernard Ngandu',
        title: 'Backend Engineer',
        brandColor: '#635bff',
        resultText: '40% Reduction in integration time for new merchants',
        resultText2: '50% faster onboarding for new clients',
    },
    {
        id: 'hulu' as const,
        LogoComponent: Hulu,
        cardLogoProps: { className: 'h-7 w-16' },
        buttonLogoProps: { height: 20, width: 44 },
        text: 'Implementing Tailark components helped us create a more engaging streaming interface. The responsive design system works flawlessly across devices, and we were able to maintain our brand identity while leveraging their robust component architecture.',
        avatar: MESCHAC_AVATAR,
        name: 'Méschac Irung',
        title: 'UI Engineer',
        brandColor: '#1CE783',
        resultText: '25% Increase in total user engagement',
        resultText2: '30% higher retention rate for subscribers',
    },
    {
        id: 'prime' as const,
        LogoComponent: PrimeVideo,
        cardLogoProps: { className: 'h-7 w-20' },
        buttonLogoProps: { height: 24, width: 64 },
        text: 'We needed a solution that could handle our complex UI requirements while maintaining performance. Tailark delivered exactly that - their component system integrated seamlessly with our existing architecture and helped us launch new features in record time.',
        avatar: GLODIE_AVATAR,
        name: 'Glodie Lukose',
        title: 'Frontend Engineer',
        brandColor: '#00A8E1',
        resultText: 'Content discovery increased by 35% using our engine',
        resultText2: '20% more time spent on the platform per user',
    },
]

const animationVariants = {
    exit: { opacity: 0, scale: 1, y: -18 },
    initial: { opacity: 0, scale: 0.95, y: 18 },
    animate: { opacity: 1, scale: 1, y: 0 },
}

export function Testimonials() {
    const [currentIndex, setCurrentIndex] = useState(1)
    const touchStartY = useRef<number | null>(null)
    const touchEndY = useRef<number | null>(null)
    const savedScrollY = useRef<number>(0)

    const handlePrevious = () => {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonialsData.length) % testimonialsData.length)
    }

    const handleNext = useCallback(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonialsData.length)
    }, [])

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        e.preventDefault()
        touchEndY.current = null
        touchStartY.current = e.targetTouches[0].clientY

        const documentElement = document.documentElement
        const body = document.body
        savedScrollY.current = window.scrollY

        documentElement.style.overflow = 'hidden'
        body.style.overflow = 'hidden'
        documentElement.style.position = 'fixed'
        documentElement.style.top = `-${savedScrollY.current}px`
        documentElement.style.width = '100%'
        body.style.position = 'fixed'
        body.style.width = '100%'
    }, [])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        e.preventDefault()
        e.stopPropagation()
        touchEndY.current = e.targetTouches[0].clientY
    }, [])

    const handleTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            if (touchStartY.current === null) return
            touchEndY.current = e.changedTouches[0].clientY

            const distance = touchStartY.current - touchEndY.current
            const isSwipeUp = distance > 50

            if (isSwipeUp) {
                handleNext()
            }

            const documentElement = document.documentElement
            const body = document.body

            documentElement.style.overflow = 'auto'
            documentElement.style.position = 'static'
            documentElement.style.top = '0'
            documentElement.style.width = 'auto'

            body.style.overflow = 'auto'
            body.style.position = 'static'
            body.style.width = 'auto'

            window.scrollTo(0, savedScrollY.current)
        },
        [handleNext]
    )

    return (
        <div>
            <div className="relative mx-auto max-w-xl">
                <Button
                    onClick={handlePrevious}
                    size="icon"
                    variant="outline"
                    aria-label="Previous testimonial"
                    className="absolute inset-y-0 -left-16 my-auto rounded-full max-md:hidden">
                    <ChevronUp className="-translate-y-px" />
                </Button>

                <Button
                    onClick={handleNext}
                    size="icon"
                    variant="outline"
                    aria-label="Next testimonial"
                    className="absolute inset-y-0 -right-16 my-auto rounded-full max-md:hidden">
                    <ChevronDown className="translate-y-px" />
                </Button>
                <AnimatePresence
                    initial={false}
                    mode="popLayout">
                    <motion.div
                        key={`layer-1-${testimonialsData[currentIndex].id}`}
                        variants={animationVariants}
                        exit={{ scale: 0.5, y: -32 }}
                        initial={{ opacity: 0, scale: 1.025, y: -32 }}
                        animate={{ opacity: 1, scale: 0.9, y: 0, transition: { delay: 0.2, duration: 0.5, ease: 'easeInOut' } }}
                        transition={{ duration: 0.4, ease: 'easeInOut' }}
                        className="ring-foreground/10 bg-card absolute inset-0 origin-bottom translate-y-6 rounded-2xl border border-transparent shadow-md ring-1"
                    />
                    <motion.div
                        key={`layer-2-${testimonialsData[currentIndex].id}`}
                        variants={animationVariants}
                        exit="exit"
                        initial="initial"
                        animate="animate"
                        transition={{ duration: 0.4, ease: 'easeInOut' }}
                        className="ring-foreground/10 bg-card absolute inset-0 origin-bottom translate-y-3 scale-95 rounded-2xl border border-transparent shadow-md ring-1"
                    />
                    {(() => {
                        const currentTestimonialData = testimonialsData[currentIndex]
                        if (!currentTestimonialData) return null
                        const { LogoComponent, cardLogoProps, text, avatar, name, title, id } = currentTestimonialData
                        return (
                            <motion.div
                                key={id}
                                variants={animationVariants}
                                exit="exit"
                                initial="initial"
                                animate="animate"
                                transition={{ duration: 0.4, ease: 'easeInOut' }}
                                className="relative z-10 origin-bottom">
                                <Card
                                    className="ring-foreground/10 relative space-y-8 rounded-2xl p-10 shadow-lg shadow-black/10"
                                    style={{ touchAction: 'none' }}
                                    onTouchStart={handleTouchStart}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                    onTouchCancel={handleTouchEnd}>
                                    <div>
                                        <LogoComponent {...cardLogoProps} />
                                    </div>
                                    <p className='text-lg before:mr-1 before:font-serif before:content-["\201C"] after:ml-1 after:font-serif after:content-["\201D"]'>{text}</p>
                                    <div className="grid grid-cols-[auto_1fr] items-center gap-3 pl-px">
                                        <div className="ring-foreground/10 aspect-square size-12 overflow-hidden rounded-xl border border-transparent shadow-md shadow-black/15 ring-1">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={avatar}
                                                alt={`Avatar of ${name}`}
                                            />
                                        </div>
                                        <div className="space-y-0.5 text-base *:block">
                                            <span className="text-foreground font-medium">{name}</span>
                                            <span className="text-muted-foreground text-sm">{title}</span>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )
                    })()}
                </AnimatePresence>
            </div>

            <div className="relative mx-auto mb-9 mt-20 w-fit max-w-xl">
                <PlusDecorator className="-translate-[calc(50%-0.5px)]" />
                <PlusDecorator className="right-0 -translate-y-[calc(50%-0.5px)] translate-x-[calc(50%-0.5px)]" />
                <PlusDecorator className="bottom-0 right-0 translate-x-[calc(50%-0.5px)] translate-y-[calc(50%-0.5px)]" />
                <PlusDecorator className="bottom-0 -translate-x-[calc(50%-0.5px)] translate-y-[calc(50%-0.5px)]" />
                <div className="relative grid grid-cols-2 border py-6">
                    <span className="bg-foreground/10 border-background pointer-events-none absolute inset-y-4 left-1/2 w-0.5 rounded border-r"></span>

                    <div className="space-y-4 px-6">
                        <div
                            aria-hidden
                            className="flex justify-center gap-1">
                            <Star className="fill-background stroke-background size-5 drop-shadow" />
                            <Star className="fill-background stroke-background size-5 drop-shadow" />
                            <Star className="fill-background stroke-background size-5 drop-shadow" />
                            <Star className="fill-background stroke-background size-5 drop-shadow" />
                            <Star className="fill-background stroke-background size-5 drop-shadow" />
                        </div>
                        <TextEffect
                            preset="fade"
                            per="char"
                            delay={0.25}
                            speedReveal={5}
                            key={testimonialsData[currentIndex].id}
                            className="text-muted-foreground text-balance text-center text-sm font-medium">
                            {testimonialsData[currentIndex].resultText}
                        </TextEffect>
                    </div>
                    <div className="space-y-4 px-6">
                        <div
                            aria-hidden
                            className="flex justify-center gap-1">
                            <Zap className="fill-background stroke-background size-5 drop-shadow" />
                            <Zap className="fill-background stroke-background size-5 drop-shadow" />
                            <Zap className="fill-background stroke-background size-5 drop-shadow" />
                            <Zap className="fill-background stroke-background size-5 drop-shadow" />
                            <Zap className="fill-background stroke-background size-5 drop-shadow" />
                        </div>
                        <TextEffect
                            preset="fade"
                            per="char"
                            delay={0.25}
                            speedReveal={5}
                            key={testimonialsData[currentIndex].id}
                            className="text-muted-foreground text-balance text-center text-sm font-medium">
                            {testimonialsData[currentIndex].resultText2}
                        </TextEffect>
                    </div>
                </div>
            </div>

            <Button
                asChild
                variant="link"
                className="mx-auto flex w-fit">
                <Link href="#">
                    Read more customer Stories <ChevronRight />
                </Link>
            </Button>
        </div>
    )
}

const PlusDecorator = ({ className }: { className?: string }) => (
    <div
        aria-hidden
        className={cn('mask-radial-from-15% z-1 before:bg-foreground/25 after:bg-foreground/25 absolute size-3 before:absolute before:inset-0 before:m-auto before:h-px after:absolute after:inset-0 after:m-auto after:w-px', className)}
    />
)