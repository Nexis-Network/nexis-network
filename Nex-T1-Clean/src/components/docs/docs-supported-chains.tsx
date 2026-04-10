import Image from "next/image";

import {
  DocsCallout,
  DocsList,
  DocsSection,
  DocsTable,
} from "@/components/docs/docs-primitives";
import { SUPPORTED_EVM_CHAINS } from "@/modules/docs/supported-chains-data";

export function DocsSupportedChains() {
  return (
    <div className="space-y-10 md:space-y-12">
      <DocsSection id="evm-chains" title="EVM chains">
        <p>
          Nex-T1 supports EVM workflows across the chain set currently surfaced in wallet,
          treasury, portfolio, and research views. Actual availability still depends on the
          connected wallet, balance location, and the action you are trying to run.
        </p>
        <DocsTable
          columns={["Chain", "Best for", "Notes"]}
          rows={SUPPORTED_EVM_CHAINS.map((chain) => [
            <div key={`${chain.id}-name`} className="flex items-center gap-3">
              <span className="relative size-8 overflow-hidden rounded-full border border-border/60 bg-muted/40">
                <Image
                  src={chain.icon}
                  alt={`${chain.name} icon`}
                  fill
                  sizes="32px"
                  className="object-cover p-1"
                />
              </span>
              <span className="font-medium text-foreground">{chain.name}</span>
            </div>,
            chain.bestFor,
            chain.notes,
          ])}
        />
      </DocsSection>

      <DocsSection id="solana-coverage" title="Solana coverage">
        <p>
          Solana support is part of Nex AgentKit and is available for research, wallet-aware
          context, and supported task flows where the required accounts and permissions are in place.
        </p>
        <DocsList
          items={[
            "Use Solana when you want chain-specific research, wallet review, or supported DAO and asset workflows tied to Solana accounts.",
            "Execution depth can vary by the specific workflow, the wallet you are using, and whether the target DAO or market context is already connected.",
            "If a workflow spans EVM and Solana, keep the chain named explicitly in your prompt so the response stays scoped to the right context.",
          ]}
        />
        <DocsCallout title="Before acting on Solana">
          <p>
            Confirm the wallet address, the network context, and whether the task is read-first or
            approval-gated before you move from analysis into execution.
          </p>
        </DocsCallout>
      </DocsSection>

      <DocsSection id="chain-selection-guidance" title="Chain selection guidance">
        <DocsList
          items={[
            "Name the chain directly in prompts when you need portfolio analysis, trading prep, or governance support.",
            "If balances are split across networks, ask for a comparison first instead of forcing an action on one chain too early.",
            "Treat wallet type, token location, and treasury ownership as separate checks before approving any move that changes funds or permissions.",
          ]}
        />
      </DocsSection>
    </div>
  );
}
