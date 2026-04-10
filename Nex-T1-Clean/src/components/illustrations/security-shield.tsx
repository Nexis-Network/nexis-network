'use client'

import type { SVGProps } from 'react'
import { useMotionValue, motion } from 'motion/react'
import { useState, useMemo } from 'react'

const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?<>{}[]'

function generateRandomString(length: number) {
    let result = ''
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
}

export const SecurityAuditIllustration = () => {
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)
    const initialString = useMemo(() => generateRandomString(1500), [])
    const [randomString, setRandomString] = useState(initialString)

    function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect()
        mouseX.set(clientX - left)
        mouseY.set(clientY - top)
        setRandomString(generateRandomString(1500))
    }

    return (
        <div
            aria-hidden
            className="w-full px-8 pt-4">
            <div
                onMouseMove={onMouseMove}
                className="group/card relative flex aspect-square items-center justify-center overflow-hidden">
                <div className="pointer-events-none">
                    <motion.div className="absolute inset-0 transition duration-500 group-hover/card:opacity-100">
                        <p className="wrap-break-word text-foreground/10 absolute inset-x-0 h-full whitespace-pre-wrap font-mono text-[12px]/4 transition duration-500">{randomString}</p>
                    </motion.div>
                    <div className="bg-radial absolute inset-20 m-auto rounded-full from-blue-600 to-purple-500 opacity-10 blur-2xl" />
                    <div className="bg-radial absolute inset-20 m-auto rounded-full from-emerald-600 to-indigo-500 to-75% mix-blend-overlay blur-2xl" />
                </div>
                <Shield
                    strokeWidth={0.1}
                    className="z-1 drop-shadow-black/15 text-foreground/15 relative size-40 fill-white drop-shadow-2xl"
                />
                <Shield
                    strokeWidth={0.1}
                    className="z-2 mask-radial-at-center mask-radial-from-5% mask-radial-[25%_25%] absolute inset-0 m-auto size-40 fill-zinc-200"
                />

                <Shield
                    strokeWidth={0.6}
                    className="text-foreground/15 size-68 absolute inset-0 m-auto blur-md"
                />

                <Shield
                    strokeWidth={1}
                    className="size-84 absolute inset-0 m-auto text-white blur-xl"
                />

                <svg
                    width="65"
                    height="55"
                    viewBox="0 0 65 55"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="z-2 absolute inset-0 m-auto size-8">
                    <g filter="url(#filter0_di_2138_6)">
                        <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M56.8421 0.463511C57.5636 0.0317472 58.4253 -0.105192 59.2462 0.0814351C60.0671 0.268062 60.7834 0.763743 61.2447 1.46445L64.4686 6.35574C64.8889 6.99472 65.0687 7.76085 64.9763 8.51888C64.884 9.27692 64.5254 9.97814 63.9639 10.4988L63.9541 10.5117L63.9085 10.5538L63.7229 10.7255L62.9902 11.422C58.9361 15.3339 55.0048 19.3698 51.2019 23.5239C44.0476 31.3499 35.5516 41.5925 29.8333 51.5306C28.2376 54.3034 24.3397 54.8994 22.0276 52.5056L0.909722 30.6794C0.607087 30.3665 0.370783 29.9963 0.214855 29.5907C0.0589269 29.1851 -0.013441 28.7525 0.00205191 28.3186C0.0175448 27.8847 0.120582 27.4583 0.30504 27.0647C0.489499 26.6712 0.751612 26.3186 1.0758 26.0278L7.45839 20.3008C8.01928 19.7978 8.73849 19.5043 9.49293 19.4706C10.2474 19.4369 10.9901 19.6651 11.594 20.1161L22.3696 28.1528C39.202 11.6422 48.7466 5.30622 56.8421 0.463511Z"
                            fill="var(--color-indigo-400)"
                        />
                        <path
                            d="M56.8936 0.549805C57.5929 0.131344 58.4279 -0.00208033 59.2236 0.178711C60.0194 0.359637 60.714 0.840472 61.1611 1.51953L64.3848 6.41113C64.792 7.03033 64.9664 7.77241 64.877 8.50684C64.7875 9.24131 64.4397 9.92119 63.8955 10.4258L63.8896 10.4316L63.8838 10.4385L63.876 10.4473L63.8408 10.4805L63.6553 10.6523L63.6543 10.6533L62.9209 11.3496C58.8653 15.263 54.9322 19.3005 51.1279 23.4561C43.972 31.2838 35.4708 41.5331 29.7471 51.4805C28.1835 54.1976 24.3639 54.7805 22.0996 52.4365L0.981445 30.6104C0.688136 30.3071 0.459691 29.9477 0.308594 29.5547C0.157509 29.1617 0.0865656 28.7427 0.101562 28.3223C0.116571 27.9019 0.216827 27.4887 0.395508 27.1074C0.551866 26.7738 0.765888 26.4703 1.02734 26.2109L1.14258 26.1025L7.52539 20.375C8.06892 19.8876 8.76589 19.603 9.49707 19.5703C10.1371 19.5417 10.7686 19.7081 11.3086 20.043L11.5342 20.1963L22.3096 28.2334L22.3789 28.2842L22.4395 28.2246C39.2663 11.7196 48.805 5.38841 56.8936 0.549805Z"
                            stroke="white"
                            strokeWidth="0.2"
                        />
                    </g>
                    <defs>
                        <filter
                            id="filter0_di_2138_6"
                            x="0"
                            y="0"
                            width="65"
                            height="58"
                            filterUnits="userSpaceOnUse"
                            colorInterpolationFilters="sRGB">
                            <feFlood
                                floodOpacity="0"
                                result="BackgroundImageFix"
                            />
                            <feColorMatrix
                                in="SourceAlpha"
                                type="matrix"
                                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                result="hardAlpha"
                            />
                            <feOffset dy="1" />
                            <feComposite
                                in2="hardAlpha"
                                operator="out"
                            />
                            <feColorMatrix
                                type="matrix"
                                values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"
                            />
                            <feBlend
                                mode="normal"
                                in2="BackgroundImageFix"
                                result="effect1_dropShadow_2138_6"
                            />
                            <feBlend
                                mode="normal"
                                in="SourceGraphic"
                                in2="effect1_dropShadow_2138_6"
                                result="shape"
                            />
                            <feColorMatrix
                                in="SourceAlpha"
                                type="matrix"
                                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                result="hardAlpha"
                            />
                            <feOffset dy="7" />
                            <feGaussianBlur stdDeviation="2" />
                            <feComposite
                                in2="hardAlpha"
                                operator="arithmetic"
                                k2="-1"
                                k3="1"
                            />
                            <feColorMatrix
                                type="matrix"
                                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
                            />
                            <feBlend
                                mode="normal"
                                in2="shape"
                                result="effect2_innerShadow_2138_6"
                            />
                        </filter>
                    </defs>
                </svg>
            </div>
        </div>
    )
}

