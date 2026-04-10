import { useMemo } from "react";
import { useAgentWizardStore } from "../store";
import { generateCharacterConfig } from "@/lib/eliza-os/character-generator";
import { Button } from "@/components/ui/button";
import { useConnectEoaWallet } from "@/lib/hooks/wallet/use-connect-eoa-wallet";
import { toast } from "sonner";

import { logger } from '@/lib/logger';
export function ReviewStep() {
  const { data, prevStep } = useAgentWizardStore();
  const { address, isConnected } = useConnectEoaWallet();

  const previewConfig = useMemo(() => generateCharacterConfig(data), [data]);

  const handleLaunch = async () => {
    try {
        if (!isConnected || !address) {
            toast.error("Please connect a wallet before deploying an agent.");
            return;
        }

        const { createAgentAction } = await import("@/app/actions/launchpad");

        const result = await createAgentAction(data, address);
        if (result.success) {
            toast.success("Agent created successfully.");
            window.location.href = "/launchpad/dashboard";
        }
    } catch (e) {
        logger.error(e);
        toast.error("Failed to create agent.");
    }
  };

  return (
    <div className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Review Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Verify your agent details. This will generate the following ElizaOS Character file.
        </p>
      </div>

      <div className="rounded-md bg-muted p-4">
        <div className="flex items-center justify-between mb-2">
             <span className="text-xs font-semibold uppercase text-muted-foreground">character.json Preview</span>
        </div>
        <pre className="overflow-auto text-xs font-mono max-h-[300px]">
            {JSON.stringify(previewConfig, null, 2)}
        </pre>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button
          onClick={handleLaunch}
          disabled={!isConnected || !address}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          {isConnected ? "Sign & Deploy" : "Connect Wallet to Deploy"}
        </Button>
      </div>
    </div>
  );
}
