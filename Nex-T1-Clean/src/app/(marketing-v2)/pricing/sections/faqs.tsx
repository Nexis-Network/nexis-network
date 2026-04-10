import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import Link from 'next/link'
import { Container } from '@/components/container'

export function FAQs() {
    const faqItems = [
        {
            group: 'General',
            items: [
                {
                    id: 'item-1',
                    question: 'How long does shipping take?',
                    answer: 'Standard shipping takes 3-5 business days, depending on your location. Express shipping options are available at checkout for 1-2 business day delivery.',
                },
                {
                    id: 'item-2',
                    question: 'What payment methods do you accept?',
                    answer: 'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, Apple Pay, and Google Pay. For enterprise customers, we also offer invoicing options.',
                },
                {
                    id: 'item-3',
                    question: 'Can I change or cancel my order?',
                    answer: 'You can modify or cancel your order within 1 hour of placing it. After this window, please contact our customer support team who will assist you with any changes.',
                },
            ],
        },
        {
            group: 'Shipping',
            items: [
                {
                    id: 'item-1',
                    question: 'Do you ship internationally?',
                    answer: 'Standard shipping takes 3-5 business days, depending on your location. Express shipping options are available at checkout for 1-2 business day delivery.',
                },
                {
                    id: 'item-2',
                    question: 'What is your return policy?',
                    answer: 'We offer a 30-day return policy for most items. Products must be in original condition with tags attached. Some specialty items may have different return terms, which will be noted on the product page.',
                },
                {
                    id: 'item-3',
                    question: 'Do you ship internationally?',
                    answer: 'Standard shipping takes 3-5 business days, depending on your location. Express shipping options are available at checkout for 1-2 business day delivery.',
                },
            ],
        },
    ]

    return (
        <section id="faqs">
            <Container className="md:**:data-[slot=content]:py-0 border-b-dashed mt-2 border-b">
                <div className="grid max-md:gap-8 md:grid-cols-5 md:divide-x">
                    <div className="max-w-lg max-md:px-6 md:col-span-2 md:p-10 lg:p-12">
                        <h2 className="text-foreground text-4xl font-semibold">FAQs</h2>
                        <p className="text-muted-foreground mt-4 text-balance text-lg">Your questions answered</p>
                        <p className="text-muted-foreground mt-6 max-md:hidden">
                            Can't find what you're looking for? Contact our{' '}
                            <Link
                                href="#"
                                className="text-primary font-medium hover:underline">
                                customer support team
                            </Link>
                        </p>
                    </div>

                    <div className="space-y-12 md:col-span-3 md:px-4 md:pb-4 md:pt-10 lg:pt-12">
                        {faqItems.map((item) => (
                            <div
                                className="space-y-4"
                                key={item.group}>
                                <h3 className="text-foreground pl-6 text-lg font-semibold">{item.group}</h3>
                                <Accordion
                                    type="single"
                                    collapsible
                                    className="-space-y-1">
                                    {item.items.map((item) => (
                                        <AccordionItem
                                            key={item.id}
                                            value={item.id}
                                            className="data-[state=open]:bg-card data-[state=open]:ring-foreground/5 group peer rounded-xl border-none px-6 py-1 data-[state=open]:border-none data-[state=open]:shadow data-[state=open]:ring-1">
                                            <AccordionTrigger className="not-group-last:border-b cursor-pointer rounded-none text-base transition-none hover:no-underline data-[state=open]:border-transparent hover:[&>svg]:translate-y-1 hover:data-[state=open]:[&>svg]:translate-y-0">{item.question}</AccordionTrigger>
                                            <AccordionContent>
                                                <p className="text-muted-foreground text-base">{item.answer}</p>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="text-muted-foreground mt-12 px-6 md:hidden">
                    Can't find what you're looking for? Contact our{' '}
                    <Link
                        href="#"
                        className="text-primary font-medium hover:underline">
                        customer support team
                    </Link>
                </p>
            </Container>
            <Container
                aria-hidden
                className="mask-b-from-65% **:data-[slot=content]:py-6 border-t-0 border-dashed bg-transparent">
                <div />
            </Container>
        </section>
    )
}