'use client'
import React, { useEffect, useRef, useState } from 'react'
import CodeBlock from "./code-block"
import { Braces, type LucideIcon } from 'lucide-react'

const USERS_JSON = `{
    "users": [
        {
            "name": "John Doe",
            "email": "john.doe@example.com",
            "age": 30,
            "cart": [
                {
                    "id": 1,
                    "name": "Product 1",
                    "price": 10
                },
                {
                    "id": 2,
                    "name": "Product 2",
                    "price": 20
                }
            ]
        },
        {
            "name": "Jane Smith",
            "email": "jane.smith@example.com",
            "age": 25,
            "cart": [
                {
                    "id": 1,
                    "name": "Product 1",
                    "price": 10
                },
                {
                    "id": 2,
                    "name": "Product 2",
                    "price": 20
                }
            ]
        }
    ]
}`

const RESPONSE_JSON = `{
    "status": "success",
    "code": 200,
    "data": {
        "products": [
            {
                "id": "p-123",
                "name": "Premium Headphones",
                "price": 149.99,
                "stock": 45,
                "categories": ["electronics", "audio"]
            },
            {
                "id": "p-456",
                "name": "Wireless Keyboard",
                "price": 89.99,
                "stock": 23,
                "categories": ["electronics", "accessories"]
            },
            {
                "id": "p-789",
                "name": "Smart Watch",
                "price": 199.99,
                "stock": 12,
                "categories": ["electronics", "wearables"]
            }
        ],
        "pagination": {
            "total": 3,
            "page": 1,
            "limit": 10
        }
    }
}`

interface Tab {
    id: string
    label: string
    icon: LucideIcon
    code: string
}

const tabs: Tab[] = [
    {
        id: 'users',
        label: 'users.json',
        icon: Braces,
        code: USERS_JSON,
    },
    {
        id: 'response',
        label: 'response.json',
        icon: Braces,
        code: RESPONSE_JSON,
    },
]

export default function CodeBlockIllustration() {
    const [indicatorLeft, setIndicatorLeft] = useState(0)
    const [indicatorWidth, setIndicatorWidth] = useState(0)
    const [activeTab, setActiveTab] = useState<string>(tabs[0].id)
    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

    useEffect(() => {
        const activeTabRef = tabRefs.current[activeTab]
        if (activeTabRef) {
            const parentElement = activeTabRef.parentElement
            if (parentElement) {
                const parentLeft = parentElement.getBoundingClientRect().left
                const buttonLeft = activeTabRef.getBoundingClientRect().left
                const buttonWidth = activeTabRef.offsetWidth

                const newIndicatorLeft = buttonLeft - parentLeft + 16
                const newIndicatorWidth = buttonWidth
                setIndicatorLeft(newIndicatorLeft)
                setIndicatorWidth(newIndicatorWidth)
            }
        }
    }, [activeTab])

    const activeTabData = tabs.find((tab) => tab.id === activeTab)

    return (
        <div className="ring-foreground/10 bg-(--code-background) relative z-10 overflow-hidden rounded-2xl border border-transparent px-1 pb-1 shadow-lg shadow-black/10 ring-1 backdrop-blur [--code-background:color-mix(in_oklab,var(--color-zinc-900)35%,var(--color-zinc-950))] [--code-editor-background:color-mix(in_oklab,var(--color-zinc-900)75%,var(--color-zinc-950))]">
            <div className="relative h-10">
                <div className="flex h-full items-center gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            ref={(el) => {
                                tabRefs.current[tab.id] = el
                            }}
                            onClick={() => setActiveTab(tab.id)}
                            data-tab={tab.id}
                            data-state={activeTab === tab.id ? 'active' : ''}
                            className="not-data-[state=active]:hover:bg-muted/50 text-foreground/75 relative z-10 flex h-8 items-center gap-1.5 rounded-lg px-3 font-mono text-xs first:rounded-tl-xl">
                            <tab.icon className="size-3 text-amber-600" />
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div
                    className="bg-(--code-editor-background) absolute -bottom-px top-1 -translate-x-4 rounded-t-xl border-x border-t"
                    style={{ left: indicatorLeft, width: `${indicatorWidth}px` }}>
                    {activeTab === tabs[0].id ? (
                        <div className="bg-(--code-editor-background) absolute -bottom-4 -left-px size-4 border-l"></div>
                    ) : (
                        <div className="bg-(--code-editor-background) absolute -left-4 bottom-0 size-4">
                            <div className="bg-(--code-background) absolute inset-0 rounded-br-xl border-b border-r"></div>
                        </div>
                    )}

                    <div className="bg-(--code-editor-background) absolute -right-4 bottom-0 size-4">
                        <div className="bg-(--code-background) absolute inset-0 rounded-bl-xl border-b border-l"></div>
                    </div>
                </div>
            </div>

            <div className="bg-(--code-editor-background) h-96 rounded-xl border">
                <div className="mask-y-from-80% scheme-dark h-full overflow-auto">
                    <CodeBlock
                        code={activeTabData?.code ?? ''}
                        lang="json"
                        maxHeight={360}
                        lineNumbers
                        className="-mx-1 [&_pre]:h-fit [&_pre]:min-h-[12rem] [&_pre]:rounded-xl [&_pre]:border-none [&_pre]:!bg-transparent [&_pre]:pb-0"
                    />
                </div>
            </div>
        </div>
    )
}