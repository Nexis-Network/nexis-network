export type HobbesFooterCtaCard = {
  eyebrow: string;
  title: string;
  actionLabel: string;
  href: string;
  variant: "solid" | "outline";
};

export type HobbesFooterLinkItem = {
  label: string;
  href: string;
};

export type HobbesFooterLinkGroup = {
  title: string;
  items: readonly HobbesFooterLinkItem[];
};

export type HobbesFooterSocialLink = {
  label: string;
  href: string;
};

export const HOBBES_FOOTER_CTA_CARDS = [
  {
    eyebrow: "[01]",
    title: "Connect to our team",
    actionLabel: "Get Connected",
    href: "https://enterprise.layerzero.network/",
    variant: "solid",
  },
  {
    eyebrow: "[02]",
    title: "Read our technical positioning paper",
    actionLabel: "Read the Paper",
    href: "https://layerzero.network/blog/zero-technical-positioning-paper",
    variant: "outline",
  },
] as const satisfies readonly HobbesFooterCtaCard[];

export const HOBBES_FOOTER_LINK_GROUPS = [
  {
    title: "Developers",
    items: [
      { label: "Developer Assistance", href: "https://docs.layerzero.network/community" },
      { label: "LayerZero Scan", href: "https://layerzeroscan.com" },
      { label: "LayerZero V2 Github", href: "https://github.com/LayerZero-Labs/LayerZero-v2" },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Whitepaper", href: "https://layerzero.network/publications/LayerZero_Whitepaper_V2.1.1.pdf" },
      { label: "Documentation", href: "https://docs.layerzero.network" },
      { label: "Subscribe", href: "https://layerzero.network/subscribe" },
    ],
  },
  {
    title: "Help",
    items: [
      { label: "Media Kit", href: "https://publicdocs.notion.site/Layer-Zero-Media-Kit-bd838df13f864a4b9f403c789c670d9a" },
      { label: "Support", href: "https://docs.layerzero.network/community" },
    ],
  },
  {
    title: "Legal",
    items: [
      { label: "Terms of Use", href: "https://layerzero.network/terms" },
      { label: "Privacy Policy", href: "https://layerzero.network/privacy" },
      { label: "Cookie Policy", href: "https://layerzero.network/cookies" },
    ],
  },
  {
    title: "Careers",
    items: [{ label: "[ 19 ] We're Hiring", href: "https://layerzero.network/careers" }],
  },
] as const satisfies readonly HobbesFooterLinkGroup[];

export const HOBBES_FOOTER_SOCIAL_LINKS = [
  { label: "Telegram", href: "https://t.me/joinchat/VcqxYkStIDsyN2Rh" },
  { label: "Discord", href: "https://discord.com/invite/ktbvm8Nkcr" },
  { label: "X (Twitter)", href: "https://x.com/layerzero_core" },
] as const satisfies readonly HobbesFooterSocialLink[];
