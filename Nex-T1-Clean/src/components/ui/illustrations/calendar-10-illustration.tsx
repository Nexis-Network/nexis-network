import { CalendarDays, RefreshCcw } from 'lucide-react'

export const Calendar10Illustration = () => {
    return (
        <div
            aria-hidden
            className="ring-border-illustration bg-card/95 shadow-black/4 min-w-md rounded-2xl shadow-md ring-1">
            <div className="space-y-2 px-6 py-5">
                <div className="text-2xl font-bold">
                    1 January <span className="font-normal">2026</span>
                </div>

                <div>Thursday</div>
            </div>

            <div className="border-t pt-0.5">
                <div className="grid grid-cols-[auto_1fr] border-b-2 pb-0.5 pl-6 pr-0.5">
                    <div className="text-foreground/50 w-12.5 py-0.5 text-center text-sm font-medium">all day</div>
                    <div className="space-y-0.5">
                        <div className="bg-sky-500/6.5 grid grid-cols-[auto_1fr] gap-1 rounded-full p-1 pr-2 text-sm font-medium">
                            <div className="flex aspect-square rounded-full bg-sky-400 p-1 text-sky-950 *:m-auto *:size-2.5">
                                <CalendarDays />
                            </div>
                            <div className="flex items-center justify-between text-sky-700 dark:text-sky-400">
                                <span className="text-sm font-semibold">Irung - Birthday</span>
                                <RefreshCcw className="size-3" />
                            </div>
                        </div>
                        <div className="bg-emerald-500/6.5 grid grid-cols-[auto_1fr] gap-1 rounded-full p-1 pr-2 text-sm font-medium">
                            <div className="flex aspect-square rounded-full bg-emerald-400 p-1 text-emerald-950 *:m-auto *:size-2.5">
                                <CalendarDays />
                            </div>
                            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                                <span className="text-sm font-semibold">New Year's Day</span>
                            </div>
                        </div>
                        <div className="bg-purple-500/6.5 grid grid-cols-[auto_1fr] gap-1 rounded-full p-1 pr-2 text-sm font-medium">
                            <div className="flex aspect-square rounded-full bg-purple-400 p-1 text-purple-950 *:m-auto *:size-2.5">
                                <CalendarDays />
                            </div>
                            <div className="flex items-center justify-between text-purple-700 dark:text-purple-400">
                                <span className="text-sm font-semibold">Team Kickoff 2026</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative max-h-72 space-y-5 overflow-y-auto pb-6">
                    <div className="top-28.5 absolute inset-x-0 grid grid-cols-[auto_1fr] items-center pb-0.5 pl-6 pr-0.5">
                        <div className="w-12.5 rounded-full bg-rose-600 text-center text-sm font-semibold text-white">02:30</div>
                        <div className="h-0.5 bg-rose-600"></div>
                    </div>
                    {Array.from({ length: 25 }, (_, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-[auto_1fr] items-center pb-0.5 pl-6 pr-0.5">
                            <div className="text-foreground/50 w-12.5 py-0.5 text-center text-sm font-medium">{String(i).padStart(2, '0')}:00</div>
                            <div className="bg-border h-px"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Calendar10Illustration