"use client";

import { Loader2, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  fetchPublicDeveloperModels,
  type DeveloperApiProduct,
} from "@/components/settings/developer/developer-api-data";
import { BentoCard } from "@/components/settings/shared/bento-card";
import { Button } from "@/components/settings/shared/settings-button";
import {
  SettingsPage,
  SettingsPageHeader,
} from "@/components/settings-v2/primitives/page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function buildCurlExample(productId: string, prompt: string): string {
  return `curl https://api.nex-t1.ai/api/v1/responses \\
  -H "Authorization: Bearer nex_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${productId}",
    "input": ${JSON.stringify(prompt)}
  }'`;
}

function buildFetchExample(productId: string, prompt: string): string {
  return `const response = await fetch("/api/v1/responses", {
  method: "POST",
  headers: {
    "Authorization": "Bearer nex_your_key",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "${productId}",
    input: ${JSON.stringify(prompt)}
  })
});

const data = await response.json();`;
}

export default function ApiProductsContent() {
  const [selectedModel, setSelectedModel] = useState("nex-t1");
  const [playgroundKey, setPlaygroundKey] = useState("");
  const [playgroundPrompt, setPlaygroundPrompt] = useState(
    "Summarize the public Nex API platform in one paragraph.",
  );
  const [playgroundOutput, setPlaygroundOutput] = useState<string>("");
  const [playgroundLoading, setPlaygroundLoading] = useState(false);

  const modelsQuery = useQuery({
    queryKey: ["developer-public-models"],
    queryFn: fetchPublicDeveloperModels,
    staleTime: 60_000,
  });

  const products = modelsQuery.data?.data ?? [];
  const plans = modelsQuery.data?.plans ?? [];
  const activeProduct =
    products.find((product) => product.id === selectedModel) ?? products[0];

  const curlExample = useMemo(
    () => buildCurlExample(activeProduct?.id ?? "nex-t1", playgroundPrompt),
    [activeProduct?.id, playgroundPrompt],
  );
  const fetchExample = useMemo(
    () => buildFetchExample(activeProduct?.id ?? "nex-t1", playgroundPrompt),
    [activeProduct?.id, playgroundPrompt],
  );

  async function runPlayground(product: DeveloperApiProduct | undefined) {
    if (!product) {
      return;
    }

    if (playgroundKey.trim().length === 0) {
      toast.error("Paste an API key to run the playground.");
      return;
    }

    setPlaygroundLoading(true);
    setPlaygroundOutput("");

    try {
      const response = await fetch("/api/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${playgroundKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: product.id,
          input: playgroundPrompt,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Playground request failed.");
      }

      setPlaygroundOutput(JSON.stringify(payload, null, 2));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Playground request failed.",
      );
    } finally {
      setPlaygroundLoading(false);
    }
  }

  return (
    <SettingsPage>
      <SettingsPageHeader
        title="API Products"
        description="Compare the public Nex products, inspect their baseline behavior, and try a live request against the public /responses endpoint."
      />

      <BentoCard>
        <div className="space-y-4">
          <div>
            <h3 className="settings-card-title">Product catalog</h3>
            <p className="settings-card-description">
              Each public product pins a prompt profile, cost floor, and tool baseline on top of the hosted Nex runtime.
            </p>
          </div>

          {modelsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--bento-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading public products...
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-3">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedModel(product.id)}
                  className={`rounded-3xl border p-5 text-left transition ${
                    product.id === activeProduct?.id
                      ? "border-[var(--settings-foreground-strong)] bg-white/[0.05]"
                      : "border-[var(--bento-border)] bg-white/[0.02]"
                  }`}
                >
                  <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">
                    {product.label}
                  </p>
                  <p className="mt-2 text-sm text-[var(--settings-foreground-muted)]">
                    {product.summary}
                  </p>
                  <div className="mt-4 space-y-1 text-xs text-[var(--settings-foreground-muted)]">
                    <p>Endpoint: {product.endpoint}</p>
                    <p>Minimum charge: {product.minimumCredits} credits</p>
                    <p>Tools: {product.toolBaseline.join(", ")}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </BentoCard>

      <BentoCard>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)]">
          <div className="space-y-4">
            <div>
              <h3 className="settings-card-title">SDK examples</h3>
              <p className="settings-card-description">
                The OpenAPI source of truth lives at <span className="font-mono">/api/v1/openapi.json</span>.
              </p>
            </div>
            <pre className="overflow-x-auto rounded-2xl border border-[var(--bento-border)] bg-black/40 p-4 text-xs text-white/80">
              <code>{curlExample}</code>
            </pre>
            <pre className="overflow-x-auto rounded-2xl border border-[var(--bento-border)] bg-black/40 p-4 text-xs text-white/80">
              <code>{fetchExample}</code>
            </pre>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="settings-card-title">Launch plans</h3>
              <p className="settings-card-description">
                Included credits and RPM map directly to the public billing registry.
              </p>
            </div>
            <div className="space-y-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-2xl border border-[var(--bento-border)] bg-white/[0.02] p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">
                      {plan.label}
                    </p>
                    <p className="text-sm text-[var(--settings-foreground-muted)]">
                      ${plan.monthlyPriceUsd}/mo
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-[var(--settings-foreground-muted)]">
                    {plan.includedCredits.toLocaleString()} included credits · {plan.requestsPerMinute} RPM · ${plan.overagePricePerThousandCreditsUsd}/1k overage
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BentoCard>

      <BentoCard>
        <div className="space-y-4">
          <div>
            <h3 className="settings-card-title">Playground</h3>
            <p className="settings-card-description">
              Paste a project-scoped key and send a live request through the public API surface.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[220px,minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="playgroundModel" className="text-xs">
                  Product
                </Label>
                <select
                  id="playgroundModel"
                  value={activeProduct?.id ?? "nex-t1"}
                  onChange={(event) => setSelectedModel(event.target.value)}
                  className="h-10 w-full rounded-md border border-[var(--bento-border)] bg-white/[0.03] px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="playgroundKey" className="text-xs">
                  API key
                </Label>
                <Input
                  id="playgroundKey"
                  type="password"
                  value={playgroundKey}
                  onChange={(event) => setPlaygroundKey(event.target.value)}
                  placeholder="nex_..."
                  className="text-xs"
                />
              </div>
              <Button
                type="button"
                className="settings-primary-button h-8 rounded-[10px] px-3 text-xs"
                disabled={playgroundLoading || !activeProduct}
                onClick={() => void runPlayground(activeProduct)}
              >
                {playgroundLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Run request
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="playgroundPrompt" className="text-xs">
                  Prompt
                </Label>
                <Textarea
                  id="playgroundPrompt"
                  value={playgroundPrompt}
                  onChange={(event) => setPlaygroundPrompt(event.target.value)}
                  rows={6}
                />
              </div>
              <div className="rounded-2xl border border-[var(--bento-border)] bg-black/40 p-4">
                <p className="mb-2 text-xs font-medium text-white/70">Response</p>
                <pre className="max-h-[360px] overflow-auto text-xs text-white/80">
                  <code>{playgroundOutput || "// Run the playground to inspect the live response payload."}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </BentoCard>
    </SettingsPage>
  );
}
