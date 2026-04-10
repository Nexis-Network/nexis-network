import { DocsExampleWorkflows } from "@/components/docs/docs-example-workflows";
import { DocsNexAgentKit } from "@/components/docs/docs-nex-agentkit";
import { DocsNexCopilot } from "@/components/docs/docs-nex-copilot";
import { DocsPlatformOverview } from "@/components/docs/docs-platform-overview";
import { DocsChangelog } from "@/components/docs/docs-changelog";
import { DocsPromptCarousel } from "@/components/docs/docs-prompt-carousel";
import { DocsRoadmap } from "@/components/docs/docs-roadmap";
import { DocsSecurityModel } from "@/components/docs/docs-security-model";
import { DocsSupportedChains } from "@/components/docs/docs-supported-chains";
import { DocsWalletInfrastructure } from "@/components/docs/docs-wallet-infrastructure";
import { DOCS_PROMPT_GROUPS } from "@/modules/docs/prompt-groups";
import type { DocsPageEnhancementId } from "@/modules/docs/types";

export function DocsPageEnhancement({
  enhancement,
}: {
  enhancement: DocsPageEnhancementId;
}) {
  if (enhancement === "platform-overview") {
    return <DocsPlatformOverview />;
  }

  if (enhancement === "nex-copilot") {
    return <DocsNexCopilot />;
  }

  if (enhancement === "nex-agentkit") {
    return <DocsNexAgentKit />;
  }

  if (enhancement === "supported-chains") {
    return <DocsSupportedChains />;
  }

  if (enhancement === "wallet-infrastructure") {
    return <DocsWalletInfrastructure />;
  }

  if (enhancement === "security-model") {
    return <DocsSecurityModel />;
  }

  if (enhancement === "example-workflows") {
    return <DocsExampleWorkflows />;
  }

  if (enhancement === "example-prompts") {
    return (
      <div className="space-y-10 md:space-y-12">
        {DOCS_PROMPT_GROUPS.map((group) => (
          <DocsPromptCarousel key={group.id} group={group} />
        ))}
      </div>
    );
  }

  if (enhancement === "changelog") {
    return <DocsChangelog />;
  }

  return <DocsRoadmap />;
}
