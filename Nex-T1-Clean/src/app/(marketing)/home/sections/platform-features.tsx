import { cn } from '@/lib/utils'

import { Card } from '@/components/ui/card'
import { Linear } from '@/components/ui/svgs/linear'
import { Openai } from '@/components/ui/svgs/openai'
import { Cloudflare } from '@/components/ui/svgs/cloudflare'
import { AddCommentIllustration } from '@/components/illustrations/add-comment-illustration'
import { MessageIllustration } from '@/components/illustrations/message-illustration'
import { MapIllustration } from '@/components/illustrations/map-illustration'
import { VisualizationIllustration } from '@/components/illustrations/visualization-illustration'

export function PlatformFeatures() {
    return (
        <section className="relative overflow-hidden">
            <div
                aria-hidden
                className="mask-b-from-65% absolute -inset-x-7 top-12">
                <svg
                    className="text-foreground/15 fill-background/35 max-md:scale-x-250 w-full origin-top-right max-md:translate-x-3 max-md:scale-y-125"
                    viewBox="0 0 2402 1372"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M1.6015 1033.34L4.26185 1343.72C4.39367 1359.1 16.9052 1371.49 32.2849 1371.48L2310.36 1369.51C2317.81 1369.5 2324.95 1366.53 2330.2 1361.25L2393.36 1297.69C2398.57 1292.44 2401.5 1285.35 2401.5 1277.95V1042.9C2401.5 1036.19 2399.09 1029.7 2394.71 1024.62L2364.79 989.877C2360.41 984.795 2358 978.311 2358 971.603V377.809C2358 370.258 2361.05 363.028 2366.46 357.758L2389.04 335.742C2394.45 330.472 2397.5 323.242 2397.5 315.691V29C2397.5 13.536 2384.96 1 2369.5 1H2300.5H1544.71C1536.92 1 1529.49 4.24189 1524.19 9.94736L1501.81 34.0526C1496.51 39.7581 1489.08 43 1481.29 43H926.196C918.712 43 911.539 40.0038 906.279 34.6801L881.221 9.31992C875.961 3.99621 868.788 1 861.304 1H87.598C80.1719 1 73.05 3.95 67.799 9.20102L9.20101 67.799C3.94999 73.05 1 80.1719 1 87.598V315.075C1 322.101 3.64086 328.869 8.3986 334.038L34.1014 361.962C38.8591 367.131 41.5 373.899 41.5 380.925V970.299C41.5 977.786 38.5014 984.961 33.1741 990.222L9.9264 1013.18C4.53979 1018.5 1.53662 1025.77 1.6015 1033.34Z"
                        stroke="currentColor"
                    />
                </svg>
            </div>
            <div
                aria-hidden
                className="mask-t-from-65% absolute -inset-x-7 bottom-0">
                <svg
                    className="text-foreground/15 fill-background/35 max-md:scale-x-250 w-full origin-top-right max-md:translate-x-3 max-md:scale-y-125"
                    viewBox="0 0 2402 1372"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M1.6015 1033.34L4.26185 1343.72C4.39367 1359.1 16.9052 1371.49 32.2849 1371.48L2310.36 1369.51C2317.81 1369.5 2324.95 1366.53 2330.2 1361.25L2393.36 1297.69C2398.57 1292.44 2401.5 1285.35 2401.5 1277.95V1042.9C2401.5 1036.19 2399.09 1029.7 2394.71 1024.62L2364.79 989.877C2360.41 984.795 2358 978.311 2358 971.603V377.809C2358 370.258 2361.05 363.028 2366.46 357.758L2389.04 335.742C2394.45 330.472 2397.5 323.242 2397.5 315.691V29C2397.5 13.536 2384.96 1 2369.5 1H2300.5H1544.71C1536.92 1 1529.49 4.24189 1524.19 9.94736L1501.81 34.0526C1496.51 39.7581 1489.08 43 1481.29 43H926.196C918.712 43 911.539 40.0038 906.279 34.6801L881.221 9.31992C875.961 3.99621 868.788 1 861.304 1H87.598C80.1719 1 73.05 3.95 67.799 9.20102L9.20101 67.799C3.94999 73.05 1 80.1719 1 87.598V315.075C1 322.101 3.64086 328.869 8.3986 334.038L34.1014 361.962C38.8591 367.131 41.5 373.899 41.5 380.925V970.299C41.5 977.786 38.5014 984.961 33.1741 990.222L9.9264 1013.18C4.53979 1018.5 1.53662 1025.77 1.6015 1033.34Z"
                        stroke="currentColor"
                    />
                </svg>
            </div>
            <div className="@container relative pb-24 pt-32">
                <div className="mx-auto w-full max-w-5xl px-6">
                    <div>
                        <span className="text-primary font-mono text-sm uppercase">Platform</span>
                        <div className="mt-8 grid items-end gap-6 md:grid-cols-2">
                            <h2 className="text-foreground text-4xl font-semibold md:text-5xl"> Cutting-Edge tools to build subscriptions</h2>
                            <div className="lg:pl-12">
                                <p className="text-muted-foreground text-balance">Our platform combines cutting-edge AI models with intuitive interfaces to streamline your development workflow and boost productivity.</p>
                            </div>
                        </div>
                    </div>
                    <div className="@xl:grid-cols-2 @3xl:grid-cols-3 mt-16 grid gap-2 *:shadow-lg *:shadow-black/5 lg:-mx-8">
                        <Card className="group grid grid-rows-[auto_1fr] gap-8 rounded-2xl p-8">
                            <div>
                                <h3 className="text-foreground font-semibold">Team collaboration</h3>
                                <p className="text-muted-foreground mt-3">Discuss in context, mention teammates, and resolve threads without leaving the flow of work.</p>
                            </div>

                            <AddCommentIllustration variant="mixed" />
                        </Card>

                        <Card className="@xl:col-span-2 grid grid-rows-[auto_1fr] gap-8 overflow-hidden rounded-2xl px-8 pt-8">
                            <div className="max-w-md">
                                <h3 className="text-foreground font-semibold">Collaborative Analysis</h3>
                                <p className="text-muted-foreground mt-3">Turn scattered signals into shared understanding with live insights your whole team can explore.</p>
                            </div>
                            <MapIllustration />
                        </Card>

                        <Card className="@xl:@max-3xl:col-start-2 @max-3xl:row-start-1 group grid grid-rows-[auto_1fr] gap-8 overflow-hidden rounded-2xl p-8">
                            <div>
                                <h3 className="text-foreground font-semibold">Workflow Automation</h3>
                                <p className="text-muted-foreground mt-3">Trigger agents from events, chain tools with conditions.</p>
                            </div>

                            <div
                                aria-hidden
                                className="bg-linear-to-b border-background -m-8 flex flex-col justify-center border-x from-transparent to-zinc-50">
                                <VisualizationIllustration />
                            </div>
                        </Card>
                        <div className="@xl:col-span-2 grid grid-rows-[1fr_auto] gap-2 !bg-transparent !shadow-none">
                            <div className="@xl:grid-cols-2 grid gap-2 *:shadow-lg *:shadow-black/5">
                                <Card className="group grid grid-rows-[auto_1fr] gap-8 overflow-hidden rounded-2xl p-8">
                                    <div>
                                        <h3 className="text-foreground font-semibold">Omnichannel Messaging</h3>
                                        <p className="text-muted-foreground mt-3">Send campaigns across email, chat, and more—every reply lands in one unified inbox.</p>
                                    </div>

                                    <div
                                        aria-hidden
                                        className="bg-linear-to-b border-background -m-8 flex flex-col justify-center border-x from-transparent to-zinc-50 p-8">
                                        <MessageIllustration />
                                    </div>
                                </Card>
                                <Card className="group grid grid-rows-[auto_1fr] gap-8 overflow-hidden rounded-2xl p-8">
                                    <div>
                                        <h3 className="text-foreground font-semibold">Build in the cloud</h3>
                                        <p className="text-muted-foreground mt-3">Plan launches, manage approvals, and keep assets aligned—from brief to rollout.</p>
                                    </div>

                                    <div className="relative mb-3 flex">
                                        <CloudIcon className="stroke-background fill-background drop-shadow-orange-900/15 m-auto size-24 drop-shadow-2xl" />
                                        <CloudIcon className="absolute inset-0 m-auto size-32 stroke-orange-900/25 stroke-[0.1]" />
                                        <CloudIcon className="mask-b-from-35% absolute inset-0 m-auto size-24 fill-orange-100/50 stroke-orange-400 stroke-[0.1]" />
                                        <CloudIcon
                                            dasharray="0.2 0.2"
                                            className="absolute inset-0 m-auto size-40 stroke-orange-900/15 stroke-[0.1]"
                                        />
                                        <CloudIcon
                                            dasharray="0.2 0.2"
                                            className="absolute inset-0 m-auto size-48 stroke-orange-900/5 stroke-[0.1]"
                                        />
                                    </div>
                                </Card>
                            </div>
                            <Card className="rounded-2xl p-8 shadow-lg shadow-black/5">
                                <Integrations />
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

const integrationClasses = 'bg-card *:size-6 *:m-auto ring-border-illustration before:bg-linear-to-b relative flex size-7 rounded-md shadow-md shadow-black/10 ring-1 before:absolute before:inset-0.5 before:rounded-sm before:from-indigo-200/50'

const Integrations = () => (
    <div className="flex items-center justify-center gap-6 *:size-12">
        <div className={integrationClasses}>
            <Linear />
        </div>

        <div className="@md:block rounded-(--radius) bg-background/50 border-foreground/15 hidden aspect-square border border-dashed backdrop-blur-3xl"></div>
        <div className={cn(integrationClasses, 'before:from-zinc-200/50')}>
            <Openai />
        </div>
        <div className="@md:block rounded-(--radius) bg-background/50 border-foreground/15 hidden aspect-square border border-dashed backdrop-blur-3xl"></div>
        <div className={cn(integrationClasses, 'before:from-orange-200/50')}>
            <Cloudflare />
        </div>
        <div className="@md:block rounded-(--radius) bg-background/50 border-foreground/15 hidden aspect-square border border-dashed backdrop-blur-3xl"></div>
    </div>
)

const CloudIcon = ({ className, dasharray }: { className?: string; dasharray?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        className={cn(className)}>
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={dasharray}
            d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z"
        />
    </svg>
)