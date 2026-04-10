"use client";

import { useAgentWizardStore } from "../store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function EconomicsStep() {
  const { data, setData, nextStep, prevStep } = useAgentWizardStore();

  return (
    <div className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Launch Economics</h3>
        <p className="text-sm text-muted-foreground">
          Configure the bonding curve and anti-bot protection (Virtualz mechanics).
        </p>
      </div>

      <div className="grid gap-6">
        <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
                <Label className="text-base">Anti-Sniper Mode</Label>
                <p className="text-sm text-muted-foreground">
                    Enable dynamic tax (99% → 1%) to prevent bot sniping.
                </p>
            </div>
            <Switch
                checked={data.antiSniperMode}
                onCheckedChange={(checked) => setData({ antiSniperMode: checked })}
            />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="initialBuy">Initial Buy Amount (ETH)</Label>
          <Input
            id="initialBuy"
            type="number"
            step="0.01"
            value={data.initialBuyAmount}
            onChange={(e) => setData({ initialBuyAmount: parseFloat(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">
            Buy some tokens immediately upon launch to bootstrap the curve.
          </p>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button onClick={nextStep}>
          Review & Launch
        </Button>
      </div>
    </div>
  );
}
