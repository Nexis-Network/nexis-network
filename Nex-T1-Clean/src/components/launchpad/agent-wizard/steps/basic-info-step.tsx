"use client";

import { useAgentWizardStore } from "../store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function BasicInfoStep() {
  const { data, setData, nextStep } = useAgentWizardStore();

  const handleNext = () => {
    if (data.name && data.ticker) {
      nextStep();
    }
  };

  return (
    <div className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Basic Identity</h3>
        <p className="text-sm text-muted-foreground">
          Define the core identity of your AI Agent.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Agent Name</Label>
          <Input
            id="name"
            placeholder="e.g. Athena"
            value={data.name}
            onChange={(e) => setData({ name: e.target.value })}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="ticker">Token Ticker</Label>
          <Input
            id="ticker"
            placeholder="e.g. ATH"
            value={data.ticker}
            onChange={(e) => setData({ ticker: e.target.value.toUpperCase() })}
            maxLength={6}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            placeholder="A short description of what this agent does..."
            value={data.bio}
            onChange={(e) => setData({ bio: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!data.name || !data.ticker}>
          Continue
        </Button>
      </div>
    </div>
  );
}
