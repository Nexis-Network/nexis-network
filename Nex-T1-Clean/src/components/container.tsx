import { cn } from '@/lib/utils'

export const Container = ({ className, children, asGrid = false, decorators = 2, ...props }: { className?: string; children: React.ReactNode; asGrid?: boolean; decorators?: number; props?: React.HTMLAttributes<HTMLDivElement> }) => {
    return (
        <div
            {...props}
            className="@container grid grid-cols-[auto_1fr_auto] lg:grid-cols-[1fr_auto_1fr]">
            <div
                className="grid"
                style={{ gridTemplateColumns: `repeat(${decorators / 2}, minmax(0, 1fr))` }}>
                {Array.from({ length: decorators / 2 }).map((_, i) => (
                    <Decorator
                        key={i}
                        className="w-full"
                    />
                ))}
            </div>
            <div className={cn('max-w-276 lg:min-w-276 mx-auto w-full', !asGrid && 'p-[0.5px]')}>
                {asGrid ? (
                    <div className={cn('**:data-grid-content:bg-card/90 **:data-grid-content:h-full **:data-grid-content:rounded grid *:p-[0.5px]', className)}>{children}</div>
                ) : (
                    <div
                        data-slot="content"
                        className={cn('bg-card/90 h-full rounded', className)}>
                        {children}
                    </div>
                )}
            </div>
            <div
                className="grid"
                style={{ gridTemplateColumns: `repeat(${decorators / 2}, minmax(0, 1fr))` }}>
                {Array.from({ length: decorators / 2 }).map((_, i) => (
                    <Decorator key={i} />
                ))}
            </div>
        </div>
    )
}

export const Separator = ({ className, decorators = 2 }: { className?: string; decorators?: number }) => {
    return (
        <Container
            aria-hidden
            decorators={decorators}>
            <div className={cn('h-16', className)} />
        </Container>
    )
}

const Decorator = ({ className }: { className?: string }) => {
    return (
        <div
            aria-hidden
            className={cn('p-[0.5px]', className)}>
            <div className="bg-card/90 h-full w-2 rounded md:w-6 lg:w-full" />
        </div>
    )
}