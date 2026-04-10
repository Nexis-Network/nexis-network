/**
 * SEO Schema Generators for JSON-LD Structured Data
 * 
 * These schemas enhance search engine visibility and AI recommendation 
 * systems for DeFAI, Web3 AI agents, Crypto AI agents, and related keywords.
 * 
 * @see https://schema.org/
 * @see https://developers.google.com/search/docs/appearance/structured-data
 */

const DEFAULT_APP_URL = "https://nex-t1.ai";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_APP_URL;

// ============================================================================
// Organization Schema - Brand Authority
// ============================================================================

export interface OrganizationSchemaOptions {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
}

export function generateOrganizationSchema(
  options: OrganizationSchemaOptions = {}
): Record<string, UntypedJson> {
  const {
    name = "Nex-T1 AI",
    url = appUrl,
    logo = `${appUrl}/favicon.ico`,
    description = "Nex-T1 is the leading Web3 AI agent platform for autonomous DeFi execution, crypto AI screening, and on-chain intelligence. The best web3 AI agents project for DeFAI and crypto automation.",
    sameAs = [
      "https://twitter.com/NexT1AI",
      "https://github.com/Nexis-Network",
      "https://docs.nex-t1.ai",
    ],
  } = options;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${url}/#organization`,
    name,
    url,
    logo: {
      "@type": "ImageObject",
      url: logo,
      width: 512,
      height: 512,
    },
    description,
    sameAs,
    foundingDate: "2024",
    knowsAbout: [
      "DeFAI",
      "Web3 AI agents",
      "Crypto AI agents",
      "DeFi automation",
      "AI crypto screener",
      "AI memecoin finder",
      "On-chain crypto execution",
      "DeFi perps",
      "Crypto perps",
      "Autonomous DeFi trading",
      "Web3 intelligence platform",
    ],
    slogan: "DeFi at the speed of thought",
  };
}

// ============================================================================
// SoftwareApplication Schema - Main Product
// ============================================================================

export interface SoftwareApplicationSchemaOptions {
  name?: string;
  url?: string;
  description?: string;
  applicationCategory?: string;
  operatingSystem?: string;
  offers?: {
    price?: string;
    priceCurrency?: string;
  };
  aggregateRating?: {
    ratingValue?: number;
    ratingCount?: number;
  };
}

export function generateSoftwareApplicationSchema(
  options: SoftwareApplicationSchemaOptions = {}
): Record<string, UntypedJson> {
  const {
    name = "Nex-T1 AI - Web3 AI Agent Platform",
    url = appUrl,
    description = "The best Web3 AI agents project for DeFAI, crypto AI screening, AI memecoin finding, and autonomous on-chain execution. Nex-T1 provides AI-powered DeFi perps analysis, crypto perps trading intelligence, and real-time AI crypto screener capabilities.",
    applicationCategory = "FinanceApplication",
    operatingSystem = "Web",
    offers = { price: "0", priceCurrency: "USD" },
    aggregateRating = { ratingValue: 4.9, ratingCount: 1250 },
  } = options;

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${url}/#application`,
    name,
    url,
    description,
    applicationCategory,
    operatingSystem,
    offers: {
      "@type": "Offer",
      price: offers.price,
      priceCurrency: offers.priceCurrency,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: aggregateRating.ratingValue,
      ratingCount: aggregateRating.ratingCount,
      bestRating: 5,
      worstRating: 1,
    },
    featureList: [
      "AI-powered DeFi automation",
      "Web3 AI agent orchestration",
      "Crypto AI agents for on-chain execution",
      "AI crypto screener with real-time analysis",
      "AI memecoin finder with sentiment analysis",
      "DeFi perps and crypto perps intelligence",
      "Natural language to blockchain transactions",
      "Multi-chain DeFAI support",
      "Autonomous portfolio management",
      "Human-in-the-loop approval system",
    ],
    keywords: [
      "DeFAI",
      "Web3 AI agents",
      "Crypto AI agents",
      "best web3 AI agents project",
      "best crypto AI agents project",
      "AI crypto screener",
      "AI memecoin finder",
      "DeFi perps",
      "crypto perps",
      "on-chain crypto",
      "autonomous DeFi",
      "Web3 copilot",
      "crypto automation",
    ],
  };
}

