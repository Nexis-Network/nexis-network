import {
  DEFI_HOWTO_GUIDES,
  LANDING_USE_CASES,
  type FAQItem,
  generateFAQPageSchema,
  generateHowToSchema,
  generateItemListSchema,
  generateKnowledgeGraphSchema,
  generateOrganizationSchema,
  generateProductSchema,
  generateSoftwareApplicationSchema,
  generateSpeakableSchema,
  generateWebPageSchema,
  generateWebSiteSchema,
} from "@/lib/seo/seo-schemas";

const DEFAULT_APP_URL = "https://nex-t1.ai";
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_APP_URL;
const landingV3Url = `${appUrl}/landing-v3`;

const LANDING_V3_FAQS: FAQItem[] = [
  {
    question: "What is Nex-T1 landing-v3?",
    answer:
      "Landing-v3 is the latest Nex-T1 marketing variant for A/B testing. It highlights autonomous DeFi execution, AI crypto screening, and multi-chain on-chain automation in a performance-optimized layout.",
  },
  {
    question: "Does landing-v3 support mobile devices?",
    answer:
      "Yes. Landing-v3 is designed with responsive layouts and section-level performance optimizations for mobile, tablet, and desktop experiences.",
  },
  {
    question: "How is landing-v3 optimized for SEO?",
    answer:
      "Landing-v3 includes route-specific canonical metadata, Open Graph and Twitter metadata, structured JSON-LD, and keyword-focused copy for DeFAI, Web3 AI agents, and autonomous on-chain execution use cases.",
  },
  {
    question: "What can users do with Nex-T1?",
    answer:
      "Nex-T1 lets users convert natural-language intent into on-chain actions, including swaps, bridge flows, DeFi strategy execution, portfolio monitoring, and AI-assisted token discovery workflows.",
  },
];

export function LandingV3JsonLd() {
  const organization = generateOrganizationSchema({
    url: appUrl,
  });
  const softwareApplication = generateSoftwareApplicationSchema({
    url: appUrl,
  });
  const webSite = generateWebSiteSchema({
    url: appUrl,
  });
  const webPage = generateWebPageSchema({
    name: "Nex-T1 AI | Landing V3 | Autonomous DeFi Copilot",
    url: landingV3Url,
    description:
      "Nex-T1 landing-v3 is a high-performance DeFAI experience focused on Web3 AI agents, AI crypto screening, and autonomous on-chain execution.",
  });
  const faqPage = generateFAQPageSchema(LANDING_V3_FAQS, landingV3Url);
  const speakable = generateSpeakableSchema({
    url: landingV3Url,
    cssSelectors: [".hero-heading", ".hero-subheading", ".feature-title", ".faq-question"],
  });
  const itemList = generateItemListSchema(LANDING_USE_CASES, "Nex-T1 Landing V3 Use Cases");
  const product = generateProductSchema();
  const knowledgeGraph = generateKnowledgeGraphSchema();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplication) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSite) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(speakable) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(product) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(knowledgeGraph) }} />
      {DEFI_HOWTO_GUIDES.map((guide, index) => (
        <script
          key={`landing-v3-howto-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(generateHowToSchema(guide)) }}
        />
      ))}
    </>
  );
}
