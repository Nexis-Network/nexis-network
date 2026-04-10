import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { InfiniteSlider } from '@/components/motion-primitives/infinite-slider'
import { LIQUID_GLASS_LOGOS } from '@/components/liquid-glass-logos'

export default function IntegrationsSection() {
    return (
        <section className="bg-[#FAFAFA]">
            <div className="py-24">
                <div className="perspective-dramatic group mx-auto max-w-5xl px-6">
                    <div className="rotate-x-6 hover:rotate-x-0 mask-radial-from-70% mask-radial-[50%_90%] group relative mx-auto max-w-2xl scale-y-90 items-center justify-between space-y-6 from-transparent pb-1 transition-transform duration-1000 hover:scale-y-100">
                        <div className="mask-radial-to-55% absolute inset-0 bg-[radial-gradient(#e7e7e9_1px,transparent_1px)] opacity-100 [background-size:16px_16px]" />
                        <div>
                            <InfiniteSlider
                                gap={56}
                                speed={20}
                                speedOnHover={10}>
                                <IntegrationCard>
                                    <Image src={LIQUID_GLASS_LOGOS.ethereum} alt="Ethereum" width={32} height={32} />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Image src="/icons/chain-icons/base.svg" alt="Base" width={32} height={32} />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Image src="/icons/chain-icons/arbitrum.svg" alt="Arbitrum" width={32} height={32} />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Image src={LIQUID_GLASS_LOGOS.solana} alt="Solana" width={32} height={32} />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Image src="/icons/chain-icons/optimism.svg" alt="Optimism" width={32} height={32} />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Image src="/icons/chain-icons/polygon.svg" alt="Polygon" width={32} height={32} />
                                </IntegrationCard>
                            </InfiniteSlider>
                        </div>

                        <div>
                            <InfiniteSlider
                                gap={56}
                                speed={20}
                                speedOnHover={10}
                                reverse>
                                <IntegrationCard>
                                    <Image src="/icons/web3-icons/uniswap.svg" alt="Uniswap" width={32} height={32} />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Image src="/icons/web3-icons/aave.svg" alt="Aave" width={32} height={32} />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Image src="/icons/web3-icons/etherscan.svg" alt="Etherscan" width={32} height={32} />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Image src="/icons/web3-icons/metamask.svg" alt="MetaMask" width={32} height={32} />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Image src="/icons/web3-icons/1inch.svg" alt="1inch" width={32} height={32} />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Image src={LIQUID_GLASS_LOGOS.chainlink} alt="Chainlink" width={32} height={32} />
                                </IntegrationCard>
                            </InfiniteSlider>
                        </div>
                        <div>
                            <InfiniteSlider
                                gap={56}
                                speed={15}
                                speedOnHover={10}>
                                <IntegrationCard>
                                    <Image src={LIQUID_GLASS_LOGOS.bitcoin} alt="Bitcoin" width={32} height={32} />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Image src={LIQUID_GLASS_LOGOS.bnb} alt="BNB" width={32} height={32} />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Image src="/icons/web3-icons/curve.svg" alt="Curve" width={32} height={32} />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Image src="/icons/web3-icons/dune.svg" alt="Dune" width={32} height={32} />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Image src="/icons/chain-icons/avalanche.svg" alt="Avalanche" width={32} height={32} />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Image src="/icons/chain-icons/zksync.svg" alt="zkSync" width={32} height={32} />
                                </IntegrationCard>
                            </InfiniteSlider>
                        </div>
                        <div className="absolute inset-0 m-auto flex size-fit -translate-y-3.5 justify-center gap-2">
                            <IntegrationCard
                                className="ring-foreground/50 relative size-24 rounded-2xl border border-[#5f5f61]/50 bg-zinc-700/50 shadow-xl shadow-[#5f5f61] ring-1 backdrop-blur-lg"
                                isCenter={true}>
                                <svg width="265" height="265" viewBox="0 0 265 265" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white drop-shadow-sm size-full">
                                    <path d="M41.7388 223.325C41.7484 223.325 41.7575 223.328 41.7642 223.335C41.8216 223.391 41.8807 223.447 41.9406 223.503C42.2233 223.766 42.6927 223.723 42.9169 223.411L51.7269 211.17C60.0843 196.909 62.373 183 62.4606 171.56C62.4606 165.547 61.4659 159.377 59.8869 153.486C58.7754 149.94 57.9566 146.279 57.43 142.59C57.43 142.561 57.43 142.504 57.43 142.447C57.0791 139.987 56.8451 137.471 56.7283 134.954C55.1196 94.4005 86.747 60.9234 128.412 57.1078C136.89 57.365 152.049 59.6382 164.678 55.5349C177.168 52.0742 188.517 45.2428 198.031 36.5027C198.292 36.2629 198.81 36.0094 199.268 35.7524C199.954 35.3675 200.471 34.6628 201.046 34.1373L206.564 29.0998C207.14 28.5742 207.466 27.8449 207.466 27.0822V24.574C207.466 23.6697 207.009 22.8196 206.234 22.3064C170.881 -1.09731 124.612 -7.35643 82.1144 9.63335C14.6126 36.5738 -17.7345 111.96 9.84539 177.966C16.7477 194.469 26.7208 208.825 38.8875 220.637C39.8201 221.549 40.7528 222.431 41.7142 223.315C41.7208 223.321 41.7297 223.325 41.7388 223.325Z" fill="url(#paint0_linear_551_383)"/>
                                    <path d="M222.508 38.8219C222.499 38.8219 222.49 38.8182 222.483 38.8117C222.426 38.7556 222.367 38.6994 222.308 38.6431C222.028 38.3779 221.558 38.4216 221.336 38.7337L212.568 51.0796C204.25 65.4626 201.973 79.4901 201.886 91.0274C201.886 97.091 202.875 103.313 204.447 109.255C205.553 112.831 206.368 116.523 206.892 120.244C206.892 120.273 206.892 120.33 206.892 120.388C207.241 122.869 207.474 125.407 207.59 127.945C209.191 168.843 177.715 202.605 136.249 206.453C127.813 206.194 112.726 203.901 100.157 208.04C87.7274 211.53 76.4319 218.419 66.9639 227.234C66.7021 227.478 66.1801 227.736 65.7215 227.997C65.0443 228.383 64.5394 229.086 63.9723 229.611L58.4617 234.709C57.8945 235.233 57.5741 235.957 57.5741 236.713V239.287C57.5741 240.186 58.0249 241.031 58.7916 241.545C93.9758 265.153 140.028 271.468 182.326 254.332C249.505 227.162 281.697 151.134 254.249 84.5662C247.38 67.9231 237.454 53.4449 225.346 41.5326C224.418 40.6131 223.489 39.7232 222.533 38.8314C222.526 38.8253 222.517 38.8219 222.508 38.8219Z" fill="url(#paint1_linear_551_383)"/>
                                    <path d="M41.7388 223.325C41.7484 223.325 41.7575 223.328 41.7642 223.335C41.8216 223.391 41.8807 223.447 41.9406 223.503C42.2233 223.766 42.6927 223.723 42.9169 223.411L51.7269 211.17C60.0843 196.909 62.373 183 62.4606 171.56C62.4606 165.547 61.4659 159.377 59.8869 153.486C58.7754 149.94 57.9566 146.279 57.43 142.59C57.43 142.561 57.43 142.504 57.43 142.447C57.0791 139.987 56.8451 137.471 56.7283 134.954C55.1196 94.4005 86.747 60.9234 128.412 57.1078C136.89 57.365 152.049 59.6382 164.678 55.5349C177.168 52.0742 188.517 45.2428 198.031 36.5027C198.292 36.2629 198.81 36.0094 199.268 35.7524C199.954 35.3675 200.471 34.6628 201.046 34.1373L206.564 29.0998C207.14 28.5742 207.466 27.8449 207.466 27.0822V24.574C207.466 23.6697 207.009 22.8196 206.234 22.3064C170.881 -1.09731 124.612 -7.35643 82.1144 9.63335C14.6126 36.5738 -17.7345 111.96 9.84539 177.966C16.7477 194.469 26.7208 208.825 38.8875 220.637C39.8201 221.549 40.7528 222.431 41.7142 223.315C41.7208 223.321 41.7297 223.325 41.7388 223.325Z" fill="url(#paint2_linear_551_383)"/>
                                    <path d="M222.508 38.8219C222.499 38.8219 222.49 38.8182 222.483 38.8117C222.426 38.7556 222.367 38.6994 222.308 38.6431C222.028 38.3779 221.558 38.4216 221.336 38.7337L212.568 51.0796C204.25 65.4626 201.973 79.4901 201.886 91.0274C201.886 97.091 202.875 103.313 204.447 109.255C205.553 112.831 206.368 116.523 206.892 120.244C206.892 120.273 206.892 120.33 206.892 120.388C207.241 122.869 207.474 125.407 207.59 127.945C209.191 168.843 177.715 202.605 136.249 206.453C127.813 206.194 112.726 203.901 100.157 208.04C87.7274 211.53 76.4319 218.419 66.9639 227.234C66.7021 227.478 66.1801 227.736 65.7215 227.997C65.0443 228.383 64.5394 229.086 63.9723 229.611L58.4617 234.709C57.8945 235.233 57.5741 235.957 57.5741 236.713V239.287C57.5741 240.186 58.0249 241.031 58.7916 241.545C93.9758 265.153 140.028 271.468 182.326 254.332C249.505 227.162 281.697 151.134 254.249 84.5662C247.38 67.9231 237.454 53.4449 225.346 41.5326C224.418 40.6131 223.489 39.7232 222.533 38.8314C222.526 38.8253 222.517 38.8219 222.508 38.8219Z" fill="url(#paint3_linear_551_383)"/>
                                    <defs>
                                    <linearGradient id="paint0_linear_551_383" x1="23.8154" y1="40.779" x2="182.79" y2="249.433" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="white" stopOpacity="0.6"/>
                                    <stop offset="1" stopColor="white" stopOpacity="0.3"/>
                                    </linearGradient>
                                    <linearGradient id="paint1_linear_551_383" x1="23.8154" y1="40.779" x2="182.79" y2="249.433" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="white" stopOpacity="0.6"/>
                                    <stop offset="1" stopColor="white" stopOpacity="0.3"/>
                                    </linearGradient>
                                    <linearGradient id="paint2_linear_551_383" x1="23.8154" y1="40.779" x2="182.79" y2="249.433" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="white" stopOpacity="0.6"/>
                                    <stop offset="0.4927" stopColor="white" stopOpacity="0"/>
                                    <stop offset="0.9971" stopColor="white" stopOpacity="0.3"/>
                                    </linearGradient>
                                    <linearGradient id="paint3_linear_551_383" x1="23.8154" y1="40.779" x2="182.79" y2="249.433" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="white" stopOpacity="0.6"/>
                                    <stop offset="0.4927" stopColor="white" stopOpacity="0"/>
                                    <stop offset="0.9971" stopColor="white" stopOpacity="0.3"/>
                                    </linearGradient>
                                    </defs>
                                </svg>
                            </IntegrationCard>
                        </div>
                    </div>
                    <div className="mx-auto mt-12 max-w-xl text-center">
                        <h2 className="text-balance text-3xl font-semibold md:text-5xl text-[#0f0f10]">Seamlessly Integrate with your favorite Tools</h2>
                        <p className="text-muted-foreground mb-6 mt-4 text-balance">
                            Nex-T1 empowers DeFi agents to execute across all major protocols instantly. Autonomous on-chain trading built for the agentic economy.
                        </p>

                        <Button
                            size="sm"
                            asChild
                            variant="outline"
                            className="bg-[#ffffff] text-[#0f0f10] hover:bg-[#ffffff] border-[#e7e7e9]/60 dark:bg-[#ffffff] dark:text-[#0f0f10] dark:hover:bg-[#ffffff] dark:border-[#e7e7e9]/60">
                            <Link href="#">Get Started</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}

const IntegrationCard = ({ children, className, isCenter = false }: { children: React.ReactNode; className?: string; position?: 'left-top' | 'left-middle' | 'left-bottom' | 'right-top' | 'right-middle' | 'right-bottom'; isCenter?: boolean }) => {
    return (
        <div
            aria-hidden
            className={cn('bg-[#FFFFFF] relative z-20 flex size-20 rounded-xl border border-[#e7e7e9]', className)}>
            <div className={cn('m-auto size-fit *:size-8 *:rounded-md *:object-contain', isCenter && '*:size-8')}>{children}</div>
        </div>
    )
}
