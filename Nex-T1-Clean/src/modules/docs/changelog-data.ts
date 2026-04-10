export type DocsChangelogEntry = {
  id: string;
  date: string;
  title: string;
  summary: string;
  changes: string[];
};

export const DOCS_CHANGELOG_ENTRIES: DocsChangelogEntry[] = [
  {
    id: "2026-03-docs-refresh",
    date: "March 14, 2026",
    title: "User-facing docs refresh",
    summary:
      "The authenticated docs experience now explains the platform around workflows, approvals, and operating guidance instead of internal implementation details.",
    changes: [
      "Expanded the docs information architecture to cover wallets, DAOs, automation, trading, prediction markets, exchange connections, and security.",
      "Reframed agent capabilities under Nex AgentKit so users see outcomes and controls instead of internal system names.",
      "Added example workflows, prompt patterns, FAQ coverage, and clearer guidance on conditional features such as Polymarket and exchange-linked actions.",
    ],
  },
  {
    id: "2026-03-workflow-guidance",
    date: "March 14, 2026",
    title: "Workflow guidance improvements",
    summary:
      "Examples and best-practice guidance now map more directly to the product surfaces users can already access inside Nex-T1 today.",
    changes: [
      "Added portfolio review, DAO operations, prediction-market preparation, and automation review workflows.",
      "Clarified that automation is approval-aware and settings-governed rather than open-ended autonomous execution.",
      "Documented how wallet context, DAO bindings, credentials, and exchange permissions affect what actions can proceed.",
    ],
  },
];
