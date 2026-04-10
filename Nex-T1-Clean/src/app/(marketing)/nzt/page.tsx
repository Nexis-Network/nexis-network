import type { Metadata } from "next";

import { LandingHeader } from "@/components/landing/landing-header";
import { SplineCanvas } from "@/components/visuals/spline/spline-canvas";

const TOKEN_SPLINE_SCENE_URL = "https://prod.spline.design/HHHgIHHook8wKzo0/scene.splinecode";

export const metadata: Metadata = {
  title: "NZT Token | Nex-T1 Autonomous Crypto Copilot",
  description:
    "Discover Nexis (NZT), the native gas and utility token fueling the Nexis Network DeFAI ecosystem and accelerating autonomous finance.",
  alternates: {
    canonical: "/nzt",
  },
  openGraph: {
    title: "NZT Token | Nex-T1 Autonomous Crypto Copilot",
    description:
      "Experience Nexis (NZT), the native gas and utility token propelling the Nexis Network into the future of DeFAI.",
    url: "/nzt",
    images: [
      {
        url: "/web-preview.png",
        width: 1200,
        height: 630,
        alt: "Nex-T1 token immersive preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NZT Token | Nex-T1 Autonomous Crypto Copilot",
    description:
      "Learn how Nexis (NZT), the native gas and utility token, powers the Nexis Network’s DeFAI automation.",
    images: ["/web-preview.png"],
  },
};

import { NZTLeaderLines } from "@/components/nzt/nzt-leader-lines";

export default function TokenPage() {
  return (
    <div className="relative min-h-dvh w-full overflow-hidden">
      <SplineCanvas
        sceneUrl={TOKEN_SPLINE_SCENE_URL}
        className="absolute inset-0 z-0 h-full w-full"
        canvasClassName="absolute inset-0"
        instrumentationTag="nzt-token-spline"
      />
      <LandingHeader variant="inverse" />

      {/* Interactive Leader Lines Overlay */}
      <NZTLeaderLines />

      <main className="sr-only">
        <h1>NZT token interactive experience</h1>
      </main>
    </div>
  );
}

