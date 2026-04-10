"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";





// Placeholder for flags since I don't have the SVGs yet. I'll use simple colored circles or emojis if needed, 
// but for now I will try to use a standard library or just emojis if the user accepts, 
// OR I will simply use a div with a gradient/color to mock it as per the "Component 1" in CSS.
// Actually, the CSS has complex SVG data. I cannot easily reconstruction 12 complex flags from raw CSS vectors in one go without bloating.
// I will use emoji flags for now as a robust fallback that looks good.
import { useState } from "react";
import { LandingV2UseCases } from "./landing-v2-use-cases";

const allLanguages: Record<string, { name: string; emoji: string }[]> = {
  "Western Europe": [
    { name: "Dutch", emoji: "🇳🇱" },
    { name: "English (British)", emoji: "🇬🇧" },
    { name: "French", emoji: "🇫🇷" },
    { name: "German", emoji: "🇩🇪" },
    { name: "Italian", emoji: "🇮🇹" },
    { name: "Portuguese (European)", emoji: "🇵🇹" },
    { name: "Spanish (European)", emoji: "🇪🇸" },
    { name: "Swedish", emoji: "🇸🇪" },
    { name: "Greek", emoji: "🇬🇷" },
    { name: "Finnish", emoji: "🇫🇮" },
    { name: "Danish", emoji: "🇩🇰" },
    { name: "Norwegian", emoji: "🇳🇴" },
  ],
  "Americas": [
    { name: "English (US)", emoji: "🇺🇸" },
    { name: "Spanish (LATAM)", emoji: "🇲🇽" },
    { name: "Portuguese (Brazil)", emoji: "🇧🇷" },
    { name: "French (Canada)", emoji: "🇨🇦" },
  ],
  "Eastern Europe": [
    { name: "Russian", emoji: "🇷🇺" },
    { name: "Polish", emoji: "🇵🇱" },
    { name: "Ukrainian", emoji: "🇺🇦" },
    { name: "Czech", emoji: "🇨🇿" },
    { name: "Hungarian", emoji: "🇭🇺" },
    { name: "Romanian", emoji: "🇷🇴" },
    { name: "Bulgarian", emoji: "🇧🇬" },
    { name: "Croatian", emoji: "🇭🇷" },
    { name: "Serbian", emoji: "🇷🇸" },
    { name: "Slovak", emoji: "🇸🇰" },
  ],
  "Asia Pacific": [
    { name: "Chinese (Mandarin)", emoji: "🇨🇳" },
    { name: "Japanese", emoji: "🇯🇵" },
    { name: "Korean", emoji: "🇰🇷" },
    { name: "Vietnamese", emoji: "🇻🇳" },
    { name: "Thai", emoji: "🇹🇭" },
    { name: "Indonesian", emoji: "🇮🇩" },
    { name: "Malay", emoji: "🇲🇾" },
    { name: "Filipino", emoji: "🇵🇭" },
  ],
  "India": [
    { name: "Hindi", emoji: "🇮🇳" },
    { name: "Bengali", emoji: "🇮🇳" },
    { name: "Telugu", emoji: "🇮🇳" },
    { name: "Marathi", emoji: "🇮🇳" },
    { name: "Tamil", emoji: "🇮🇳" },
    { name: "Urdu", emoji: "🇵🇰" },
    { name: "Gujarati", emoji: "🇮🇳" },
    { name: "Kannada", emoji: "🇮🇳" },
    { name: "Malayalam", emoji: "🇮🇳" },
  ],
  "Middle East": [
    { name: "Arabic", emoji: "🇸🇦" },
    { name: "Turkish", emoji: "🇹🇷" },
    { name: "Persian (Farsi)", emoji: "🇮🇷" },
    { name: "Hebrew", emoji: "🇮🇱" },
  ]
};

const regions = Object.keys(allLanguages);

