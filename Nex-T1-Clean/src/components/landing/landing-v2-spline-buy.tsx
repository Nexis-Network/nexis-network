
"use client";

import { useInView } from "react-intersection-observer";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { useState } from "react";

import { LightRays } from "@/components/ui/light-rays";
import { SplineCanvas } from "@/components/visuals/spline/spline-canvas";

const BUY_NZT_SCENE_URL = "https://prod.spline.design/jf1-iGD7BrCG8zX6/scene.splinecode";

type LandingV2SplineBuyProps = {
  showTopGraphic?: boolean;
  constrainedToSection?: boolean;
  backgroundColor?: string;
};

export function LandingV2SplineBuy({
  showTopGraphic = true,
  constrainedToSection = false,
  backgroundColor = "#F4F4F4",
}: LandingV2SplineBuyProps) {
  const { ref: splineRef, inView: shouldRenderSpline } = useInView({
    triggerOnce: true,
    rootMargin: "300px 0px",
  });
  const [viewerReady, setViewerReady] = useState(false);

  return (
    <div
      className={`relative w-full flex flex-col items-center pt-0 pb-20 ${
        constrainedToSection ? "px-0" : "px-4"
      }`}
      style={{ backgroundColor }}
    >
      {showTopGraphic ? (
        <svg className="absolute -top-[13px] left-1/2 -translate-x-1/2 z-10 rotate-180 max-w-full" width="354" height="151" viewBox="0 0 354 151" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#clip0_424_916)">
            <path fillRule="evenodd" clipRule="evenodd" d="M50.5 10C50.5 4.477 54.977 0 60.5 0H91C96.523 0 101 4.477 101 10V39.565C101 45.087 105.477 49.565 111 49.565H141.5C147.023 49.565 151.5 45.087 151.5 39.565V10C151.5 4.477 155.977 0 161.5 0H192C197.523 0 202 4.477 202 10V39.565C202 45.087 206.477 49.565 212 49.565H242.5C248.023 49.565 252.5 45.087 252.5 39.565V10C252.5 4.477 256.977 0 262.5 0H293C298.523 0 303 4.477 303 10V39.565C303 45.087 307.477 49.565 313 49.565H343.5C349.023 49.565 353.5 54.042 353.5 59.565V90.065C353.5 95.587 349.023 100.064 343.5 100.064H313C307.477 100.064 303 95.587 303 90.064V60.5C303 54.977 298.523 50.5 293 50.5H262.5C256.977 50.5 252.5 54.977 252.5 60.5V90.064C252.5 95.587 248.023 100.064 242.5 100.064H212C206.477 100.064 202 95.587 202 90.064V60.5C202 54.977 197.523 50.5 192 50.5H161.5C155.977 50.5 151.5 54.977 151.5 60.5V90.064C151.5 95.587 147.023 100.064 141.5 100.064H111C105.477 100.064 101 95.587 101 90.064V60.5C101 54.977 96.523 50.5 91 50.5H50.5V10ZM50.5 50.5V91C50.5 96.523 46.023 101 40.5 101H10C4.477 101 0 96.523 0 91V60.5C0 54.977 4.477 50.5 10 50.5H50.5Z" fill="#FAFAFA"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M50.5 60C50.5 54.477 54.977 50 60.5 50H91C96.523 50 101 54.477 101 60V89.564C101 95.087 105.477 99.564 111 99.564H141.5C147.023 99.564 151.5 95.087 151.5 89.564V60C151.5 54.477 155.977 50 161.5 50H192C197.523 50 202 54.477 202 60V89.564C202 95.087 206.477 99.564 212 99.564H242.5C248.023 99.564 252.5 95.087 252.5 89.564V60C252.5 54.477 256.977 50 262.5 50H293C298.523 50 303 54.477 303 60V89.564C303 95.087 307.477 99.564 313 99.564H343.5C349.023 99.564 353.5 104.042 353.5 109.564V140.064C353.5 145.587 349.023 150.064 343.5 150.064H313C307.477 150.064 303 145.587 303 140.064V110.5C303 104.977 298.523 100.5 293 100.5H262.5C256.977 100.5 252.5 104.977 252.5 110.5V140.064C252.5 145.587 248.023 150.064 242.5 150.064H212C206.477 150.064 202 145.587 202 140.064V110.5C202 104.977 197.523 100.5 192 100.5H161.5C155.977 100.5 151.5 104.977 151.5 110.5V140.064C151.5 145.587 147.023 150.064 141.5 150.064H111C105.477 150.064 101 145.587 101 140.064V110.5C101 104.977 96.523 100.5 91 100.5H50.5V60ZM50.5 100.5V141C50.5 146.523 46.023 151 40.5 151H10C4.477 151 0 146.523 0 141V110.5C0 104.977 4.477 100.5 10 100.5H50.5Z" fill="#0F0F10"/>
          </g>
          <defs>
            <clipPath id="clip0_424_916">
              <rect width="354" height="151" fill="white"/>
            </clipPath>
          </defs>
        </svg>
      ) : null}
      {/* Main Content Group */}
      <div
        className={`flex w-full flex-col gap-4 xl:flex-row ${
          constrainedToSection ? "max-w-full" : "max-w-[1466px]"
        } ${showTopGraphic ? "mt-32 md:mt-[220px]" : "mt-10 md:mt-16"}`}
      >
        
        {/* Left Side Container */}
        <div className="flex flex-col bg-[#0f0f10] rounded-2xl flex-grow overflow-hidden relative min-h-[600px] xl:h-[783px]">
          {/* Header */}
          <div className="flex flex-row justify-between items-start p-6 w-full h-[84px] z-20">
            <div className="flex flex-col items-start w-full">
               <div className="flex items-center gap-2">
                <h3 className="font-medium text-[29px] leading-[36px] tracking-[-0.6px] text-[#FAFAFA] font-sans">
                  Buy $NZT
                </h3>
                <div className="w-2 h-2 bg-[#FAFAFA] rounded-full mt-1" />
              </div>
            </div>
          </div>

          {/* Spline Scene - Centered */}
          <div ref={splineRef} className="absolute inset-0 z-1 pointer-events-none">
            {shouldRenderSpline ? (
              <>
                <Script
                  src="https://unpkg.com/@splinetool/viewer@1.12.53/build/spline-viewer.js"
                  type="module"
                  strategy="afterInteractive"
                  onLoad={() => setViewerReady(true)}
                  onError={() => setViewerReady(false)}
                />
                {viewerReady ? (
                  <spline-viewer
                    url={BUY_NZT_SCENE_URL}
                    style={{ width: "100%", height: "100%" }}
                    className="pointer-events-none absolute inset-0"
                  />
                ) : (
                  <SplineCanvas
                    sceneUrl={BUY_NZT_SCENE_URL}
                    className="h-full w-full pointer-events-none"
                    canvasClassName="absolute inset-0"
                    loadingFallback={null}
                    reducedMotionFallback={null}
                    prefetchOnIdle={shouldRenderSpline}
                  />
                )}
              </>
            ) : null}
          </div>
          <LightRays active={shouldRenderSpline} />

          {/* Footer */}
          <div className="flex flex-row items-end p-6 w-full h-[96px] mt-auto z-20">
            <Link href="/nzt" className="flex flex-row justify-between items-center pl-6 pr-1 py-1 bg-[#FAFAFA] rounded-[50px] w-[167px] h-[48px] group transition-all hover:bg-opacity-90">
              <span className="font-medium text-[17.7px] leading-[22px] tracking-[-0.54px] text-[#0f0f10] whitespace-nowrap">
                Learn more
              </span>
              <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center overflow-hidden relative shrink-0">
                 <ArrowUpRight className="text-white w-6 h-6 absolute transition-all duration-300 group-hover:rotate-45" />
              </div>
            </Link>
          </div>
        </div>

        {/* Right Side Container - 33.3% width typically, but fixed roughly 544px in design */}
        <div className="flex flex-col gap-4 w-full xl:w-[38.33%] xl:min-w-[500px] h-full">
            
            {/* Row 1 */}
            <div className="flex flex-col sm:flex-row xl:flex-row gap-4 h-full">
                 {/* Card: Wallet */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 flex flex-col justify-between h-[380px] w-full relative overflow-hidden group">
                    <div className="flex flex-col gap-2">
                        <span className="text-black/30 font-sans text-sm tracking-[-0.56px] uppercase">
                            AI
                        </span>
                        <div className="flex items-center gap-2">
                            {/* Wallet Logo Icon */}
                             <svg width="24" height="24" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black fill-current">
<path d="M5.92397 31.6965C5.92529 31.6965 5.92662 31.697 5.92759 31.6978C5.93571 31.7059 5.94412 31.7138 5.95264 31.7217C5.99277 31.7591 6.05939 31.7529 6.09117 31.7088L7.3416 29.9715C8.52772 27.9473 8.85262 25.9731 8.86505 24.3496C8.86505 23.496 8.72388 22.6204 8.49973 21.7842C8.34296 21.2841 8.22723 20.7681 8.1525 20.2479C8.15152 20.2411 8.15106 20.2359 8.15106 20.229C8.15106 20.2225 8.15054 20.2141 8.14962 20.2075C8.10062 19.8616 8.06786 19.5078 8.05145 19.154C7.8231 13.3983 12.3121 8.64684 18.2255 8.10534C19.4286 8.14179 21.5803 8.46444 23.3728 7.88206C25.1455 7.39088 26.7561 6.42131 28.1066 5.18081C28.1436 5.14679 28.217 5.11081 28.282 5.07433C28.3794 5.01971 28.4528 4.91969 28.5346 4.8451L29.3176 4.13014C29.3994 4.05553 29.4456 3.95204 29.4456 3.84377V3.48778C29.4456 3.35944 29.3808 3.23879 29.2708 3.16595C24.2532 -0.155748 17.6861 -1.04409 11.6545 1.36725C2.07395 5.19093 -2.51705 15.8904 1.39736 25.2587C2.377 27.6011 3.79248 29.6384 5.51929 31.3149C5.65164 31.4444 5.78406 31.5697 5.92051 31.6952C5.92143 31.696 5.9227 31.6965 5.92397 31.6965Z" fill="#0f0f10"/>
<path d="M31.5807 5.50994C31.5794 5.50994 31.5781 5.50941 31.577 5.5085C31.5689 5.50053 31.5605 5.49254 31.5522 5.48454C31.5123 5.44691 31.4458 5.45312 31.4143 5.49741L30.1697 7.24966C28.9894 9.29106 28.6659 11.282 28.6536 12.9194C28.6536 13.7801 28.7941 14.6631 29.0171 15.5064C29.1741 16.0141 29.29 16.5382 29.3641 17.066C29.3641 17.0702 29.3641 17.0784 29.3641 17.0867C29.4139 17.4387 29.4469 17.7988 29.4634 18.1591C29.6907 23.9637 25.2231 28.7557 19.3378 29.3019C18.1404 29.265 15.9993 28.9397 14.2154 29.527C12.4513 30.0223 10.848 31.0001 9.50422 32.2512C9.46708 32.2858 9.39298 32.3225 9.32792 32.3595C9.23177 32.4142 9.16015 32.5141 9.07965 32.5885L8.29755 33.3121C8.217 33.3865 8.17157 33.4892 8.17157 33.5967V33.962C8.17157 34.0894 8.23554 34.2094 8.34435 34.2826C13.3379 37.6331 19.8742 38.5294 25.8775 36.0971C35.4122 32.241 39.9811 21.4505 36.0857 12.0024C35.1106 9.64026 33.7019 7.58538 31.9832 5.89467C31.8517 5.76414 31.7199 5.63785 31.5841 5.51127C31.5831 5.51041 31.582 5.50994 31.5807 5.50994Z" fill="#0f0f10"/>
</svg>
                             <span className="font-bold text-3xl text-black">Nex-T1</span>
                        </div>
                    </div>
                    
                     <div className="mt-auto">
                        <Link href="/nex-t1" className="flex flex-row items-center gap-3 bg-[#FAFAFA] rounded-[50px] pl-4 pr-1 py-1 w-fit group/btn transition-all hover:bg-[#F0F0F0]">
                            <span className="font-medium text-[14px] leading-[17px] tracking-[-0.42px] text-black">
                                Learn More
                            </span>
                            <div className="w-7 h-7 bg-black rounded-full flex items-center justify-center">
                                <ArrowUpRight className="text-white w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Card: Hub */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 flex flex-col justify-between h-[380px] w-full relative overflow-hidden group">
                     <div className="flex flex-col gap-2">
                        <span className="text-black/30 font-sans text-sm tracking-[-0.56px] uppercase">
                            TRADING
                        </span>
                        <div className="flex items-center gap-2">
                            {/* Hub Icon */}
                             <svg width="24" height="24" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black fill-current">
<path d="M5.92397 31.6965C5.92529 31.6965 5.92662 31.697 5.92759 31.6978C5.93571 31.7059 5.94412 31.7138 5.95264 31.7217C5.99277 31.7591 6.05939 31.7529 6.09117 31.7088L7.3416 29.9715C8.52772 27.9473 8.85262 25.9731 8.86505 24.3496C8.86505 23.496 8.72388 22.6204 8.49973 21.7842C8.34296 21.2841 8.22723 20.7681 8.1525 20.2479C8.15152 20.2411 8.15106 20.2359 8.15106 20.229C8.15106 20.2225 8.15054 20.2141 8.14962 20.2075C8.10062 19.8616 8.06786 19.5078 8.05145 19.154C7.8231 13.3983 12.3121 8.64684 18.2255 8.10534C19.4286 8.14179 21.5803 8.46444 23.3728 7.88206C25.1455 7.39088 26.7561 6.42131 28.1066 5.18081C28.1436 5.14679 28.217 5.11081 28.282 5.07433C28.3794 5.01971 28.4528 4.91969 28.5346 4.8451L29.3176 4.13014C29.3994 4.05553 29.4456 3.95204 29.4456 3.84377V3.48778C29.4456 3.35944 29.3808 3.23879 29.2708 3.16595C24.2532 -0.155748 17.6861 -1.04409 11.6545 1.36725C2.07395 5.19093 -2.51705 15.8904 1.39736 25.2587C2.377 27.6011 3.79248 29.6384 5.51929 31.3149C5.65164 31.4444 5.78406 31.5697 5.92051 31.6952C5.92143 31.696 5.9227 31.6965 5.92397 31.6965Z" fill="#0f0f10"/>
<path d="M31.5807 5.50994C31.5794 5.50994 31.5781 5.50941 31.577 5.5085C31.5689 5.50053 31.5605 5.49254 31.5522 5.48454C31.5123 5.44691 31.4458 5.45312 31.4143 5.49741L30.1697 7.24966C28.9894 9.29106 28.6659 11.282 28.6536 12.9194C28.6536 13.7801 28.7941 14.6631 29.0171 15.5064C29.1741 16.0141 29.29 16.5382 29.3641 17.066C29.3641 17.0702 29.3641 17.0784 29.3641 17.0867C29.4139 17.4387 29.4469 17.7988 29.4634 18.1591C29.6907 23.9637 25.2231 28.7557 19.3378 29.3019C18.1404 29.265 15.9993 28.9397 14.2154 29.527C12.4513 30.0223 10.848 31.0001 9.50422 32.2512C9.46708 32.2858 9.39298 32.3225 9.32792 32.3595C9.23177 32.4142 9.16015 32.5141 9.07965 32.5885L8.29755 33.3121C8.217 33.3865 8.17157 33.4892 8.17157 33.5967V33.962C8.17157 34.0894 8.23554 34.2094 8.34435 34.2826C13.3379 37.6331 19.8742 38.5294 25.8775 36.0971C35.4122 32.241 39.9811 21.4505 36.0857 12.0024C35.1106 9.64026 33.7019 7.58538 31.9832 5.89467C31.8517 5.76414 31.7199 5.63785 31.5841 5.51127C31.5831 5.51041 31.582 5.50994 31.5807 5.50994Z" fill="#0f0f10"/>
</svg>
                             <span className="font-bold text-3xl text-black">AI Arena</span>
                        </div>
                    </div>

                    <div className="mt-auto">
                        <Link href="/ai-leaderboard" className="flex flex-row items-center gap-3 bg-[#FAFAFA] rounded-[50px] pl-4 pr-1 py-1 w-fit group/btn transition-all hover:bg-[#F0F0F0]">
                            <span className="font-medium text-[14px] leading-[17px] tracking-[-0.42px] text-black">
                                Learn More
                            </span>
                             <div className="w-7 h-7 bg-black rounded-full flex items-center justify-center">
                                <ArrowUpRight className="text-white w-4 h-4 transition-transform duration-300 group-hover/btn:rotate-45" />
                            </div>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Row 2 */}
            <div className="flex flex-col sm:flex-row xl:flex-row gap-4 h-full">
                {/* Card: Pay */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 flex flex-col justify-between h-[380px] w-full relative overflow-hidden group">
                     <div className="flex flex-col gap-2">
                        <span className="text-black/30 font-sans text-sm tracking-[-0.56px] uppercase">
                            AGENTS
                        </span>
                         <div className="flex items-center gap-2">
                             {/* Pay Icon */}
                             <svg width="24" height="24" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black fill-current">
<path d="M5.92397 31.6965C5.92529 31.6965 5.92662 31.697 5.92759 31.6978C5.93571 31.7059 5.94412 31.7138 5.95264 31.7217C5.99277 31.7591 6.05939 31.7529 6.09117 31.7088L7.3416 29.9715C8.52772 27.9473 8.85262 25.9731 8.86505 24.3496C8.86505 23.496 8.72388 22.6204 8.49973 21.7842C8.34296 21.2841 8.22723 20.7681 8.1525 20.2479C8.15152 20.2411 8.15106 20.2359 8.15106 20.229C8.15106 20.2225 8.15054 20.2141 8.14962 20.2075C8.10062 19.8616 8.06786 19.5078 8.05145 19.154C7.8231 13.3983 12.3121 8.64684 18.2255 8.10534C19.4286 8.14179 21.5803 8.46444 23.3728 7.88206C25.1455 7.39088 26.7561 6.42131 28.1066 5.18081C28.1436 5.14679 28.217 5.11081 28.282 5.07433C28.3794 5.01971 28.4528 4.91969 28.5346 4.8451L29.3176 4.13014C29.3994 4.05553 29.4456 3.95204 29.4456 3.84377V3.48778C29.4456 3.35944 29.3808 3.23879 29.2708 3.16595C24.2532 -0.155748 17.6861 -1.04409 11.6545 1.36725C2.07395 5.19093 -2.51705 15.8904 1.39736 25.2587C2.377 27.6011 3.79248 29.6384 5.51929 31.3149C5.65164 31.4444 5.78406 31.5697 5.92051 31.6952C5.92143 31.696 5.9227 31.6965 5.92397 31.6965Z" fill="#0f0f10"/>
<path d="M31.5807 5.50994C31.5794 5.50994 31.5781 5.50941 31.577 5.5085C31.5689 5.50053 31.5605 5.49254 31.5522 5.48454C31.5123 5.44691 31.4458 5.45312 31.4143 5.49741L30.1697 7.24966C28.9894 9.29106 28.6659 11.282 28.6536 12.9194C28.6536 13.7801 28.7941 14.6631 29.0171 15.5064C29.1741 16.0141 29.29 16.5382 29.3641 17.066C29.3641 17.0702 29.3641 17.0784 29.3641 17.0867C29.4139 17.4387 29.4469 17.7988 29.4634 18.1591C29.6907 23.9637 25.2231 28.7557 19.3378 29.3019C18.1404 29.265 15.9993 28.9397 14.2154 29.527C12.4513 30.0223 10.848 31.0001 9.50422 32.2512C9.46708 32.2858 9.39298 32.3225 9.32792 32.3595C9.23177 32.4142 9.16015 32.5141 9.07965 32.5885L8.29755 33.3121C8.217 33.3865 8.17157 33.4892 8.17157 33.5967V33.962C8.17157 34.0894 8.23554 34.2094 8.34435 34.2826C13.3379 37.6331 19.8742 38.5294 25.8775 36.0971C35.4122 32.241 39.9811 21.4505 36.0857 12.0024C35.1106 9.64026 33.7019 7.58538 31.9832 5.89467C31.8517 5.76414 31.7199 5.63785 31.5841 5.51127C31.5831 5.51041 31.582 5.50994 31.5807 5.50994Z" fill="#0f0f10"/>
</svg>
                             <span className="font-bold text-3xl text-black">Nex MCP</span>
                        </div>
                    </div>

                    <div className="mt-auto">
                        <Link href="/nex-mcp" className="flex flex-row items-center gap-3 bg-[#FAFAFA] rounded-[50px] pl-4 pr-1 py-1 w-fit group/btn transition-all hover:bg-[#F0F0F0]">
                            <span className="font-medium text-[14px] leading-[17px] tracking-[-0.42px] text-black">
                                Learn More
                            </span>
                             <div className="w-7 h-7 bg-black rounded-full flex items-center justify-center">
                                <ArrowUpRight className="text-white w-4 h-4 transition-transform duration-300 group-hover/btn:rotate-45" />
                            </div>
                        </Link>
                    </div>
                </div>

                 {/* Card: Token */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 flex flex-col justify-between h-[380px] w-full relative overflow-hidden group">
                    <div className="flex flex-col gap-2">
                        <span className="text-black/30 font-sans text-sm tracking-[-0.56px] uppercase">
                            DAPPS
                        </span>
                        <div className="flex items-center gap-2">
                             {/* Token Icon */}
                             <svg width="24" height="24" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black fill-current">
<path d="M5.92397 31.6965C5.92529 31.6965 5.92662 31.697 5.92759 31.6978C5.93571 31.7059 5.94412 31.7138 5.95264 31.7217C5.99277 31.7591 6.05939 31.7529 6.09117 31.7088L7.3416 29.9715C8.52772 27.9473 8.85262 25.9731 8.86505 24.3496C8.86505 23.496 8.72388 22.6204 8.49973 21.7842C8.34296 21.2841 8.22723 20.7681 8.1525 20.2479C8.15152 20.2411 8.15106 20.2359 8.15106 20.229C8.15106 20.2225 8.15054 20.2141 8.14962 20.2075C8.10062 19.8616 8.06786 19.5078 8.05145 19.154C7.8231 13.3983 12.3121 8.64684 18.2255 8.10534C19.4286 8.14179 21.5803 8.46444 23.3728 7.88206C25.1455 7.39088 26.7561 6.42131 28.1066 5.18081C28.1436 5.14679 28.217 5.11081 28.282 5.07433C28.3794 5.01971 28.4528 4.91969 28.5346 4.8451L29.3176 4.13014C29.3994 4.05553 29.4456 3.95204 29.4456 3.84377V3.48778C29.4456 3.35944 29.3808 3.23879 29.2708 3.16595C24.2532 -0.155748 17.6861 -1.04409 11.6545 1.36725C2.07395 5.19093 -2.51705 15.8904 1.39736 25.2587C2.377 27.6011 3.79248 29.6384 5.51929 31.3149C5.65164 31.4444 5.78406 31.5697 5.92051 31.6952C5.92143 31.696 5.9227 31.6965 5.92397 31.6965Z" fill="#0f0f10"/>
<path d="M31.5807 5.50994C31.5794 5.50994 31.5781 5.50941 31.577 5.5085C31.5689 5.50053 31.5605 5.49254 31.5522 5.48454C31.5123 5.44691 31.4458 5.45312 31.4143 5.49741L30.1697 7.24966C28.9894 9.29106 28.6659 11.282 28.6536 12.9194C28.6536 13.7801 28.7941 14.6631 29.0171 15.5064C29.1741 16.0141 29.29 16.5382 29.3641 17.066C29.3641 17.0702 29.3641 17.0784 29.3641 17.0867C29.4139 17.4387 29.4469 17.7988 29.4634 18.1591C29.6907 23.9637 25.2231 28.7557 19.3378 29.3019C18.1404 29.265 15.9993 28.9397 14.2154 29.527C12.4513 30.0223 10.848 31.0001 9.50422 32.2512C9.46708 32.2858 9.39298 32.3225 9.32792 32.3595C9.23177 32.4142 9.16015 32.5141 9.07965 32.5885L8.29755 33.3121C8.217 33.3865 8.17157 33.4892 8.17157 33.5967V33.962C8.17157 34.0894 8.23554 34.2094 8.34435 34.2826C13.3379 37.6331 19.8742 38.5294 25.8775 36.0971C35.4122 32.241 39.9811 21.4505 36.0857 12.0024C35.1106 9.64026 33.7019 7.58538 31.9832 5.89467C31.8517 5.76414 31.7199 5.63785 31.5841 5.51127C31.5831 5.51041 31.582 5.50994 31.5807 5.50994Z" fill="#0f0f10"/>
</svg>
                             <span className="font-bold text-3xl text-black">Nex Cloud</span>
                        </div>
                    </div>

                    <div className="mt-auto">
                        <Link href="/nex-cloud" className="flex flex-row items-center gap-3 bg-[#FAFAFA] rounded-[50px] pl-4 pr-1 py-1 w-fit group/btn transition-all hover:bg-[#F0F0F0]">
                            <span className="font-medium text-[14px] leading-[17px] tracking-[-0.42px] text-black">
                                Learn More
                            </span>
                             <div className="w-7 h-7 bg-black rounded-full flex items-center justify-center">
                                <ArrowUpRight className="text-white w-4 h-4 transition-transform duration-300 group-hover/btn:rotate-45" />
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
