'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export const ImageIllustration = () => {
    const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            setMouse({ x: e.clientX, y: e.clientY })
        }
        window.addEventListener('mousemove', onMove)
        return () => window.removeEventListener('mousemove', onMove)
    }, [])
    return (
        <div className="aspect-63/36 relative overflow-hidden 2xl:mx-auto 2xl:max-w-7xl">
            <Image
                src="https://res.cloudinary.com/dohqjvu9k/image/upload/v1757918275/healthcare_ttc35b.jpg"
                alt="healthcare professionals"
                className="size-full object-cover"
                width={2000}
                height={1121}
            />

            <div
                aria-hidden
                className="bg-linear-to-r pointer-events-none absolute inset-0 left-0 top-0 z-0 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full from-indigo-400 via-emerald-400 to-rose-500 mix-blend-overlay blur-2xl will-change-transform md:size-72"
                style={{ transform: `translate(${mouse.x}px, ${mouse.y}px)` }}
            />
        </div>
    )
}