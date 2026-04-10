import { LandingHeaderV2 } from "@/components/landing/landing-header-v2";
import { BrandHero } from "@/components/brand/brand-hero";
import { BrandColors } from "@/components/brand/brand-colors";
import { BrandLogos } from "@/components/brand/brand-logos";
import { BrandTypography } from "@/components/brand/brand-typography";
import { LandingV2TickerFooter } from "@/components/landing/landing-v2-ticker-footer";

export function BrandGuidelinesRoot() {
  return (
    <main className="relative w-full min-h-screen flex flex-col items-center bg-[#0F0F10] selection:bg-sky-500/30">
      
      {/* Header */}
      <div className="w-full fixed top-0 left-0 right-0 z-50">
         <LandingHeaderV2 />
      </div>

      <div className="w-full flex-grow flex flex-col items-center"> 
          <BrandHero />
          
          <div className="w-full max-w-[1440px] flex flex-col items-center">
            <BrandColors />
            <BrandLogos />
            <BrandTypography />
          </div>
      </div>
      
      <LandingV2TickerFooter />
    </main>
  );
}
