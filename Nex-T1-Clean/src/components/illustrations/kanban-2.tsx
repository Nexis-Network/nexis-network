import { Circle, Clock } from 'lucide-react'
import Image from 'next/image'

const MESCHAC_AVATAR = 'https://avatars.githubusercontent.com/u/47919550?v=4'
const BERNARD_AVATAR = 'https://avatars.githubusercontent.com/u/31113941?v=4'
const THEO_AVATAR = 'https://avatars.githubusercontent.com/u/68236786?v=4'

export const Kanban2Illustration = () => {
    return (
        <div
            aria-hidden
            className="-mx-4 -my-1 w-full p-1">
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                        <Circle className="size-3 text-gray-400" />
                        <span className="text-xs font-semibold">To Do</span>
                        <span className="text-muted-foreground ml-auto text-xs">3</span>
                    </div>
                    <div className="space-y-2">
                        <div className="bg-illustration ring-border-illustration translate-y-2 rotate-12 rounded-xl p-3 shadow-2xl shadow-indigo-950/20 ring-1">
                            <div className="mb-2 flex gap-1.5">
                                <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">Feature</span>
                            </div>
                            <div className="text-sm font-medium">Add dark mode toggle</div>
                            <div className="mt-3 flex items-center justify-between">
                                <div className="size-5 overflow-hidden rounded-full">
                                    <Image
                                        src={MESCHAC_AVATAR}
                                        alt="Méschac Irung"
                                        width={20}
                                        height={20}
                                    />
                                </div>
                                <span className="text-muted-foreground text-[10px]">Jan 8</span>
                            </div>
                        </div>
                        <div className="bg-illustration ring-border-illustration rounded-xl p-3 ring-1">
                            <div className="mb-2 flex gap-1.5">
                                <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">Bug</span>
                            </div>
                            <div className="text-sm font-medium">Fix login redirect</div>
                            <div className="mt-3 flex items-center justify-between">
                                <div className="size-5 overflow-hidden rounded-full">
                                    <Image
                                        src={BERNARD_AVATAR}
                                        alt="Bernard Ngandu"
                                        width={20}
                                        height={20}
                                    />
                                </div>
                                <span className="text-muted-foreground text-[10px]">Jan 5</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                        <Clock className="size-3 text-amber-500" />
                        <span className="text-xs font-semibold">In Progress</span>
                        <span className="text-muted-foreground ml-auto text-xs">2</span>
                    </div>
                    <div className="space-y-2">
                        <div className="bg-illustration ring-border-illustration rounded-xl p-3 ring-1">
                            <div className="mb-2 flex gap-1.5">
                                <span className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">Design</span>
                            </div>
                            <div className="text-sm font-medium">Update dashboard UI</div>
                            <div className="mt-3 flex items-center justify-between">
                                <div className="size-5 overflow-hidden rounded-full">
                                    <Image
                                        src={THEO_AVATAR}
                                        alt="Théo Balick"
                                        width={20}
                                        height={20}
                                    />
                                </div>
                                <span className="text-muted-foreground text-[10px]">Jan 6</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Kanban2Illustration