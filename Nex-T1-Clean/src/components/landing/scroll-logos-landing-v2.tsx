"use client";

import { motion, MotionValue, useScroll, useTransform } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ReactLenis from "lenis/react";
import React, { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { useIsInView } from "@/lib/hooks/ui/use-is-in-view";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const Skiper32 = () => {
  return (
    <div className="h-full w-screen">
      <WithGsap />
      <WithFramerMotion />
    </div>
  );
};

const WithFramerMotion = () => {
  const targetRef = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: targetRef,
  });

  return (
    <ReactLenis root>
      <div ref={targetRef} className="relative z-0 h-[300vh]">
        <div className="top-22 absolute left-1/2 z-10 grid -translate-x-1/2 content-start justify-items-center gap-6 text-center">
          <span className="after:from-background after:to-foreground relative max-w-[12ch] text-xs uppercase leading-tight opacity-40 after:absolute after:left-1/2 after:top-full after:h-16 after:w-px after:bg-gradient-to-b after:content-['']">
            Scroll effect with motion.dev
          </span>
        </div>
        <div
          className="sticky top-0 grid h-screen grid-cols-5 grid-rows-4 gap-2"
          style={{
            transformStyle: "preserve-3d",
            perspective: "200px",
          }}
        >
          {Array.from({ length: 20 }).map((_, index) => (
            <GridShowRandom
              key={index}
              scrollYProgress={scrollYProgress}
              imgSrc={`/images/lummi/img${index + 1}.png`}
              randomValues={randomValues[index]}
            />
          ))}
        </div>
      </div>
    </ReactLenis>
  );
};

interface GridShowRandomProps {
  scrollYProgress: MotionValue<number>;
  imgSrc: string;
  randomValues: {
    rotateXStart: number;
    translateZStart: number;
    translateYStart: number;
    progressEnd: number;
  };
}

const GridShowRandom = ({
  scrollYProgress,
  imgSrc,
  randomValues,
}: GridShowRandomProps) => {
  const rotateX = useTransform(
    scrollYProgress,
    [0, randomValues.progressEnd],
    [randomValues.rotateXStart, 0],
  );

  const translateZ = useTransform(
    scrollYProgress,
    [0, randomValues.progressEnd],
    [randomValues.translateZStart, 0],
  );

  const translateY = useTransform(
    scrollYProgress,
    [0, randomValues.progressEnd],
    [randomValues.translateYStart, 0],
  );

  const opacity = useTransform(
    scrollYProgress,
    [0, randomValues.progressEnd],
    [0, 1],
  );

  return (
    <motion.img
      style={{
        rotateX,
        translateY,
        translateZ,
        opacity,
      }}
      src={imgSrc}
      className="h-full w-full object-cover"
    />
  );
};

// Hardcoded random values for each image with different scroll progress endpoints
const randomValues = [
  {
    rotateXStart: -45,
    translateZStart: -450,
    translateYStart: 2150,
    progressEnd: 0.7,
  },
  {
    rotateXStart: -67,
    translateZStart: -720,
    translateYStart: 1720,
    progressEnd: 1,
  },
  {
    rotateXStart: -38,
    translateZStart: -380,
    translateYStart: 1380,
    progressEnd: 0.8,
  },
  {
    rotateXStart: -82,
    translateZStart: -890,
    translateYStart: 1890,
    progressEnd: 0.9,
  },
  {
    rotateXStart: -53,
    translateZStart: -540,
    translateYStart: 2540,
    progressEnd: 1,
  },
  {
    rotateXStart: -71,
    translateZStart: -760,
    translateYStart: 1760,
    progressEnd: 1,
  },
  {
    rotateXStart: -42,
    translateZStart: -420,
    translateYStart: 1420,
    progressEnd: 0.75,
  },
  {
    rotateXStart: -89,
    translateZStart: -950,
    translateYStart: 1950,
    progressEnd: 0.85,
  },
  {
    rotateXStart: -48,
    translateZStart: -480,
    translateYStart: 1480,
    progressEnd: 0.7,
  },
  {
    rotateXStart: -75,
    translateZStart: -800,
    translateYStart: 1800,
    progressEnd: 0.8,
  },
  {
    rotateXStart: -35,
    translateZStart: -350,
    translateYStart: 1350,
    progressEnd: 0.8,
  },
  {
    rotateXStart: -85,
    translateZStart: -920,
    translateYStart: 1920,
    progressEnd: 0.9,
  },
  {
    rotateXStart: -58,
    translateZStart: -580,
    translateYStart: 1580,
    progressEnd: 0.65,
  },
  {
    rotateXStart: -69,
    translateZStart: -740,
    translateYStart: 1740,
    progressEnd: 1,
  },
  {
    rotateXStart: -44,
    translateZStart: -440,
    translateYStart: 1440,
    progressEnd: 0.75,
  },
  {
    rotateXStart: -78,
    translateZStart: -830,
    translateYStart: 1830,
    progressEnd: 0.95,
  },
  {
    rotateXStart: -51,
    translateZStart: -510,
    translateYStart: 1510,
    progressEnd: 0.7,
  },
  {
    rotateXStart: -87,
    translateZStart: -940,
    translateYStart: 1940,
    progressEnd: 0.8,
  },
  {
    rotateXStart: -39,
    translateZStart: -390,
    translateYStart: 1390,
    progressEnd: 1,
  },
  {
    rotateXStart: -73,
    translateZStart: -780,
    translateYStart: 1780,
    progressEnd: 0.85,
  },
];

