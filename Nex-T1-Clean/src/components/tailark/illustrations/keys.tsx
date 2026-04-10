import { Globe } from 'lucide-react'

export const KeysIllustration = () => (
    <div
        aria-hidden
        className="@4xl:aspect-auto flex aspect-video items-center justify-center">
        <div className="relative mx-auto flex w-fit gap-3">
            <div className="border-border-illustration absolute -inset-x-6 inset-y-0 border-y border-dashed"></div>
            <div className="border-border-illustration absolute -inset-y-6 inset-x-0 border-x border-dashed"></div>
            <div className="dark:ring-background dark:border-border-illustration border-border-illustration bg-foreground/65 relative flex aspect-square size-16 items-center rounded-[7px] border border-white/25 p-3 text-white shadow-lg shadow-black/35 ring ring-black dark:bg-zinc-900">
                <span className="absolute right-2 top-1 block text-sm">fn</span>
                <Globe className="mt-auto size-4" />
            </div>
            <div className="dark:ring-background dark:border-border-illustration bg-foreground/65 relative flex aspect-square size-16 items-center justify-center rounded-[7px] border border-white/25 p-3 shadow-lg shadow-black/35 ring ring-black dark:bg-zinc-900">
                <span className="text-white">K</span>
            </div>
        </div>
    </div>
)

export default KeysIllustration