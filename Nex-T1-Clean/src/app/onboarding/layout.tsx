import type { ReactNode } from "react";
import Image from "next/image";

import { AppProviders } from "@/components/providers/app-providers";
import { SupabaseAuthBoundary } from "@/components/providers/supabase-auth-provider";
import { StairsPageTransition } from "@/components/visuals/transitions/stairs-page-transition";
import { OnboardingCarousel } from "@/components/onboarding/onboarding-carousel";
import { OnboardingUnicornBackground } from "@/components/ui/onboarding-unicorn-background";

type OnboardingLayoutProps = {
    children: ReactNode;
};

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
    return (
        <AppProviders>
            <SupabaseAuthBoundary>
                <StairsPageTransition contentClassName="flex min-h-screen w-full bg-background text-foreground">
                    {/* Left Column: Image Carousel */}
                    <div
                        className="relative hidden w-[600px] flex-none flex-col justify-between overflow-hidden rounded-lg border border-border p-10 lg:flex corner-shine"
                        style={{ marginTop: "12px", marginLeft: "12px", marginBottom: "12px" }}
                    >
                        <OnboardingUnicornBackground />

                        <div className="relative z-10">
                            <Image
                                src="/icons/onboarding-logo.svg"
                                alt="Nexis Logo"
                                width={42}
                                height={14}
                                style={{ width: 69.43, height: 23.14, maxWidth: "none" }}
                                priority
                            />
                        </div>

                        <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
                            <div className="relative aspect-square w-full max-w-[160px]">
                                <Image
                                    src="/Container.svg"
                                    alt="Onboarding Visual"
                                    fill
                                    className="object-contain"
                                    priority
                                    sizes="160px"
                                />
                            </div>
                            <div className="mt-12 w-full max-w-[400px]">
                                <OnboardingCarousel />
                            </div>
                        </div>

                        {/* Empty div for spacing if needed, or copyright */}
                        <div />
                    </div>

                    {/* Right Column: Form Container */}
                    <div className="flex flex-1 flex-col justify-center bg-background p-10">
                        <div className="mx-auto w-full max-w-[480px]">{children}</div>
                    </div>
                </StairsPageTransition>
            </SupabaseAuthBoundary>
        </AppProviders>
    );
}
