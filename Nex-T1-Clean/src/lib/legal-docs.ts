import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export type LegalDocument = {
    title: string
    slug: string
    effectiveDate: string
    content: string
}

const CONTENT_DIR = path.join(process.cwd(), 'content/legal')

export function getAllLegalDocs(): Omit<LegalDocument, 'content'>[] {
    const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.mdx'))

    return files
        .map((file) => {
            const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8')
            const { data } = matter(raw)
            return {
                title: data.title as string,
                slug: data.slug as string,
                effectiveDate: data.effectiveDate as string,
            }
        })
        .sort((a, b) => a.title.localeCompare(b.title))
}

export function getLegalDocBySlug(slug: string): LegalDocument | null {
    const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.mdx'))

    for (const file of files) {
        const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8')
        const { data, content } = matter(raw)
        if (data.slug === slug) {
            return {
                title: data.title as string,
                slug: data.slug as string,
                effectiveDate: data.effectiveDate as string,
                content,
            }
        }
    }

    return null
}

export function getAllLegalSlugs(): string[] {
    return getAllLegalDocs().map((doc) => doc.slug)
}