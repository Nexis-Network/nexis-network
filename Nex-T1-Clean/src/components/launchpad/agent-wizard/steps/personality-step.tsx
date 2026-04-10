"use client";

import { useAgentWizardStore } from "../store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function PersonalityStep() {
  const { data, setData, nextStep, prevStep } = useAgentWizardStore();

  return (
    <div className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Personality & Behavior</h3>
        <p className="text-sm text-muted-foreground">
          Configure how your agent thinks and interacts (ElizaOS settings).
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="systemPrompt">System Prompt / Lore</Label>
          <Textarea
            id="systemPrompt"
            className="min-h-[150px] font-mono text-sm"
            placeholder="You are an helpful assistant who loves DeFi..."
            value={data.systemPrompt}
            onChange={(e) => setData({ systemPrompt: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            This forms the core &apos;Model Provider&apos; instruction in the character file.
          </p>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button onClick={nextStep}>
          Continue
        </Button>
      </div>
    </div>
  );
}
