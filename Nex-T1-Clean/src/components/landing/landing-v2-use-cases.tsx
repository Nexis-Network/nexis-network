import Image from "next/image";

const useCases = [
  {
    title: "Cross-Border Settlement",
    image: "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/section-images/e-commerce.jpg",
    gradient: "from-blue-500/20 to-purple-500/20",
  },
  {
    title: "DeFi Automation",
    image: "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/section-images/performace-marketers.jpg",
    gradient: "from-green-500/20 to-teal-500/20",
  },
  {
    title: "Smart Wallet Management",
    image: "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/section-images/web3%201.jpg",
    gradient: "from-orange-500/20 to-red-500/20",
  },
  {
    title: "Institutional Trading",
    image: "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/section-images/affiliates.jpg",
    gradient: "from-indigo-500/20 to-blue-500/20",
  },
  {
    title: "Real-World Assets",
    image: "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/section-images/download%20%282%29.jpg",
    gradient: "from-pink-500/20 to-rose-500/20",
  },
  {
    title: "Retail Traders",
    image: "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/section-images/travel-agencies.jpg",
    gradient: "from-cyan-500/20 to-sky-500/20",
  },
  {
    title: "Healthcare",
    image: "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/section-images/healthcare.avif",
    gradient: "from-emerald-500/20 to-green-500/20",
  },
];

export function LandingV2UseCases() {
  return (
    <div className="w-full flex flex-col items-center justify-center py-24 relative z-10 my-10">
      
      {/* Section Title */}
      <div className="w-full px-4 md:px-10 lg:px-[213.5px] mb-10">
          <h2 className="font-sans font-normal text-3xl md:text-[39.3px] leading-[52px] tracking-[-1.296px] text-white text-left">
              Use Cases
          </h2>
      </div>

      <div className="w-full overflow-x-auto no-scrollbar pb-8 pt-4">
        <div className="flex flex-row gap-5 px-4 md:px-10 lg:px-[213.5px] w-max min-w-full">
            {useCases.map((item, idx) => (
                <UseCaseCard key={idx} title={item.title} image={item.image} gradient={item.gradient} />
            ))}
            {/* Pad right to see last item completely */}
             <div className="w-1 shrink-0 lg:hidden" />
        </div>
      </div>
    </div>
  );
}

function UseCaseCard({ title, image, gradient }: { title: string; image?: string; gradient: string }) {
    return (
        <div className="relative w-[320px] h-[400px] flex-none group cursor-pointer transition-transform duration-300 hover:-translate-y-1">
            {/* Component 3 / Card Container */}
            <div className="absolute inset-0 rounded-[10px] overflow-hidden isolation-isolate bg-[#1C1D22]">
                
                {/* Image Background Layer */}
                {image && (
                     <div className="absolute inset-0 z-0">
                         <Image 
                            src={image} 
                            alt={title} 
                            fill 
                            sizes="(max-width: 768px) 100vw, 320px"
                            className="object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                        />
                     </div>
                )}

                {/* Fallback Gradient if image fails or placeholder */}
                {(!image || image.includes("placeholder")) && (
                    <div className={`absolute inset-0 opacity-50 bg-gradient-to-br ${gradient}`} />
                )}

                {/* Mask Layer */}
                <div 
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{
                        background: "linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(0, 0, 0, 0.4) 100%)",
                    }}
                />
                
                {/* Top Shine / Glass Effect */}
                 <div 
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{
                        background: "linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0) 100%)",
                        mixBlendMode: "overlay",
                        opacity: 0.15
                    }}
                />

                {/* Border Layer */}
                <div 
                    className="absolute inset-0 z-20 rounded-[10px] border border-white/60"
                    style={{
                        mixBlendMode: "overlay"
                    }}
                />

                {/* Content Layer */}
                <div className="relative z-30 p-6 h-full flex flex-col justify-between">
                    <h3 className="font-sans font-medium text-[24px] leading-[30px] tracking-[-0.96px] text-white drop-shadow-md">
                        {title}
                    </h3>
                </div>
            </div>
        </div>
    )
}
