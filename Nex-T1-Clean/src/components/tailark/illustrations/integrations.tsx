import { buttonVariants } from '@/components/ui/button'
import { Link, Plus } from 'lucide-react'
import { Gemini } from '@/components/ui/svgs/gemini'
import { Replit } from '@/components/ui/svgs/replit'

export const IntegrationsIllustration = () => (
    <div
        aria-hidden
        className="bg-foreground/5 group rounded-2xl">
        <div className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-medium">
            <Link className="size-3.5 opacity-50" />
            Integrations
        </div>
        <div className="relative">
            <div className="absolute inset-0 scale-100 blur-lg transition-all duration-300 dark:opacity-35">
                <div className="bg-linear-to-r/increasing animate-hue-rotate absolute inset-x-6 bottom-0 top-12 -translate-y-3 from-pink-400 to-purple-400"></div>
            </div>
            <div className="bg-illustration ring-foreground/10 relative overflow-hidden rounded-2xl border border-transparent px-6 py-3 shadow-md shadow-black/5 ring-1">
                <Integration
                    icon={<Gemini />}
                    name="Gemini"
                    description="The AI model that powers Google's search engine."
                />
                <Integration
                    icon={<Replit />}
                    name="Replit"
                    description="The AI model that powers Google's search engine."
                />
            </div>
        </div>
    </div>
)

const Integration = ({ icon, name, description }: { icon: React.ReactNode; name: string; description: string }) => {
    return (
        <div className="grid max-w-xs grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-dashed py-3 last:border-b-0">
            <div className="bg-muted border-foreground/5 flex size-12 items-center justify-center rounded-lg border *:size-5">{icon}</div>
            <div className="space-y-0.5">
                <h3 className="text-sm font-medium">{name}</h3>
                <p className="text-muted-foreground line-clamp-1 text-sm">{description}</p>
            </div>
            <div className={buttonVariants({ variant: 'outline', size: 'icon' })}>
                <Plus className="size-4" />
            </div>
        </div>
    )
}

export default IntegrationsIllustration