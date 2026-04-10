import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { Container, Separator } from '@/components/container'
import { getLegalDocBySlug, getAllLegalDocs, getAllLegalSlugs } from '@/lib/legal-docs'
import { mdxComponents } from '@/components/mdx-components'
import { formatDate } from '@/lib/format-date'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export async function generateStaticParams() {
    const slugs = getAllLegalSlugs()
    return slugs.map((slug) => ({ document: slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ document: string }> }) {
    const { document } = await params
    const doc = getLegalDocBySlug(document)

    if (!doc) {
        return { title: 'Document Not Found' }
    }

    return {
        title: `${doc.title} - Legal`,
    }
}

export default async function LegalDocumentPage({ params }: { params: Promise<{ document: string }> }) {
    const { document } = await params
    const doc = getLegalDocBySlug(document)

    if (!doc) {
        notFound()
    }

    const docs = getAllLegalDocs()

    return (
        <>
            <section>
                <div className="relative">
                    <Container
                        asGrid
                        className="@4xl:grid-cols-4 @xl:grid">
                        <div className="@max-4xl:hidden">
                            <div
                                data-grid-content
                                className="@4xl:p-12 p-8">
                                <nav className="@4xl:sticky @4xl:top-32">
                                    <span className="text-foreground mb-4.5 block text-xl font-semibold">Legal</span>
                                    {docs.map((doc) => (
                                        <Link
                                            key={doc.slug}
                                            href={`/grid-2/legal-two/${doc.slug}`}
                                            data-active={doc.slug === document}
                                            className="text-muted-foreground hover:text-primary data-[active=true]:text-shadow-[0.3px_0_0_currentColor] data-[active=true]:text-primary group-hover:text-primary block py-1.5">
                                            {doc.title}
                                        </Link>
                                    ))}
                                </nav>
                            </div>
                        </div>
                        <div className="@4xl:col-span-3">
                            <div
                                data-grid-content
                                className="@4xl:p-12 p-8">
                                <div className="max-w-2xl">
                                    <Link
                                        href="/grid-2/legal-two"
                                        className="@4xl:hidden text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1 text-sm transition-colors">
                                        <ChevronLeft className="size-4" />
                                        All Legal Documents
                                    </Link>
                                    <h1 className="text-foreground text-balance text-6xl font-semibold tracking-tight sm:text-8xl sm:font-bold">{doc.title}</h1>
                                    <p className="text-muted-foreground mt-6">
                                        <span className="text-foreground">Effective date:</span> {formatDate(doc.effectiveDate)}
                                    </p>

                                    <MDXRemote
                                        source={doc.content}
                                        components={mdxComponents}
                                    />
                                </div>
                            </div>
                        </div>
                    </Container>
                </div>
            </section>

            <Separator className="h-16" />
        </>
    )
}