export function LandingV2Languages() {
  const [activeRegion, setActiveRegion] = useState("Western Europe");

  return (
    <section className="w-full flex flex-col items-center justify-center bg-[#0f0f10] py-24 relative overflow-hidden">
        
        {/* Border Top */}
        <div className="absolute top-0 w-full h-[1px] bg-[#373737]/50" />

        {/* Top Graphic */}
        <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-0 pointer-events-none pb-4">
            <svg width="354" height="151" viewBox="0 0 354 151" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_389_24613)">
                    <path fillRule="evenodd" clipRule="evenodd" d="M50.5 10C50.5 4.477 54.977 0 60.5 0H91C96.523 0 101 4.477 101 10V39.565C101 45.087 105.477 49.565 111 49.565H141.5C147.023 49.565 151.5 45.087 151.5 39.565V10C151.5 4.477 155.977 0 161.5 0H192C197.523 0 202 4.477 202 10V39.565C202 45.087 206.477 49.565 212 49.565H242.5C248.023 49.565 252.5 45.087 252.5 39.565V10C252.5 4.477 256.977 0 262.5 0H293C298.523 0 303 4.477 303 10V39.565C303 45.087 307.477 49.565 313 49.565H343.5C349.023 49.565 353.5 54.042 353.5 59.565V90.065C353.5 95.587 349.023 100.064 343.5 100.064H313C307.477 100.064 303 95.587 303 90.064V60.5C303 54.977 298.523 50.5 293 50.5H262.5C256.977 50.5 252.5 54.977 252.5 60.5V90.064C252.5 95.587 248.023 100.064 242.5 100.064H212C206.477 100.064 202 95.587 202 90.064V60.5C202 54.977 197.523 50.5 192 50.5H161.5C155.977 50.5 151.5 54.977 151.5 60.5V90.064C151.5 95.587 147.023 100.064 141.5 100.064H111C105.477 100.064 101 95.587 101 90.064V60.5C101 54.977 96.523 50.5 91 50.5H50.5V10ZM50.5 50.5V91C50.5 96.523 46.023 101 40.5 101H10C4.477 101 0 96.523 0 91V60.5C0 54.977 4.477 50.5 10 50.5H50.5Z" fill="#FAFAFA"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M50.5 60C50.5 54.477 54.977 50 60.5 50H91C96.523 50 101 54.477 101 60V89.564C101 95.087 105.477 99.564 111 99.564H141.5C147.023 99.564 151.5 95.087 151.5 89.564V60C151.5 54.477 155.977 50 161.5 50H192C197.523 50 202 54.477 202 60V89.564C202 95.087 206.477 99.564 212 99.564H242.5C248.023 99.564 252.5 95.087 252.5 89.564V60C252.5 54.477 256.977 50 262.5 50H293C298.523 50 303 54.477 303 60V89.564C303 95.087 307.477 99.564 313 99.564H343.5C349.023 99.564 353.5 104.042 353.5 109.564V140.064C353.5 145.587 349.023 150.064 343.5 150.064H313C307.477 150.064 303 145.587 303 140.064V110.5C303 104.977 298.523 100.5 293 100.5H262.5C256.977 100.5 252.5 104.977 252.5 110.5V140.064C252.5 145.587 248.023 150.064 242.5 150.064H212C206.477 150.064 202 145.587 202 140.064V110.5C202 104.977 197.523 100.5 192 100.5H161.5C155.977 100.5 151.5 104.977 151.5 110.5V140.064C151.5 145.587 147.023 150.064 141.5 150.064H111C105.477 150.064 101 145.587 101 140.064V110.5C101 104.977 96.523 100.5 91 100.5H50.5V60ZM50.5 100.5V141C50.5 146.523 46.023 151 40.5 151H10C4.477 151 0 146.523 0 141V110.5C0 104.977 4.477 100.5 10 100.5H50.5Z" fill="#0F0F10"/>
                </g>
                <defs>
                    <clipPath id="clip0_389_24613">
                        <rect width="354" height="151" fill="white"/>
                    </clipPath>
                </defs>
            </svg>
        </div>

      {/* Use Case Carousel - Full width */}
      <LandingV2UseCases />

      <div className="max-w-[1280px] w-full flex flex-col items-center relative z-10 px-4">
        
        {/* Header Content */}
        <div className="flex flex-col items-center text-center gap-6 mb-16 mt-12">
          <h2 className="text-5xl md:text-[64px] leading-[1.1] font-normal tracking-tight text-[#F5F3EF]">
            Fluent and native, <br />
            <span className="text-[#F5F3EF]">DeFi worldwide</span>
          </h2>
          
          <p className="text-lg text-[#F5F3EF]/70 max-w-[600px] leading-relaxed">
            Reach international markets with <span className="text-white font-medium">Nex-T1</span>, the premier <span className="text-white font-medium">Nexis Network</span> agent. Our <span className="text-white font-medium">AI agents</span> speak 40+ languages, enabling global <span className="text-white font-medium">DeFi</span> and <span className="text-white font-medium">Web3</span> access. From <span className="text-white font-medium">Financial DeFi on-chain</span> operations to <span className="text-white font-medium">DeFAI</span>, Nex-T1 covers 95% of the world with native voices, including 9 Indian languages.
          </p>

          <button className="mt-4 px-6 py-3 bg-[#F5F3EF] text-[#181818] rounded-full font-medium text-sm hover:bg-white transition-colors">
            Explore 40+ Languages
          </button>
        </div>

        {/* Map / Globe Visualization Area */}
        {/* Using the asset provided by user */}
        <div className="relative w-full max-w-[1000px] h-[400px] flex items-center justify-center">
            {/* Background Image */}
             <div className="absolute inset-0 flex items-center justify-center">
                <Image 
                    src="/assets/language-section-image.png" 
                    alt="World Map languages" 
                    width={1000} 
                    height={400}
                    className="object-contain opacity-90"
                />
             </div>
        </div>

        {/* Language Tabs & Grid */}
        <div className="w-full flex flex-col border-t border-[#373737]">
            {/* Tabs */}
            <div className="flex items-center gap-8 py-6 text-sm overflow-x-auto no-scrollbar border-b border-[#373737]/50">
                {regions.map((region) => (
                    <button
                        key={region}
                        onClick={() => setActiveRegion(region)}
                        className={`whitespace-nowrap transition-colors ${
                          activeRegion === region 
                            ? "text-white font-medium" 
                            : "text-white/60 hover:text-white"
                        }`}
                    >
                        {region}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-4 py-8">
                {allLanguages[activeRegion]?.map((lang) => (
                    <div key={lang.name} className="flex items-center justify-between group cursor-pointer py-2 border-b border-transparent hover:border-[#373737] transition-all">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{lang.emoji}</span>
                            <span className="text-[#F5F3EF] font-medium">{lang.name}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#F5F3EF]/40 group-hover:text-[#F5F3EF] transition-colors -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0" />
                    </div>
                ))}
            </div>
        </div>

      </div>
    </section>
  );
}
