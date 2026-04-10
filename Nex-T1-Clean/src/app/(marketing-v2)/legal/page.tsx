import Link from 'next/link'
import { Container, Separator } from '@/components/container'
import { getAllLegalDocs } from '@/lib/legal-docs'
import { formatDate } from '@/lib/format-date'

export default function LegalPage() {
    const docs = getAllLegalDocs()

    return (
        <>
            <section id="home">
                <div className="relative">
                    <Container
                        asGrid
                        className="p-[0.5px]">
                        <div
                            data-grid-content
                            className="@4xl:py-20! py-12!">
                            <h1 className="text-foreground text-balance text-center text-5xl font-semibold tracking-tight">Explore Tailark Legal Policies</h1>
                        </div>
                    </Container>
                    <Container asGrid>
                        <div className="@2xl:grid-cols-2 @4xl:grid-cols-3 grid gap-px">
                            {docs.map((doc) => (
                                <div
                                    data-grid-content
                                    key={doc.slug}
                                    className="@4xl:p-12 hover:bg-card @max-2xl:flex-col group relative p-8">
                                    <Link
                                        href={`/grid-2/legal-two/${doc.slug}`}
                                        className="text-foreground group-hover:text-primary text-xl font-semibold after:absolute after:inset-0">
                                        {doc.title}
                                    </Link>
                                    <p className="text-muted-foreground mt-2 text-sm">Effective {formatDate(doc.effectiveDate)}</p>

                                    <div
                                        aria-hidden
                                        className="pointer-events-none absolute inset-0 rounded opacity-0 shadow-2xl shadow-indigo-900/15 duration-200 group-hover:opacity-100"
                                    />
                                </div>
                            ))}
                        </div>
                    </Container>
                </div>
            </section>

            <Separator className="h-16" />
        </>
    )
}