
import { createClient } from 'next-sanity'
import { getAllPostsWithBody } from '../src/modules/blog/data'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_API_TOKEN

if (!projectId || !token) {
    console.error('Missing configuration. Please check .env.local')
    process.exit(1)
}

const client = createClient({
    projectId,
    dataset,
    token,
    apiVersion: '2024-01-01',
    useCdn: false,
})

async function migrate() {
    console.log('Starting migration...')

    const posts = await getAllPostsWithBody()

    for (const post of posts) {
        console.log(`Migrating post: ${post.title}`)

        // 1. Create or get Author
        let authorId = null
        if (post.authors && post.authors.length > 0) {
            const authorData = post.authors[0]
            const authorDoc = {
                _type: 'author',
                name: authorData.name,
                // We are skipping image upload for now to keep it simple, or we can add it if needed
            }
            // Simple de-duplication by name
            const existingAuthor = await client.fetch(`*[_type == "author" && name == $name][0]`, { name: authorData.name })
            if (existingAuthor) {
                authorId = existingAuthor._id
            } else {
                const res = await client.create(authorDoc)
                authorId = res._id
            }
        }

        // 2. Create or get Category
        let categoryId = null
        if (post.category) {
            const catDoc = {
                _type: 'category',
                title: post.category.title,
                slug: { _type: 'slug', current: post.category.slug },
            }
            const existingCat = await client.fetch(`*[_type == "category" && slug.current == $slug][0]`, { slug: post.category.slug })
            if (existingCat) {
                categoryId = existingCat._id
            } else {
                const res = await client.create(catDoc)
                categoryId = res._id
            }
        }

        // 3. Create Post
        const postDoc = {
            _type: 'post',
            title: post.title,
            slug: { _type: 'slug', current: post.slug },
            description: post.description,
            publishedAt: post.publishedAt,
            body: post.body, // Assuming Portable Text structure is compatible
            author: authorId ? { _type: 'reference', ref: authorId } : undefined,
            categories: categoryId ? [{ _type: 'reference', ref: categoryId }] : [],
        }

        // Check if post exists
        const existingPost = await client.fetch(`*[_type == "post" && slug.current == $slug][0]`, { slug: post.slug })
        if (!existingPost) {
            await client.create(postDoc)
            console.log(`Created post: ${post.title}`)
        } else {
            console.log(`Post already exists: ${post.title}`)
        }
    }

    console.log('Migration complete!')
}

migrate().catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
})