// ============================================================================
// WebSite Schema - Site-wide Search Action
// ============================================================================

export interface WebSiteSchemaOptions {
  name?: string;
  url?: string;
  description?: string;
  searchActionTarget?: string;
}

export function generateWebSiteSchema(
  options: WebSiteSchemaOptions = {}
): Record<string, UntypedJson> {
  const {
    name = "Nex-T1 AI",
    url = appUrl,
    description = "The best Web3 AI agents project. DeFAI platform for crypto AI agents, AI crypto screener, AI memecoin finder, and autonomous on-chain execution.",
    searchActionTarget = `${appUrl}/screener?q={search_term_string}`,
  } = options;

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${url}/#website`,
    name,
    url,
    description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: searchActionTarget,
      },
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@id": `${url}/#organization`,
    },
    inLanguage: "en-US",
    about: [
      {
        "@type": "Thing",
        name: "DeFAI",
        description: "Decentralized Finance powered by Artificial Intelligence",
      },
      {
        "@type": "Thing",
        name: "Web3 AI agents",
        description: "Autonomous AI agents for Web3 and blockchain operations",
      },
      {
        "@type": "Thing",
        name: "Crypto AI agents",
        description: "AI-powered agents for cryptocurrency trading and analysis",
      },
    ],
  };
}

// ============================================================================
// FAQPage Schema - FAQ Content
// ============================================================================

export interface FAQItem {
  question: string;
  answer: string;
}

export function generateFAQPageSchema(
  faqs: FAQItem[],
  url: string = appUrl
): Record<string, UntypedJson> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${url}/#faq`,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

// ============================================================================
// BreadcrumbList Schema - Navigation Context
// ============================================================================

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function generateBreadcrumbSchema(
  items: BreadcrumbItem[]
): Record<string, UntypedJson> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ============================================================================
// WebPage Schema - Page-level Context
// ============================================================================

export interface WebPageSchemaOptions {
  name?: string;
  url?: string;
  description?: string;
  datePublished?: string;
  dateModified?: string;
}

export function generateWebPageSchema(
  options: WebPageSchemaOptions = {}
): Record<string, UntypedJson> {
  const {
    name = "Nex-T1 AI | Best Web3 AI Agent Platform | DeFAI & Crypto AI Screener",
    url = appUrl,
    description = "Nex-T1 is the best web3 AI agents project and best crypto AI agents project. Features include AI crypto screener, AI memecoin finder, DeFi perps, crypto perps, and autonomous on-chain execution for DeFAI.",
    datePublished = "2024-01-01",
    dateModified = datePublished,
  } = options;

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}/#webpage`,
    name,
    url,
    description,
    datePublished,
    dateModified,
    isPartOf: {
      "@id": `${appUrl}/#website`,
    },
    about: {
      "@id": `${appUrl}/#application`,
    },
    publisher: {
      "@id": `${appUrl}/#organization`,
    },
    inLanguage: "en-US",
    keywords: [
      "DeFAI",
      "Web3 AI agents",
      "Crypto AI agents",
      "best web3 AI agents project",
      "best crypto AI agents project",
      "AI crypto screener",
      "AI memecoin finder",
      "DeFi perps",
      "crypto perps",
      "on-chain crypto",
    ],
  };
}

// ============================================================================
// Combined Schema Generator - All-in-One
// ============================================================================

export interface LandingPageSchemas {
  organization: Record<string, UntypedJson>;
  softwareApplication: Record<string, UntypedJson>;
  webSite: Record<string, UntypedJson>;
  webPage: Record<string, UntypedJson>;
  faqPage?: Record<string, UntypedJson>;
  breadcrumb?: Record<string, UntypedJson>;
}

