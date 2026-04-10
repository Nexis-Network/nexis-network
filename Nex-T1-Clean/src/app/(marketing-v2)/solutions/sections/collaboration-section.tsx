import { Container, Separator } from '@/components/container'
import { FeatureCard, FeatureCardDescription, FeatureCardCIllustration, FeatureCardContent, FeatureCardTitle } from '@/components/ui/feature-card'
import { CalendarCheck, KanbanSquare, MessageSquareText, SquareDashedMousePointer, Video } from 'lucide-react'
import { Meeting4Illustration } from "@/components/illustrations/meeting-4"
import { CollbarationCommentIllustration } from "@/components/illustrations/collaboration-comment"
import { Kanban2Illustration } from "@/components/illustrations/kanban-2"
import { CalendarIllustration } from '@/components/illustrations/calendar'

export const CollaborationSection = () => {
    return (
        <>
            <Container className="@4xl:px-12 px-6 py-3">
                <div className="text-muted-foreground flex items-center justify-center gap-3 font-mono text-sm uppercase">
                    <SquareDashedMousePointer
                        aria-hidden
                        className="size-4"
                    />
                    Collaboration
                </div>
            </Container>
            <Container className="py-16 lg:py-24">
                <div className="mx-auto max-w-2xl space-y-6 text-center">
                    <h2 className="text-foreground text-balance text-4xl font-semibold lg:text-5xl">Work Together, Seamlessly</h2>
                    <p className="text-muted-foreground text-balance text-lg">Bring your team closer with built-in video calls, threaded discussions, shared boards, and smart scheduling — all in one place.</p>
                </div>
            </Container>
            <Container
                asGrid
                className="relative">
                <h2 className="sr-only">Features</h2>
                <div className="@2xl:grid-cols-2 @4xl:grid-cols-10 grid gap-px [--color-primary:var(--color-indigo-500)]">
                    <div className="@max-4xl:hidden">
                        <div data-grid-content />
                    </div>
                    <div className="@4xl:col-span-4">
                        <FeatureCard>
                            <FeatureCardContent>
                                <FeatureCardTitle>
                                    <Video className="size-4" />
                                    Video Meetings
                                </FeatureCardTitle>
                                <FeatureCardDescription>
                                    <span className="text-foreground">Jump into face-to-face calls instantly.</span> Screen share, collaborate, and stay connected with your team in real time.
                                </FeatureCardDescription>
                            </FeatureCardContent>
                            <FeatureCardCIllustration>
                                <Meeting4Illustration />
                            </FeatureCardCIllustration>
                        </FeatureCard>
                    </div>
                    <div className="@4xl:col-span-4">
                        <FeatureCard>
                            <FeatureCardContent>
                                <FeatureCardTitle>
                                    <MessageSquareText className="size-4" />
                                    Threaded Comments
                                </FeatureCardTitle>
                                <FeatureCardDescription>
                                    <span className="text-foreground">Keep conversations in context.</span> React with emoji and reply in threads without losing focus.
                                </FeatureCardDescription>
                            </FeatureCardContent>
                            <FeatureCardCIllustration className="relative">
                                <CollbarationCommentIllustration />
                            </FeatureCardCIllustration>
                        </FeatureCard>
                    </div>
                    <div className="@max-4xl:hidden">
                        <div data-grid-content />
                    </div>
                </div>
            </Container>
            <Separator className="h-12" />
            <Container
                asGrid
                className="relative">
                <h2 className="sr-only">Features</h2>
                <div className="@2xl:grid-cols-2 @4xl:grid-cols-10 grid gap-px [--color-primary:var(--color-indigo-500)]">
                    <div className="@max-4xl:hidden">
                        <div data-grid-content />
                    </div>
                    <div className="@4xl:col-span-4">
                        <FeatureCard>
                            <FeatureCardContent>
                                <FeatureCardTitle>
                                    <KanbanSquare className="size-4" />
                                    Task Boards
                                </FeatureCardTitle>
                                <FeatureCardDescription>
                                    <span className="text-foreground">Visualize work at every stage.</span> Drag tasks across columns and track progress on a shared board.
                                </FeatureCardDescription>
                            </FeatureCardContent>
                            <FeatureCardCIllustration>
                                <Kanban2Illustration />
                            </FeatureCardCIllustration>
                        </FeatureCard>
                    </div>
                    <div className="@4xl:col-span-4">
                        <FeatureCard>
                            <FeatureCardContent>
                                <FeatureCardTitle>
                                    <CalendarCheck className="size-4" />
                                    Meeting Scheduling
                                </FeatureCardTitle>
                                <FeatureCardDescription>
                                    <span className="text-foreground">Schedule meetings without the back-and-forth.</span> Send invites, set agendas, and RSVP in one click.
                                </FeatureCardDescription>
                            </FeatureCardContent>
                            <FeatureCardCIllustration>
                                <CalendarIllustration />
                            </FeatureCardCIllustration>
                        </FeatureCard>
                    </div>
                    <div className="@max-4xl:hidden">
                        <div data-grid-content />
                    </div>
                </div>
            </Container>
        </>
    )
}