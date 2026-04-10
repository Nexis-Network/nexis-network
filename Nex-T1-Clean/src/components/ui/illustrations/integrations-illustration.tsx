import { OpenAI } from '@/components/ui/svgs/open-ai'
import { Linear } from '@/components/ui/svgs/linear'
import { Vercel } from '@/components/ui/svgs/vercel'
import { Cloudflare } from '@/components/ui/svgs/cloudflare'
import { Claude } from '@/components/ui/svgs/claude'
import { Gemini } from '@/components/ui/svgs/gemini'
import { Replit } from '@/components/ui/svgs/replit'
import { VSCodium } from '@/components/ui/svgs/vs-codium'

export const IntegrationsIllustration = () => {
    return (
        <div>
            <div className="relative mx-auto max-w-sm">
                <div className="w-1/7 border-foreground/10 absolute -bottom-64 -top-16 left-0 border-l border-dashed" />
                <div className="w-1/7 left-1/7 border-foreground/10 -top-13 absolute -bottom-56 border-l border-dashed" />
                <div className="w-1/7 left-2/7 border-foreground/10 absolute -bottom-52 -top-9 border-l border-dashed" />
                <div className="w-1/7 left-3/7 border-foreground/10 absolute -bottom-48 -top-6 border-x border-dashed" />
                <div className="w-1/7 left-5/7 border-foreground/10 absolute -bottom-52 -top-9 border-x border-dashed" />
                <div className="w-1/7 left-6/7 border-foreground/10 -top-13 absolute -bottom-64 border-r border-dashed" />
            </div>
            <div className="lg:before:mask-x-from-85% before:border-foreground/10 relative mx-auto max-w-xl before:absolute before:inset-0 before:border-t before:border-dashed">
                <div className="*:bg-illustration *:ring-border shadow-black/6.5 mx-auto grid max-w-sm grid-cols-7 *:relative *:flex *:aspect-square *:items-center *:justify-center *:rounded-lg *:shadow-md *:ring-1">
                    <div className="col-start-4">
                        <Cloudflare className="size-5" />
                    </div>
                    <div className="col-start-6">
                        <Gemini className="size-5" />
                    </div>
                </div>
            </div>
            <div className="lg:before:mask-x-from-85% before:border-foreground/10 relative before:absolute before:inset-0 before:border-y before:border-dashed">
                <div className="mx-auto grid max-w-sm grid-cols-7 *:relative *:flex *:aspect-square *:items-center *:justify-center">
                    <div className="bg-foreground/3 -mr-px border">
                        <Vercel className="size-5" />
                    </div>
                    <div className="bg-foreground/3 col-start-3 -mr-px border">
                        <VSCodium className="*:fill-foreground size-5" />
                    </div>
                    <div className="bg-illustration ring-border-illustration shadow-black/6.5 col-start-5 rounded-lg shadow-md ring-1">
                        <Linear className="size-5" />
                    </div>
                    <div className="bg-foreground/3 col-start-7 -mb-px -ml-px border">
                        <Replit className="*:fill-foreground size-5" />
                    </div>
                </div>
            </div>
            <div className="lg:before:mask-x-from-85% before:border-foreground/10 relative mx-auto max-w-2xl before:absolute before:inset-0 before:border-b before:border-dashed">
                <div className="mx-auto grid max-w-sm grid-cols-7 *:relative *:flex *:aspect-square *:items-center *:justify-center">
                    <div className="bg-foreground/3 col-start-2 -mr-px -mt-px border">
                        <OpenAI className="size-5" />
                    </div>
                    <div className="bg-illustration ring-border-illustration shadow-black/6.5 col-start-5 rounded-lg shadow-md ring-1">
                        <Claude className="size-5" />
                    </div>
                </div>
            </div>
        </div>
    )
}