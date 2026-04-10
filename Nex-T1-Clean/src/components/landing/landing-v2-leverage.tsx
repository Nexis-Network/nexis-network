
import { WithGsap } from "./scroll-logos-landing-v2";

export function LandingV2Leverage() {
  return (
    <section
      className="flex flex-col justify-center items-center w-full bg-[#FAFAFA]"
      style={{
        width: "100%", // Responsive width
        height: "auto", // Height to fit content
        padding: "0px",
      }}
    >
      <div
        className="flex flex-col justify-center items-start pt-[60px] w-full max-w-[1200px] px-4 md:px-0"
        style={{
          width: "100%",
          maxWidth: "1200px",
          height: "auto",
          minHeight: "648.18px",
        }}
      >
        {/* Top Section */}
        <div className="flex flex-col md:flex-row justify-center items-center relative w-full h-auto md:h-[325.2px] z-0">
          <div className="absolute inset-x-0 inset-y-0 border-l border-r border-[#E5E7EB] opacity-100 pointer-events-none" />

          {/* Heading Content */}
          <div className="flex flex-col md:flex-row items-center pt-[48px] px-4 md:px-[24px] pb-[48px] w-full max-w-[1072px] h-auto z-10">
            
            {/* Left Column */}
            <div className="flex flex-col justify-center items-start gap-[28.19px] w-full max-w-[680px] h-auto">
              
              {/* Tag */}
              <div className="flex flex-row justify-center items-center pl-[10px] pr-[16px] py-[6px] gap-[6px] w-[192px] h-[33px] rounded-[100px] border border-[#C3C4C5] relative box-border">
                  <div className="flex flex-col items-start justify-center h-[21px]">
                     <span className="font-mono text-[14px] font-medium leading-[21px] flex items-center uppercase text-[rgba(87,87,87,0.34)]" style={{ fontFamily: "var(--font-ibm-plex-mono)" }}>
                       50+ Protocols
                     </span>
                  </div>
              </div>

              {/* Title Text */}
              <div className="flex flex-col items-start w-full max-w-[680px] h-auto relative z-10">
                  <h4 className="w-full font-sans font-normal text-2xl md:text-[34.7px] leading-tight md:leading-[42px] flex items-center tracking-[-1.14px] text-[rgba(0,0,0,0.9)]">
                    Nex-T1 empowers DeFi agents to execute across all major protocols instantly. Autonomous on-chain trading built for the agentic economy.
                  </h4>
              </div>

            </div>
          </div>
          


        </div>



      </div>
      
      <WithGsap className="pb-24" />
    </section>
  );
}
