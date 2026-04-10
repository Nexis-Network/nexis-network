import { Container } from '@/components/container'
import { FeatureCard, FeatureCardDescription, FeatureCardCIllustration, FeatureCardContent, FeatureCardTitle } from '@/components/ui/feature-card'
import { TaskPlanningIllustration } from '@/components/illustrations/task-planning-illustration'
import { MapIllustration } from '@/components/illustrations/map-illustration'
import { AiSuggestionIllustration } from "@/components/illustrations/ai-suggestion"
import { Globe, ListChecks, Sparkles } from 'lucide-react'

export default function MoreFeatures() {
    return (
        <section className="[--color-primary:var(--color-indigo-500)]">
            <Container
                asGrid
                className="@2xl:grid-cols-5 @5xl:grid-cols-10 @5xl:grid">
                <div className="@max-2xl:hidden @max-5xl:row-start-2">
                    <div data-grid-content />
                </div>

                <div className="@5xl:col-span-4 col-span-full">
                    <div
                        data-grid-content
                        className="@2xl:p-12 p-6">
                        <div className="@5xl:sticky @5xl:top-32 @max-5xl:text-center @max-5xl:mx-auto @5xl:h-fit @5xl:max-w-xs max-w-xl text-balance">
                            <h2 className="text-foreground mb-6 text-4xl font-semibold">Even More Built In</h2>
                            <p className="text-muted-foreground text-lg">Powerful tools that go beyond the basics — AI writing, global reach, and smart planning out of the box.</p>
                        </div>
                    </div>
                </div>

                <div className="@2xl:col-span-3 @5xl:col-span-4 grid gap-px">
                    <FeatureCard className="@max-5xl:h-auto">
                        <FeatureCardContent>
                            <FeatureCardTitle>
                                <Sparkles className="size-4" />
                                AI Writing Assistant
                            </FeatureCardTitle>
                            <FeatureCardDescription className="text-balance">
                                <span className="text-foreground">Draft, refine, and polish content instantly.</span> Get context-aware suggestions powered by AI.
                            </FeatureCardDescription>
                        </FeatureCardContent>
                        <FeatureCardCIllustration>
                            <AiSuggestionIllustration />
                        </FeatureCardCIllustration>
                    </FeatureCard>

                    <FeatureCard className="@max-5xl:h-auto">
                        <FeatureCardContent>
                            <FeatureCardTitle>
                                <Globe className="size-4" />
                                Global Infrastructure
                            </FeatureCardTitle>
                            <FeatureCardDescription className="text-balance">
                                <span className="text-foreground">Deploy to edge locations worldwide.</span> Serve users with low latency from any region.
                            </FeatureCardDescription>
                        </FeatureCardContent>
                        <FeatureCardCIllustration className="relative">
                            <div className="mask-radial-from-35% @4xl:-mx-32 relative w-full self-center">
                                <MapIllustration />
                            </div>
                        </FeatureCardCIllustration>
                    </FeatureCard>

                    <FeatureCard className="@max-5xl:h-auto">
                        <FeatureCardContent>
                            <FeatureCardTitle>
                                <ListChecks className="size-4" />
                                Smart Planning
                            </FeatureCardTitle>
                            <FeatureCardDescription className="text-balance">
                                <span className="text-foreground">Organize work with intelligent priorities.</span> Auto-schedule tasks based on deadlines and capacity.
                            </FeatureCardDescription>
                        </FeatureCardContent>
                        <FeatureCardCIllustration className="items-start">
                            <TaskPlanningIllustration />
                        </FeatureCardCIllustration>
                    </FeatureCard>
                </div>
                <div className="@max-2xl:hidden">
                    <div data-grid-content />
                </div>
            </Container>
        </section>
    )
}