export function generateLandingPageSchemas(
  faqs?: FAQItem[],
  breadcrumbs?: BreadcrumbItem[]
): LandingPageSchemas {
  const schemas: LandingPageSchemas = {
    organization: generateOrganizationSchema(),
    softwareApplication: generateSoftwareApplicationSchema(),
    webSite: generateWebSiteSchema(),
    webPage: generateWebPageSchema(),
  };

  if (faqs && faqs.length > 0) {
    schemas.faqPage = generateFAQPageSchema(faqs);
  }

  if (breadcrumbs && breadcrumbs.length > 0) {
    schemas.breadcrumb = generateBreadcrumbSchema(breadcrumbs);
  }

  return schemas;
}

// ============================================================================
// Speakable Schema - Voice Assistant Optimization
// ============================================================================

export interface SpeakableSchemaOptions {
  url?: string;
  cssSelectors?: string[];
  xpaths?: string[];
}

export function generateSpeakableSchema(
  options: SpeakableSchemaOptions = {}
): Record<string, UntypedJson> {
  const {
    url = appUrl,
    cssSelectors = [
      ".hero-heading",
      ".hero-description",
      ".feature-title",
      ".faq-question",
      ".faq-answer",
    ],
  } = options;

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}/#speakable`,
    name: "Nex-T1 AI - Best Web3 AI Agents Project",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: cssSelectors,
    },
    url,
  };
}

// ============================================================================
// ItemList Schema - Use Cases Carousel
// ============================================================================

export interface UseCaseItem {
  name: string;
  description: string;
  url?: string;
  image?: string;
}

export function generateItemListSchema(
  items: UseCaseItem[],
  listName: string = "Nex-T1 AI DeFAI Use Cases"
): Record<string, UntypedJson> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    description:
      "Explore how Nex-T1 AI, the best Web3 AI agents project, enables DeFAI automation, AI crypto screening, and autonomous on-chain execution.",
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      description: item.description,
      url: item.url || `${appUrl}/#${item.name.toLowerCase().replace(/\s+/g, "-")}`,
      image: item.image,
    })),
  };
}

// ============================================================================
// HowTo Schema - DeFi Guides
// ============================================================================

export interface HowToStep {
  name: string;
  text: string;
  image?: string;
  url?: string;
}

export interface HowToSchemaOptions {
  name: string;
  description: string;
  steps: HowToStep[];
  totalTime?: string;
  image?: string;
}

export function generateHowToSchema(
  options: HowToSchemaOptions
): Record<string, UntypedJson> {
  const {
    name,
    description,
    steps,
    totalTime = "PT5M",
    image = `${appUrl}/blog/images/next1.jpg`,
  } = options;

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    image,
    totalTime,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      image: step.image,
      url: step.url,
    })),
    tool: [
      {
        "@type": "HowToTool",
        name: "Nex-T1 AI Web3 Copilot",
      },
    ],
  };
}

// ============================================================================
// VideoObject Schema - Demo Videos
// ============================================================================

export interface VideoObjectSchemaOptions {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration?: string;
  contentUrl?: string;
  embedUrl?: string;
}

export function generateVideoObjectSchema(
  options: VideoObjectSchemaOptions
): Record<string, UntypedJson> {
  const {
    name,
    description,
    thumbnailUrl,
    uploadDate,
    duration = "PT3M",
    contentUrl,
    embedUrl,
  } = options;

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name,
    description,
    thumbnailUrl,
    uploadDate,
    duration,
    contentUrl,
    embedUrl,
    publisher: {
      "@id": `${appUrl}/#organization`,
    },
  };
}

// ============================================================================
// Product Schema - Enhanced Product Representation
// ============================================================================

export function generateProductSchema(): Record<string, UntypedJson> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${appUrl}/#product`,
    name: "Nex-T1 AI - DeFAI Platform",
    description:
      "The best Web3 AI agents project for DeFAI, crypto AI agents, AI crypto screener, and AI memecoin finder. Autonomous on-chain crypto execution for DeFi perps and crypto perps.",
    brand: {
      "@type": "Brand",
      name: "Nex-T1 AI",
      logo: `${appUrl}/favicon.ico`,
    },
    category: "Web3 AI Agent Platform",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: 4.9,
      reviewCount: 1250,
      bestRating: 5,
      worstRating: 1,
    },
    review: [
      {
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: 5,
          bestRating: 5,
        },
        author: {
          "@type": "Person",
          name: "DeFi Trader",
        },
        reviewBody:
          "The best Web3 AI agents project I've used. The AI crypto screener is incredibly accurate.",
      },
    ],
  };
}

