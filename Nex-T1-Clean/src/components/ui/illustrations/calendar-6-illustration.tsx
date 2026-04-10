import { Clock, MapPin, Users, Video } from 'lucide-react'
import Image from 'next/image'

export const Calendar6Illustration = () => {
    return (
        <div
            aria-hidden
            className="ring-border-illustration bg-card/90 shadow-black/6.5 min-w-80 rounded-3xl p-2 shadow-lg ring-1">
            <div className="flex items-start justify-between px-2 pt-2">
                <div className="space-y-1">
                    <div className="text-muted-foreground text-xs font-medium">Meeting Invitation</div>
                    <div className="text-base font-semibold">Product Strategy Review</div>
                </div>
                <div className="bg-foreground/5 flex size-9 items-center justify-center rounded-full">
                    <Video className="size-4 *:fill-emerald-500/25 *:first:fill-emerald-500 dark:stroke-transparent" />
                </div>
            </div>

            <div className="bg-illustration ring-border-illustration mb-2 mt-3 space-y-3 rounded-2xl p-4 ring-1">
                <div className="flex items-center gap-3 text-sm">
                    <Clock className="text-foreground/50 fill-foreground/5 size-4.5" />
                    <span>Wed, Jan 29 · 2:00 - 3:30 PM</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <MapPin className="text-foreground/50 fill-foreground/5 size-4.5" />
                    <span className="text-foreground cursor-pointer underline underline-offset-2">meet.google.com/abc-defg-hij</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <Users className="text-foreground/50 fill-foreground/5 size-4.5" />
                    <div className="flex -space-x-1.5">
                        {[
                            { src: 'https://avatars.githubusercontent.com/u/47919550?v=4', alt: 'Méschac Irung' },
                            { src: 'https://avatars.githubusercontent.com/u/31113941?v=4', alt: 'Bernard Ngandu' },
                            { src: 'https://avatars.githubusercontent.com/u/68236786?v=4', alt: 'Théo Balick' },
                            { src: 'https://avatars.githubusercontent.com/u/99137927?v=4', alt: 'Glodie Lukose' },
                        ].map((avatar, index) => (
                            <div
                                key={index}
                                className="bg-background size-6 rounded-full border p-0.5 shadow shadow-zinc-950/5 *:rounded-full">
                                <Image
                                    src={avatar.src}
                                    className="aspect-square rounded-[calc(var(--avatar-radius)-2px)] object-cover"
                                    alt={avatar.alt}
                                    width="460"
                                    height="460"
                                />
                            </div>
                        ))}
                        <div className="ring-background bg-muted text-muted-foreground flex size-6 items-center justify-center rounded-full text-[10px] font-medium ring-1">+4</div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between gap-2 pl-3 pr-0.5">
                <span className="block border-b border-transparent text-sm font-semibold">Going?</span>

                <div className="flex">
                    <div className="hover:bg-foreground/5 flex h-7 cursor-pointer items-center justify-center rounded-full px-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                        <span>Yes</span>
                    </div>
                    <div className="hover:bg-foreground/5 text-foreground/65 flex h-7 cursor-pointer items-center justify-center rounded-full px-2 text-sm font-medium">
                        <span>No</span>
                    </div>
                    <div className="hover:bg-foreground/5 text-foreground/65 flex h-7 cursor-pointer items-center justify-center rounded-full px-2 text-sm font-medium">
                        <span>Maybe</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Calendar6Illustration