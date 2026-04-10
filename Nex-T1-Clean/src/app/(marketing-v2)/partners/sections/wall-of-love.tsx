import { Card } from '@/components/ui/card'

type Testimonial = {
    name: string
    role: string
    image: string
    quote: string
}

const testimonials: Testimonial[] = [
    {
        name: 'Jonathan Yombo',
        role: 'Software Engineer',
        image: 'https://randomuser.me/api/portraits/men/1.jpg',
        quote: 'Tailus is really extraordinary and very practical, no need to break your head. A real gold mine.',
    },
    {
        name: 'Yves Kalume',
        role: 'GDE - Android',
        image: 'https://randomuser.me/api/portraits/men/6.jpg',
        quote: 'With no experience in webdesign I just redesigned my entire website in a few minutes with tailwindcss thanks to Tailus.',
    },
    {
        name: 'Yucel Faruksahan',
        role: 'Tailkits Creator',
        image: 'https://randomuser.me/api/portraits/women/7.jpg',
        quote: 'Great work on tailfolio template. This is one of the best personal website that I have seen so far :)',
    },
    {
        name: 'Shekinah Tshiokufila',
        role: 'Senior Software Engineer',
        image: 'https://randomuser.me/api/portraits/men/4.jpg',
        quote: 'Tailus is redefining the standard of web design, with these blocks it provides an easy and efficient way for those who love beauty but may lack the time to implement it.',
    },
    {
        name: 'Zeki',
        role: 'Founder of ChatExtend',
        image: 'https://randomuser.me/api/portraits/men/5.jpg',
        quote: 'Using TailsUI has been like unlocking a secret design superpower. ',
    },
    {
        name: 'Khatab Wedaa',
        role: 'MerakiUI Creator',
        image: 'https://randomuser.me/api/portraits/women/10.jpg',
        quote: "Tailus is an elegant, clean, and responsive tailwind css components it's very helpful to start fast with your project.",
    },
    {
        name: 'Rodrigo Aguilar',
        role: 'TailwindAwesome Creator',
        image: 'https://randomuser.me/api/portraits/men/11.jpg',
        quote: 'I love Tailus ❤️. The component blocks are well-structured, simple to use, and beautifully designed.',
    },
    {
        name: 'Roland Tubonge',
        role: 'Software Engineer',
        image: 'https://randomuser.me/api/portraits/men/13.jpg',
        quote: 'Tailus is so well designed that even with a very poor knowledge of web design you can do miracles. Let yourself be seduced!',
    },
    {
        name: 'Yves Kalume',
        role: 'GDE - Android',
        image: 'https://randomuser.me/api/portraits/women/2.jpg',
        quote: 'With no experience in webdesign I just redesigned my entire website in a few minutes with tailwindcss thanks to Tailus.',
    },
]

const chunkArray = (array: Testimonial[], chunkSize: number): Testimonial[][] => {
    const result: Testimonial[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize))
    }
    return result
}

const testimonialChunks = chunkArray(testimonials, Math.ceil(testimonials.length / 3))

export function WallOfLoveSection() {
    return (
        <section>
            <div className="pb-32 pt-12 sm:pb-44 lg:pb-56">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="mx-auto max-w-2xl text-balance text-center">
                        <h2 className="text-foreground text-4xl font-semibold md:text-5xl">Loved by the Community</h2>
                        <p className="text-muted-foreground mt-6">Tailark is trusted by over 100 companies to help them scale their business and stay ahead of the competition.</p>
                    </div>
                    <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:-mx-8 lg:grid-cols-3">
                        {testimonialChunks.map((chunk, chunkIndex) => (
                            <div
                                key={chunkIndex}
                                className="space-y-6 sm:max-lg:last:hidden">
                                {chunk.map(({ name, role, quote, image }, index) => (
                                    <Card
                                        key={index}
                                        className="odd:bg-transparent">
                                        <div className="relative grid gap-8 p-6 lg:p-8">
                                            <p className="text-foreground">{quote}</p>

                                            <div className="grid grid-cols-[auto_1fr] gap-3">
                                                <div className="before:inset-ring-1 before:z-1 before:border-foreground/25 before:inset-ring-black/25 relative size-10 overflow-hidden rounded-full before:absolute before:inset-0 before:rounded-full before:border">
                                                    <img
                                                        alt={name}
                                                        src={image}
                                                        loading="lazy"
                                                        width="120"
                                                        height="120"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="text-sm font-medium">{name}</h3>
                                                    <span className="text-muted-foreground block text-sm tracking-wide">{role}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}