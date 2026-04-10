"use client";

import * as React from "react";

import { useTranslations } from "@/components/providers/locale-provider";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
} from "@/components/ui/carousel";
import { getOnboardingCarouselCopy } from "@/modules/auth/i18n";

export function OnboardingCarousel() {
    const t = useTranslations("auth");
    const copy = getOnboardingCarouselCopy(t);
    const [api, setApi] = React.useState<UntypedJson>();
    const [current, setCurrent] = React.useState(0);

    React.useEffect(() => {
        if (!api) {
            return;
        }

        setCurrent(api.selectedScrollSnap());

        api.on("select", () => {
            setCurrent(api.selectedScrollSnap());
        });
    }, [api]);

    return (
        <div className="flex flex-col items-center gap-8">
            <Carousel
                setApi={setApi}
                opts={{
                    loop: true,
                }}
                className="w-full"
            >
                <CarouselContent>
                    {copy.slides.map((slide, index) => (
                        <CarouselItem key={index} className="flex flex-col items-center text-center">
                            <h2 className="mb-2 font-sans text-[28px] font-medium leading-[39px] tracking-[-0.16px] text-white">
                                {slide.title}
                            </h2>
                            <p className="max-w-[288px] font-sans text-[15px] font-normal leading-[24px] tracking-[-0.16px] text-white/80">
                                {slide.description}
                            </p>
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>

            {/* Custom Dots */}
            <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-2">
                {copy.slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => api?.scrollTo(index)}
                        className={`h-2 w-2 rounded-full transition-all ${current === index + 1
                            ? "bg-[#0088ff]"
                            : "bg-white/50"
                            }`}
                        aria-label={copy.goToSlide(index + 1)}
                    />
                ))}
            </div>
        </div>
    );
}
