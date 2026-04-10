import { 
  RocketIcon, 
  LayersIcon, 
  CodeIcon, 
  ReaderIcon, 
  PersonIcon, 
  ChatBubbleIcon, 
  CubeIcon, 
  FileTextIcon, 
  GlobeIcon, 
  LightningBoltIcon,
  IdCardIcon,
  DashboardIcon,
  TargetIcon,
  GearIcon,
  LaptopIcon,
  SketchLogoIcon
} from "@radix-ui/react-icons";
import Image from "next/image";
import React from "react";

// --- Types ---
export type MenuItem = {
  title: string;
  items: { label: string; href: string; icon?: React.ReactNode }[];
};

export type MenuContent = {
  firstUl: MenuItem;
  secondUl?: MenuItem;
  thirdUl?: MenuItem;
};

export type MenuData = Record<string, MenuContent>;

// Custom Icons for Socials
export const TwitterIcon = () => (
    <Image 
        src="/icons/social-icons/x.svg" 
        alt="Twitter" 
        width={16} 
        height={16} 
        sizes="20px"
        className="opacity-70 group-hover:opacity-100 transition-opacity" 
    />
);

export const DiscordIcon = () => (
    <Image 
        src="/icons/social-icons/discord.svg" 
        alt="Discord" 
        width={16} 
        height={16} 
        sizes="20px"
        className="opacity-70 group-hover:opacity-100 transition-opacity" 
    />
);

export const NAVIGATION_ITEMS = ["AI", "Apps", "Protocol", "Developers", "Resources"] as const;

export const MENU_CONTENT: MenuData = {
  AI: {
    firstUl: {
      title: "AI",
      items: [
        { label: "Nex-T1", href: "/nex-t1", icon: <RocketIcon className="w-4 h-4" /> },
        { label: "AI Arena", href: "/ai-leaderboard", icon: <LightningBoltIcon className="w-4 h-4" /> },
        { label: "Agent Marketplace", href: "/marketplace", icon: <CubeIcon className="w-4 h-4" /> },
        { label: "Nex Console", href: "/nex-console", icon: <DashboardIcon className="w-4 h-4" /> },
      ],
    },
    secondUl: {
      title: "AI Tools",
      items: [
        { label: "Nex MCP", href: "/nex-mcp", icon: <CodeIcon className="w-4 h-4" /> },
        { label: "Agent Builder", href: "/agents/new", icon: <GearIcon className="w-4 h-4" /> },
        { label: "Agent Launchpad", href: "/launchpad", icon: <RocketIcon className="w-4 h-4" /> },

      ],
    },
  },
  Apps: {
    firstUl: {
      title: "Platform",
      items: [
        { label: "Nex Cloud", href: "/nex-cloud", icon: <GearIcon className="w-4 h-4" /> },
        { label: "Nex Runtime", href: "/nex-runtime", icon: <LayersIcon className="w-4 h-4" /> },
        { label: "Screener", href: "/ai-crypto-screener", icon: <DashboardIcon className="w-4 h-4" /> },
      ],
    },
    secondUl: {
        title: "Security + Data",
        items: [
            { label: "Nex Verify", href: "/nex-verify", icon: <TargetIcon className="w-4 h-4" /> },
            { label: "Nex Grid", href: "/nex-grid", icon: <GlobeIcon className="w-4 h-4" /> },
        ]
    }
  },
  Protocol: {
    firstUl: {
      title: "Network",
      items: [
        { label: "Nexis AI Chain", href: "https://github.com/Nexis-AI/Nexis-appchain", icon: <LayersIcon className="w-4 h-4" /> },
        { label: "Ecosystem", href: "/ecosystem", icon: <GlobeIcon className="w-4 h-4" /> },
      ],
    },
    secondUl: {
        title: "Tokenomics",
        items: [
            { label: "Token (NZT)", href: "/nzt", icon: <IdCardIcon className="w-4 h-4" /> },
            { label: "Pricing", href: "/pricing", icon: <FileTextIcon className="w-4 h-4" /> },
        ]
    }
  },
  Developers: {
    firstUl: {
      title: "Learn",
      items: [
        { label: "Documentation", href: "https://docs.nex-t1.ai", icon: <ReaderIcon className="w-4 h-4" /> },
        { label: "API Reference", href: "https://registry.scalar.com/@nex-t1/apis/nex-t1-defai/", icon: <CodeIcon className="w-4 h-4" /> },
        { label: "Tutorials", href: "https://docs.nex-t1.ai/tutorials/deploy-contract", icon: <LaptopIcon className="w-4 h-4" /> },
      ],
    },
    secondUl: {
      title: "Build",
      items: [
        { label: "Nex-T1 API", href: "https://docs.nex-t1.ai/Nex-T1/overview", icon: <CodeIcon className="w-4 h-4" /> },
        { label: "Prompting Guide", href: "https://docs.nex-t1.ai/Nex-T1/prompting-guide", icon: <ChatBubbleIcon className="w-4 h-4" /> },
        { label: "Supported Chains", href: "https://docs.nex-t1.ai/Nex-T1/supported-chains", icon: <LayersIcon className="w-4 h-4" /> },
        { label: "Supported Protocols", href: "https://docs.nex-t1.ai/Nex-T1/supported-protocols", icon: <GlobeIcon className="w-4 h-4" /> },
        { label: "List your MCP", href: "https://github.com/Nexis-AI/Ultimate-Catalog-of-Web3-DeFi-Crypto-MCP-Servers-for-Secure-On-Chain-Operations", icon: <CubeIcon className="w-4 h-4" /> },
      ],
    },
    thirdUl: {
        title: "Programs",
        items: [
            { label: "Research", href: "https://github.com/Nexis-AI/Nex-T1-Research", icon: <ReaderIcon className="w-4 h-4" /> },
            { label: "Hackathon", href: "https://docs.nex-t1.ai/hackathon/introduction", icon: <RocketIcon className="w-4 h-4" /> },
            { label: "Bug Bounty", href: "https://docs.nex-t1.ai/bug-bounty/overview", icon: <TargetIcon className="w-4 h-4" /> },
        ]
    }
  },
  Resources: {
    firstUl: {
      title: "Community",
      items: [
        { label: "Blog", href: "/blog", icon: <ReaderIcon className="w-4 h-4" /> },
        { label: "Discord", href: "https://discord.gg/nexis", icon: <DiscordIcon /> },
        { label: "Twitter", href: "https://twitter.com/nexis_network", icon: <TwitterIcon /> },
      ],
    },
    secondUl: {
      title: "Company",
      items: [
        { label: "About", href: "/about", icon: <PersonIcon className="w-4 h-4" /> },
        { label: "Brand Guidelines", href: "/brand-guidelines", icon: <SketchLogoIcon className="w-4 h-4" /> },
        { label: "Careers", href: "/careers", icon: <RocketIcon className="w-4 h-4" /> },
        { label: "Contact", href: "mailto:hello@nex-t1.ai", icon: <ChatBubbleIcon className="w-4 h-4" /> },
      ],
    },
  },
};
