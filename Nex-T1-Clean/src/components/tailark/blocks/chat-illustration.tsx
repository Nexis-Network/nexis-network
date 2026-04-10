'use client'
import { Loader } from '@/components/ui/loader'
import { ResponseStream } from '@/components/ui/response-stream'
import { Source, SourceContent, SourceTrigger } from '@/components/ui/sources'
import { useState, useEffect } from 'react'

export const ChatIllustration = () => {
    const [isStreaming, setIsStreaming] = useState(false)

    const response = `Tailark is a collection of pre-built, responsive UI blocks and components designed to accelerate the development of marketing websites. `

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsStreaming(true)
        }, 400)
        return () => clearTimeout(timer)
    }, [])
    return (
        <div
            aria-hidden
            className="flex flex-col gap-6">
            <div>
                <div className="before:mask-x-from-75% before:border-foreground/10 relative before:absolute before:inset-0 before:border-y before:border-dashed">
                    <div className="relative mx-auto max-w-lg">
                        <div className="max-w-3/4 bg-linear-to-b from-card ring-foreground/10 inset-ring inset-ring-background/50 ml-auto w-fit rounded-t-2xl rounded-bl-2xl rounded-br to-indigo-100/50 p-3 text-sm text-indigo-950 shadow-md shadow-indigo-600/10 ring-1">Distinctio provident nobis repudiandae deleniti necessitatibus.</div>
                    </div>
                </div>
                <div className="mx-auto mt-1 max-w-lg">
                    <span className="text-muted-foreground block text-right text-xs">Sat 22 Feb</span>
                </div>
            </div>
            <div className="h-30">
                <div className="before:mask-x-from-75% before:border-foreground/10 relative before:absolute before:inset-0 before:border-y before:border-dashed">
                    <div className="relative mx-auto max-w-lg">
                        {isStreaming ? (
                            <div className="max-w-3/4 bg-linear-to-b from-card ring-foreground/10 inset-ring inset-ring-background/50 w-fit rounded-t-2xl rounded-bl rounded-br-2xl to-emerald-50/50 p-3 text-sm text-emerald-950 shadow-md shadow-emerald-600/10 ring-1">
                                <ResponseStream
                                    textStream={response}
                                    mode="typewriter"
                                    className="text-sm"
                                    speed={40}
                                />
                            </div>
                        ) : (
                            <div className="py-2">
                                <Loader
                                    variant="typing"
                                    size="sm"
                                    className="[--color-primary:var(--color-muted-foreground)]"
                                />
                            </div>
                        )}
                    </div>
                </div>
                <div className="mx-auto mt-2 max-w-lg">
                    {isStreaming && (
                        <div className="flex flex-wrap gap-2">
                            <Source href="https://tailark.com">
                                <SourceTrigger showFavicon />
                                <SourceContent
                                    title="Tailark"
                                    description="Tailark is a collection of pre-built, responsive UI blocks and components designed to accelerate the development of marketing websites."
                                />
                            </Source>
                            <Source href="https://www.google.com">
                                <SourceTrigger showFavicon />
                                <SourceContent
                                    title="Google"
                                    description="Search the world's information, including webpages, images, videos and more. Google has many special features to help you find exactly what you're looking for."
                                />
                            </Source>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}