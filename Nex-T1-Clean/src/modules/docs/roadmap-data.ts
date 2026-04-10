export type DocsRoadmapItem = {
  id: string;
  title: string;
  stage: "Planned" | "Exploring";
  body: string;
};

export const DOCS_ROADMAP_ITEMS: DocsRoadmapItem[] = [
  {
    id: "workflow-guidance",
    title: "More guided workflow templates",
    stage: "Planned",
    body:
      "Expand reusable walkthroughs for portfolio reviews, treasury operations, governance preparation, and market monitoring so users can start from stronger defaults.",
  },
  {
    id: "approval-visibility",
    title: "Clearer approval visibility",
    stage: "Planned",
    body:
      "Improve how pending actions, wallet context, and account-linked permissions are surfaced before users approve sensitive operations.",
  },
  {
    id: "research-depth",
    title: "Broader research and monitoring coverage",
    stage: "Exploring",
    body:
      "Extend the depth of read-first research views across on-chain activity, portfolio diagnostics, and exchange-linked monitoring without reducing review control.",
  },
  {
    id: "governance-helpers",
    title: "More governance preparation helpers",
    stage: "Exploring",
    body:
      "Add more guided support for proposal drafting, treasury review, and governance coordination where the connected DAO workspace and wallet permissions allow it.",
  },
];