const WithGsap = ({ className }: { className?: string }) => {
  const mainRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const gridFullRef = useRef<HTMLDivElement>(null);
  const { ref: mainInViewRef, isInView } = useIsInView(mainRef, {
    inViewOnce: true,
    inViewMargin: "200px 0px",
  });

  // Image data - using available images from the project
  const images = [
    "/assets/landing-v2/1inch.svg",
    "/assets/landing-v2/ENS.svg",
    "/assets/landing-v2/aave.svg",
    "/assets/landing-v2/alchemy.svg",
    "/assets/landing-v2/chainlink.svg",
    "/assets/landing-v2/coinbase-wallet.svg",
    "/assets/landing-v2/curve.svg",
    "/assets/landing-v2/debank.svg",
    "/assets/landing-v2/defillama.svg",
    "/assets/landing-v2/dune.svg",
    "/assets/landing-v2/etherscan.svg",
    "/assets/landing-v2/hardhat.svg",
    "/assets/landing-v2/infura.svg",
    "/assets/landing-v2/metamask-wallet.svg",
    "/assets/landing-v2/opensea.svg",
    "/assets/landing-v2/rainbow-wallet.svg",
    "/assets/landing-v2/uniswap-wallet.svg",
    "/assets/landing-v2/wallet-connect.svg",
    "/assets/landing-v2/yearn.svg",
  ];

  // Duplicate images to fill the grid
  const fullImages = [...images, ...images];

  const animateTextElement = () => {
    if (!textRef.current) return;

    const chars = textRef.current.querySelectorAll(".char");

    gsap
      .timeline({
        scrollTrigger: {
          trigger: textRef.current,
          start: "top bottom",
          end: "center center-=25%",
          scrub: true,
        },
      })
      .from(chars, {
        ease: "sine",
        yPercent: 300,
        autoAlpha: 0,
        stagger: {
          each: 0.04,
          from: "center",
        },
      });
  };

  const animateGridFull = () => {
    if (!gridFullRef.current) return;

    const gridFullItems =
      gridFullRef.current.querySelectorAll(".grid-full-item");
    const numColumns = 7; // Back to 7 columns
    const middleColumnIndex = Math.floor(numColumns / 2);

    // Organize items by columns
    const columns: Element[][] = Array.from({ length: numColumns }, () => []);
    gridFullItems.forEach((item, index) => {
      const columnIndex = index % numColumns;
      columns[columnIndex].push(item);
    });

    // Animate each column
    columns.forEach((columnItems, columnIndex) => {
      const delayFactor = Math.abs(columnIndex - middleColumnIndex) * 0.2; // Back to 0.2 delay

      // Entry Animation
      gsap
        .timeline({
          scrollTrigger: {
            trigger: mainRef.current, // Keep mainRef as it's more stable
            start: "top bottom",
            end: "center center",
            scrub: true,
          },
        })
        .from(columnItems, {
          yPercent: 450,
          autoAlpha: 0,
          delay: delayFactor,
          ease: "sine",
        })
        .from(
          columnItems.map((item) => item.querySelector(".grid-item-img")),
          {
            transformOrigin: "50% 0%", // Back to 50% 0%
            ease: "sine",
          },
          0,
        );

      // Exit Animation
      gsap
        .timeline({
          scrollTrigger: {
            trigger: mainRef.current,
            start: "center center",
            end: "bottom top",
            scrub: true,
          },
        })
        .to(columnItems, {
          yPercent: -450,
          autoAlpha: 0,
          delay: delayFactor,
          ease: "sine",
        });
    });
  };

  useEffect(() => {
    if (!isInView) {
      return;
    }
    const init = () => {
      animateTextElement();
      animateGridFull();
    };

    // Simulate image preloading
    const timer = setTimeout(() => {
      init();
    }, 100);

    return () => {
      clearTimeout(timer);
      ScrollTrigger.killAll();
    };
  }, [isInView]);

  return (
    <div className={cn("relative w-full", className)}>
      <div ref={mainInViewRef} className="relative w-full">
        
        {/* Full Grid Section */}
        <section className="relative -mt-[15vh] grid w-full place-items-center">
          <div
            ref={gridFullRef}
            className="my-0 grid aspect-[0.6] md:aspect-[1.5] h-auto w-full max-w-[1200px] grid-cols-3 md:grid-cols-7 grid-rows-auto md:grid-rows-5 gap-2 md:gap-4 p-2 md:p-4" // Responsive grid
          >
            {fullImages.slice(0, 35).map((img, index) => (
              <figure
                key={index}
                className="grid-full-item relative z-10 p-2 md:p-4 flex items-center justify-center"
                style={{
                  perspective: "800px",
                  willChange: "transform",
                }}
              >
                <div
                  className="grid-item-img backface-hidden h-full w-full bg-contain bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url(${img})`,
                    willChange: "transform",
                    // Scale removed (default 1.0)
                  }}
                />
              </figure>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export { Skiper32, WithFramerMotion, WithGsap };
