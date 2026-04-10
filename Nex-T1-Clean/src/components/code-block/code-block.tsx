// This code is adapted from Origin UI
// Source: https://github.com/origin-space/originui/blob/main/components/code-block.tsx
'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import type { BundledLanguage } from 'shiki/bundle/web'
import { codeToHtml } from 'shiki/bundle/web'
import { cn } from '@/lib/utils'

export async function highlight(code: string, lang: BundledLanguage, theme?: string) {
    return codeToHtml(code, {
        lang,
        theme: theme || 'github-dark',
    })
}

type Props = {
    code: string | null
    lang: BundledLanguage
    initialHtml?: string | null
    preHighlightedHtml?: string | null
    maxHeight?: number
    className?: string
    theme?: string
    lineNumbers?: boolean
}

export default function CodeBlock({
    code,
    lang,
    initialHtml = null,
    maxHeight,
    preHighlightedHtml = null,
    theme,
    className,
}: Props) {
    const [content, setContent] = useState<string | null>(preHighlightedHtml ?? initialHtml)

    useEffect(() => {
        if (preHighlightedHtml) {
            setContent(preHighlightedHtml)
            return
        }

        let cancelled = false

        const run = async () => {
            if (!code) {
                setContent('<pre class="rounded-lg bg-zinc-950 p-4">No code available</pre>')
                return
            }

            try {
                const html = await highlight(code, lang, theme)
                if (!cancelled) {
                    setContent(html)
                }
            } catch (error) {
                if (!cancelled) {
                    setContent(
                        `<pre class="rounded-lg bg-zinc-950 p-4">Failed to highlight code: ${String(error)}</pre>`,
                    )
                }
            }
        }

        void run()

        return () => {
            cancelled = true
        }
    }, [code, lang, theme, preHighlightedHtml])

    if (!content) {
        return <pre className="rounded-lg p-4">Loading...</pre>
    }

    const style = maxHeight
        ? ({ '--pre-max-height': `${maxHeight}px` } as CSSProperties)
        : undefined

    return (
        <div
            className={cn('[&_code]:text-[13px]/2 [&_code]:font-mono [&_pre]:border-l [&_pre]:p-2 [&_pre]:leading-snug', className)}
            style={style}
            dangerouslySetInnerHTML={{ __html: content }}
        />
    )
}
