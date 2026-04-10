'use client'

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { SourceIcon } from "@/components/sources/source-icon"
import { cn } from "@/lib/utils"
import { createContext, useContext, type ReactNode } from 'react'

const SourceContext = createContext<{
    href: string
    domain: string
} | null>(null)

function useSourceContext() {
    const ctx = useContext(SourceContext)
    if (!ctx) throw new Error('Source.* must be used inside <Source>')
    return ctx
}

export type SourceProps = {
    href: string
    children: ReactNode
}

export function Source({ href, children }: SourceProps) {
    let domain = ''
    try {
        domain = new URL(href).hostname
    } catch {
        domain = href.split('/').pop() || href
    }

    return (
        <SourceContext.Provider value={{ href, domain }}>
            <HoverCard
                openDelay={150}
                closeDelay={0}>
                {children}
            </HoverCard>
        </SourceContext.Provider>
    )
}

export type SourceTriggerProps = {
    label?: string | number
    showFavicon?: boolean
    className?: string
}

export function SourceTrigger({ label, showFavicon = false, className }: SourceTriggerProps) {
    const { href, domain } = useSourceContext()
    const labelToShow = label ?? domain.replace('www.', '')

    return (
        <HoverCardTrigger asChild>
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn('bg-muted text-muted-foreground hover:bg-foreground/5 hover:text-primary inline-flex h-6 max-w-32 items-center gap-1 overflow-hidden rounded-full py-0 text-xs leading-none no-underline transition-colors duration-150', showFavicon ? 'pl-1 pr-2' : 'px-1', className)}>
                {showFavicon && (
                    <SourceIcon
                      title={typeof labelToShow === "string" ? labelToShow : undefined}
                      url={href}
                      size={14}
                      className="size-3.5"
                    />
                )}
                <span className="truncate text-center font-normal">{labelToShow}</span>
            </a>
        </HoverCardTrigger>
    )
}

export type SourceContentProps = {
    title: string
    description: string
    className?: string
}

export function SourceContent({ title, description, className }: SourceContentProps) {
    const { href, domain } = useSourceContext()

    return (
        <HoverCardContent className={cn('ring-border-illustration w-80 rounded-lg border-transparent p-0 shadow-lg ring-1', className)}>
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-2 p-3">
                <div className="flex items-center gap-1.5">
                    <SourceIcon title={title} url={href} size={16} className="size-4" />
                    <div className="text-primary truncate text-sm">{domain.replace('www.', '')}</div>
                </div>
                <div className="line-clamp-2 text-sm font-medium">{title}</div>
                <div className="text-muted-foreground line-clamp-2 text-sm">{description}</div>
            </a>
        </HoverCardContent>
    )
}