const Shield = (props: SVGProps<SVGSVGElement>) => {
    return (
        <svg
            {...props}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path
                d="M9.87169 0.00699997L9.98569 0L10.1037 0.00699997L10.1627 0.0150001L10.2237 0.0280001L10.3347 0.062C10.4113 0.0903282 10.4842 0.127942 10.5517 0.174L10.6557 0.256L10.9107 0.474C12.928 2.14956 15.4776 3.0493 18.0997 3.011L18.4417 3.001C18.6653 2.9908 18.8858 3.05591 19.068 3.1859C19.2502 3.31589 19.3836 3.50326 19.4467 3.718C19.9381 5.38958 20.0885 7.14288 19.8889 8.87372C19.6893 10.6046 19.1438 12.2776 18.2848 13.7935C17.4259 15.3093 16.271 16.6371 14.8887 17.6978C13.5065 18.7585 11.9252 19.5305 10.2387 19.968C10.0741 20.0107 9.9013 20.0107 9.73669 19.968C8.05011 19.5306 6.46866 18.7587 5.08632 17.698C3.70398 16.6374 2.54897 15.3096 1.68991 13.7938C0.830854 12.2779 0.285287 10.6048 0.0856316 8.8739C-0.114024 7.14301 0.0363053 5.38964 0.527687 3.718C0.590797 3.50326 0.724126 3.31589 0.906334 3.1859C1.08854 3.05591 1.30909 2.9908 1.53269 3.001C4.27015 3.12613 6.95575 2.22499 9.06369 0.474L9.32669 0.249L9.42269 0.174C9.49017 0.127942 9.56305 0.0903282 9.63969 0.062L9.75169 0.0280001C9.79089 0.0186077 9.83163 0.0115947 9.87169 0.00699997Z"
                stroke="currentColor"
            />
        </svg>
    )
}