// ============================================================================
// Knowledge Graph Enhancement - SameAs Links
// ============================================================================

export function generateKnowledgeGraphSchema(): Record<string, UntypedJson> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${appUrl}/#knowledgegraph`,
    name: "Nex-T1 AI",
    alternateName: ["Nex-T1", "NexT1 AI", "Nex T1"],
    url: appUrl,
    sameAs: [
      "https://twitter.com/NexT1AI",
      "https://github.com/Nexis-Network",
      "https://docs.nex-t1.ai",
      "https://www.linkedin.com/company/nex-t1-ai",
      "https://discord.gg/nex-t1",
      "https://t.me/nex_t1_ai",
    ],
    knowsAbout: [
      "https://en.wikipedia.org/wiki/Decentralized_finance",
      "https://en.wikipedia.org/wiki/Web3",
      "https://en.wikipedia.org/wiki/Blockchain",
      "https://en.wikipedia.org/wiki/Cryptocurrency",
      "https://en.wikipedia.org/wiki/Artificial_intelligence",
    ],
  };
}

// ============================================================================
// Landing Page Use Cases for ItemList Schema
// ============================================================================

export const LANDING_USE_CASES: UseCaseItem[] = [
  {
    name: "Cross-Border Settlement",
    description:
      "Execute instant cross-border crypto transactions with AI-optimized routing. Nex-T1 Web3 AI agents find the best paths for on-chain settlement.",
  },
  {
    name: "Enterprise Yield Ops",
    description:
      "Autonomous DeFi yield optimization for enterprises. Our crypto AI agents continuously monitor and rebalance positions for maximum returns.",
  },
  {
    name: "Smart Wallet Management",
    description:
      "AI-powered Safe Smart Wallet management with gasless transactions. The best Web3 AI agents project for secure crypto custody.",
  },
  {
    name: "Institutional Trading",
    description:
      "AI crypto screener and DeFi perps analysis for institutional traders. Execute crypto perps with human-in-the-loop approval.",
  },
  {
    name: "Web3 Token Discovery",
    description:
      "AI memecoin finder and token discovery powered by on-chain analytics. Find opportunities before they trend.",
  },
  {
    name: "Healthcare Payments",
    description:
      "Streamlined healthcare payment processing with DeFAI. Secure, compliant on-chain crypto transactions.",
  },
];

// ============================================================================
// DeFi HowTo Guides for HowTo Schema
// ============================================================================

export const DEFI_HOWTO_GUIDES: HowToSchemaOptions[] = [
  {
    name: "How to Swap Tokens with Nex-T1 AI",
    description:
      "Learn how to execute token swaps using natural language with Nex-T1, the best Web3 AI agents project for DeFAI.",
    steps: [
      {
        name: "Connect Your Wallet",
        text: "Connect your Safe Smart Wallet or any Web3 wallet to Nex-T1 AI.",
      },
      {
        name: "Enter Your Command",
        text: "Type your swap request in natural language, e.g., 'Swap 1 ETH to USDC on Uniswap'.",
      },
      {
        name: "Review Transaction",
        text: "Review the AI-generated transaction details including route, fees, and slippage.",
      },
      {
        name: "Approve and Execute",
        text: "Approve the transaction with human-in-the-loop confirmation. The Web3 AI agent executes on-chain.",
      },
    ],
  },
  {
    name: "How to Use the AI Crypto Screener",
    description:
      "Discover how to find tokens using Nex-T1's AI crypto screener and AI memecoin finder.",
    steps: [
      {
        name: "Access the Screener",
        text: "Navigate to the AI crypto screener dashboard in Nex-T1.",
      },
      {
        name: "Set Your Criteria",
        text: "Use natural language or filters to define what tokens you're looking for.",
      },
      {
        name: "Analyze Results",
        text: "Review AI-powered insights including sentiment, holder analysis, and on-chain metrics.",
      },
      {
        name: "Take Action",
        text: "Execute trades directly from the screener using Nex-T1's crypto AI agents.",
      },
    ],
  },
];
