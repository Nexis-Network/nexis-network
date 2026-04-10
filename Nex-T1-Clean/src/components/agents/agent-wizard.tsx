"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  useForm,
  useFieldArray,
  FormProvider,
  useFormContext,
  useWatch,
  type FieldPath,
  type UseFieldArrayReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { AgentListingSummary } from "@/lib/agents/types";
import { formatListingPrice, humanizeNetwork } from "@/lib/agents/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { trackAgentEvent } from "@/modules/analytics/events";
import { extractCorrelationId, getActiveOrgId } from "@/modules/analytics/utils";
import { useActiveAccount } from "@/hooks/user/use-active-account";
import { fetchUserOrganizations, type UserOrganization } from "@/lib/orgs/client";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { DEFAULT_AGENT_MODEL } from "@/lib/constants/models";
import { useStorage } from "@/lib/hooks/storage/use-storage";
import { useAuthContext } from "@/hooks/auth/use-auth-context";
import type { StrategySnapshot } from "@/lib/strategies/types";

import { logger } from "@/lib/logger";

import { wizardSchema, type AgentWizardValues } from "./agent-wizard/schema";
import { TOOL_CATALOG } from "./agent-wizard/tool-catalog";
import {
  STEPS,
  STEP_FIELD_MAP,
  WIZARD_PANEL,
  WIZARD_SUBPANEL,
  WIZARD_FIELD,
  WIZARD_TEXTAREA,
  SECTION_LABEL,
} from "./agent-wizard/constants";
import { PricingRow } from "./agent-wizard/pricing-row";

export type { AgentWizardValues } from "./agent-wizard/schema";

type AgentWizardProps = {
  onCompleted?: (agentId: string) => void;
};

export function AgentWizard({ onCompleted }: AgentWizardProps) {
  const searchParams = useSearchParams();
  const { accountId, setAccountId } = useActiveAccount();
  const { isAuthenticated } = useAuthContext();
  const form = useForm<AgentWizardValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      orgId: getActiveOrgId() ?? null,
      slug: "",
      name: "",
      description: "",
      visibility: "private",
      systemPrompt: "",
      modelId: DEFAULT_AGENT_MODEL,
      temperature: 0.7,
      maxTokens: 4096,
      tools: TOOL_CATALOG.map((tool) => ({ id: tool.id, enabled: false, config: tool.defaultConfig ?? {} })),
      secrets: [],
      pricing: [],
      avatar: null,
      banner: null,
    },
    mode: "onChange",
  });

  const { control, setValue, getValues, handleSubmit, trigger } = form;
  const secretArray = useFieldArray({ control, name: "secrets" });
  const pricingArray = useFieldArray({ control, name: "pricing" });

  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [resolvingOrg, setResolvingOrg] = useState(false);
  const [strategySnapshot, setStrategySnapshot] = useState<StrategySnapshot | null>(null);
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const orgId = useWatch({ control, name: "orgId" });
  const { uploadFile, createSignedUrl, isUploading } = useStorage("agent-data");

  useEffect(() => {
    const draftId = searchParams.get("draft");
    if (!draftId) {
      setStrategySnapshot(null);
      return;
    }

    try {
      const raw = window.sessionStorage.getItem(`strategy-draft:${draftId}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { snapshot?: StrategySnapshot } | StrategySnapshot;
      const snapshotCandidate =
        parsed && typeof parsed === "object" && "snapshot" in parsed
          ? parsed.snapshot
          : (parsed as StrategySnapshot | undefined);
      if (!snapshotCandidate || typeof snapshotCandidate !== "object") return;
      if (
        !snapshotCandidate.workflow ||
        !Array.isArray(snapshotCandidate.workflow.nodes) ||
        !snapshotCandidate.summary
      ) {
        return;
      }
      setStrategySnapshot(snapshotCandidate);
    } catch (error) {
      logger.warn("agent_wizard_strategy_snapshot_parse_failed", error);
    }
  }, [searchParams]);

  const handleImageUpload = useCallback(
    async (file: File, _kind: "avatar" | "banner") => {
      if (!file) return null;
      if (!isAuthenticated) {
        toast.error("Sign in required", {
          description: "Sign in to upload agent images.",
        });
        return null;
      }
      const MAX_IMAGE_MB = 5;
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file.");
        return null;
      }
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        toast.error(`Image must be smaller than ${MAX_IMAGE_MB} MB.`);
        return null;
      }
      try {
        const record = await uploadFile(file, { prefix: "agent-assets" });
        const signed = await createSignedUrl(record.object_path, 3600);
        const image = { path: record.object_path, url: signed ?? undefined };
        return image;
      } catch (error: UntypedJson) {
        const message = error instanceof Error ? error.message : null;
        if (message && /sign(?:ed)? in/i.test(message)) {
          toast.error("Sign in required", {
            description: "Your session expired. Sign in again to upload images.",
          });
          return null;
        }
        logger.error("agent_image_upload_failed", message ?? String(error));
        toast.error(message ?? "Failed to upload image");
        return null;
      }
    },
    [createSignedUrl, uploadFile, isAuthenticated],
  );

  useEffect(() => {
    if (!accountId) return;
    setValue("orgId", accountId, { shouldDirty: false });
  }, [accountId, setValue]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function loadOrganizations() {
      setResolvingOrg(true);
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      
      const orgs = await fetchUserOrganizations({ signal: controller.signal, accessToken });
      if (cancelled) return;
      setOrganizations(orgs);

      // If user has no orgs, allow orgId to stay null (personal mode)
      if (orgs.length === 0) {
        setValue("orgId", null, { shouldDirty: false, shouldValidate: true });
        return;
      }

      if (!accountId) {
        const first = orgs[0];
        setAccountId(first.id);
        setValue("orgId", first.id, { shouldDirty: false });
      }
    }
    void loadOrganizations().finally(() => {
      if (!cancelled) {
        setResolvingOrg(false);
      }
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setAccountId and setValue are stable
  }, []);

  const activeOrgName = useMemo(() => {
    if (!orgId) return null;
    const match = organizations.find((org) => org.id === orgId);
    return match?.name ?? null;
  }, [organizations, orgId]);

  const resolveOrgId = useCallback(async (): Promise<string | null> => {
    // Prefer any already-selected workspace
    const selected = orgId ?? accountId ?? null;
    if (selected) return selected;

    setResolvingOrg(true);
    try {
      // Try existing list first to avoid an extra fetch
      if (organizations.length > 0) {
        const first = organizations[0];
        setAccountId(first.id);
        setValue("orgId", first.id, { shouldDirty: false, shouldValidate: true });
        return first.id;
      }

      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      const freshOrgs = await fetchUserOrganizations({ accessToken });
      setOrganizations(freshOrgs);

      if (freshOrgs.length > 0) {
        const first = freshOrgs[0];
        setAccountId(first.id);
        setValue("orgId", first.id, { shouldDirty: false, shouldValidate: true });
        return first.id;
      }

      // Personal mode: no org required (server will create a default workspace if needed)
      setValue("orgId", null, { shouldDirty: false, shouldValidate: true });
      return null;
    } finally {
      setResolvingOrg(false);
    }
  }, [accountId, orgId, organizations, setAccountId, setValue]);

  const submitWizard = handleSubmit(
    async (values: AgentWizardValues) => {
      try {
        setSubmitting(true);
        const resolvedOrgId = await resolveOrgId();
        const payload = buildAgentPayload(values, resolvedOrgId ?? undefined, strategySnapshot);
        // Fetch token for creation
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;

        const response = await fetch("/api/agents/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to create agent");
        }
        const { agent, version } = await response.json();
        const createCorrelation = extractCorrelationId(response);

        trackAgentEvent("agent_created", {
          agent_id: agent.id,
          org_id: resolvedOrgId,
          visibility: values.visibility,
          correlation_id: createCorrelation,
        });

        if (version) {
          trackAgentEvent("version_published", {
            agent_id: agent.id,
            version_id: version.id,
            org_id: resolvedOrgId,
            correlation_id: createCorrelation,
          });
        }

        if (values.pricing.length > 0) {
          await Promise.all(
            values.pricing.map((entry: AgentWizardValues["pricing"][number]) =>
              fetch(`/api/agents/${agent.id}/listings`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify({
                  orgId: resolvedOrgId,
                  listingType: entry.listingType,
                  active: true,
                  prices: [
                    {
                      networkId: entry.networkId,
                      assetId: entry.assetId,
                      priceBaseUnits: entry.priceBaseUnits,
                      currencySymbol: entry.currencySymbol,
                      currencyDecimals: entry.currencyDecimals,
                    },
                  ],
                }),
              }).then(async (res) => {
                if (!res.ok) {
                  const text = await res.text();
                  throw new Error(text || "Failed to create listing");
                }
                trackAgentEvent("listing_created", {
                  agent_id: agent.id,
                  org_id: resolvedOrgId,
                  listing_type: entry.listingType,
                  network_id: entry.networkId,
                  asset_id: entry.assetId ?? null,
                  correlation_id: extractCorrelationId(res),
                });
                return res;
              }),
            ),
          );
        }

        toast.success("Agent created", {
          description: "We published the first version and saved the configuration.",
        });
        onCompleted?.(agent.id);
      } catch (error) {
        logger.error("create agent failed", error);
        toast.error(error instanceof Error ? error.message : "Unable to create agent");
      } finally {
        setSubmitting(false);
      }
    },
    () => {
      toast.error("Review required fields before creating the agent.");
    },
  );

  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  const handlePrev = useCallback(() => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleNext = useCallback(async () => {
    const fields = STEP_FIELD_MAP[currentStep.id];
    if (fields.length > 0) {
      const valid = await trigger(fields as FieldPath<AgentWizardValues>[], {
        shouldFocus: true,
      });
      if (!valid) {
        toast.error("Complete the required fields before continuing.");
        return;
      }
    }
    if (currentStep.id === "basics" && resolvingOrg) {
      toast.error("We’re still preparing your workspace. Try again in a moment.");
      return;
    }
    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
  }, [currentStep.id, resolvingOrg, trigger]);

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form
          className="flex min-h-0 flex-col gap-6 pb-8 [&_svg]:text-[var(--settings-foreground-subtle)]"
          onSubmit={submitWizard}
        >
          <section className={`${WIZARD_PANEL} relative overflow-hidden p-6`}>
            <div className="relative space-y-2">
              <p className={SECTION_LABEL}>Agent Foundry</p>
              <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--settings-foreground-strong)] sm:text-[34px]">
                Create your AI agent listing
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-[var(--settings-foreground-muted)]">
                Configure identity, tool access, model profile, and monetization in one guided production workflow.
              </p>
            </div>
          </section>

          <Stepper currentStep={stepIndex} />
          {strategySnapshot ? <StrategySnapshotPreview snapshot={strategySnapshot} /> : null}

          {currentStep.id === "basics" ? (
            <BasicsStep
              orgId={orgId}
              orgName={activeOrgName}
              resolvingOrg={resolvingOrg}
              onUploadImage={handleImageUpload}
              uploading={isUploading}
            />
          ) : null}
          {currentStep.id === "tools" ? <ToolsStep /> : null}
          {currentStep.id === "model" ? <ModelStep /> : null}
          {currentStep.id === "secrets" ? <SecretsStep array={secretArray} /> : null}
          {currentStep.id === "pricing" ? <PricingStep array={pricingArray} /> : null}
          {currentStep.id === "review" ? <ReviewStep values={getValues()} strategySnapshot={strategySnapshot} /> : null}

          <Separator className="border-[var(--settings-border-soft)]" />

          <div className={`${WIZARD_PANEL} mt-auto flex items-center justify-between px-4 py-3`}>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-[14px]"
              onClick={handlePrev}
              disabled={stepIndex === 0 || submitting}
            >
              Back
            </Button>
            {isLastStep ? (
              <Button
                type="submit"
                className="h-10 rounded-[14px] px-5"
                disabled={submitting || resolvingOrg || isUploading}
              >
                Create agent
              </Button>
            ) : (
              <Button
                type="button"
                className="h-10 rounded-[14px] px-5"
                onClick={handleNext}
                disabled={submitting || resolvingOrg || isUploading}
              >
                Continue
              </Button>
            )}
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}

function Stepper({ currentStep }: { currentStep: number }) {
  const stepCount = STEPS.length;
  const current = Math.min(Math.max(currentStep, 0), stepCount > 0 ? stepCount - 1 : 0);
  const progress = stepCount <= 1 ? 0 : (current / (stepCount - 1)) * 100;

  return (
    <div className={`${WIZARD_PANEL} space-y-3 p-4`}>
      <Progress
        value={progress}
        className="h-1.5 bg-[var(--settings-elevated)]"
        indicatorClassName="bg-[var(--settings-accent)]"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        {STEPS.map((step, index) => {
          const complete = index < current;
          const active = index === current;
          return (
            <motion.div
              key={step.id}
              layout
              className="flex items-center gap-2"
              initial={{ opacity: 0.5 }}
              animate={{ opacity: complete || active ? 1 : 0.6 }}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm ${
                  active
                    ? "border-[var(--settings-border)] bg-[var(--settings-elevated)] text-[var(--settings-foreground-strong)]"
                    : "border-[var(--settings-border-soft)] bg-[var(--settings-card-bg)] text-[var(--settings-foreground-subtle)]"
                }`}
              >
                {complete ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
              </div>
              <span
                className={`text-sm font-medium ${
                  active
                    ? "text-[var(--settings-foreground-strong)]"
                    : "text-[var(--settings-foreground-muted)]"
                }`}
              >
                {step.title}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function BasicsStep({
  orgId,
  resolvingOrg,
  onUploadImage,
  uploading,
}: {
  orgId: string | null | undefined;
  orgName: string | null;
  resolvingOrg: boolean;
  onUploadImage: (file: File, kind: "avatar" | "banner") => Promise<{ path: string; url?: string } | null>;
  uploading: boolean;
}) {
  const { control, setValue, watch } = useFormContext<AgentWizardValues>();
  const avatar = watch("avatar");
  const banner = watch("banner");
  return (
    <Card className={WIZARD_PANEL}>
      <CardHeader>
        <CardTitle className="text-[var(--settings-foreground-strong)]">Agent identity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Workspace selection hidden as per requirements */}
        {resolvingOrg && !orgId ? (
          <div className={`${WIZARD_SUBPANEL} p-4 text-xs text-[var(--settings-foreground-muted)]`}>
            <span className="inline-flex items-center gap-2 text-[var(--settings-foreground-muted)]">
              <span className="h-2 w-2 rounded-full bg-[color-mix(in_oklab,var(--settings-accent)_70%,transparent)]" />
              Preparing a workspace for your agent...
            </span>
          </div>
        ) : null}
        <FormField
          control={control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={SECTION_LABEL}>Slug</FormLabel>
              <FormControl>
                <Input className={WIZARD_FIELD} placeholder="agent-slug" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={SECTION_LABEL}>Display name</FormLabel>
              <FormControl>
                <Input
                  className={WIZARD_FIELD}
                  placeholder="Base L2 arbitrage agent"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={SECTION_LABEL}>Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  className={WIZARD_TEXTAREA}
                  placeholder="Short description of capabilities"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="visibility"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={SECTION_LABEL}>Visibility</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} value={field.value} className="grid gap-2 md:grid-cols-3">
                  <RadioCard id="visibility-public" value="public" title="Public" description="Visible to everyone. Supports buy/rent listings." />
                  <RadioCard id="visibility-unlisted" value="unlisted" title="Unlisted" description="Accessible via direct link." />
                  <RadioCard id="visibility-private" value="private" title="Private" description="Owner & org admins only." />
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="systemPrompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={SECTION_LABEL}>System prompt</FormLabel>
              <FormControl>
                <Textarea
                  rows={6}
                  className={WIZARD_TEXTAREA}
                  placeholder="Sanitized prompt, avoid plaintext secrets"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <ImageUpload
            label="Profile photo"
            description="Square image works best (PNG/JPEG up to 5MB)."
            value={avatar}
            onUploaded={(file) => setValue("avatar", file, { shouldDirty: true, shouldValidate: true })}
            onClear={() => setValue("avatar", null, { shouldDirty: true, shouldValidate: true })}
            aspectHint="1:1"
            onUploadImage={onUploadImage}
            kind="avatar"
            uploading={uploading}
          />
          <ImageUpload
            label="Banner"
            description="Wide cover image for your agent profile."
            value={banner}
            onUploaded={(file) => setValue("banner", file, { shouldDirty: true, shouldValidate: true })}
            onClear={() => setValue("banner", null, { shouldDirty: true, shouldValidate: true })}
            aspectHint="16:9"
            onUploadImage={onUploadImage}
            kind="banner"
            uploading={uploading}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function RadioCard({ id, value, title, description }: { id: string; value: string; title: string; description: string }) {
  return (
    <Label
      htmlFor={id}
      className="flex cursor-pointer flex-col gap-2 rounded-[16px] border border-[var(--settings-border-soft)] bg-[var(--settings-card-bg)] p-4 text-left transition-colors duration-150 ease-out hover:border-[var(--settings-border-strong)]"
    >
      <div className="flex items-center gap-2">
        <RadioGroupItem id={id} value={value} />
        <span className="font-medium text-[var(--settings-foreground-strong)]">{title}</span>
      </div>
      <p className="text-xs text-[var(--settings-foreground-subtle)]">{description}</p>
    </Label>
  );
}

type ImageUploadProps = {
  label: string;
  description?: string;
  value: AgentWizardValues["avatar"] | AgentWizardValues["banner"];
  onUploaded: (file: { path: string; url?: string }) => void;
  onClear: () => void;
  aspectHint?: string;
  onUploadImage: (file: File, kind: "avatar" | "banner") => Promise<{ path: string; url?: string } | null>;
  kind: "avatar" | "banner";
  uploading: boolean;
};

function ImageUpload({ label, description, value, onUploaded, onClear, aspectHint, onUploadImage, kind, uploading }: ImageUploadProps) {
  const inputId = `${kind}-upload-input`;

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const uploaded = await onUploadImage(file, kind);
    if (uploaded) {
      onUploaded(uploaded);
    }
    event.target.value = "";
  };

  return (
    <div className={`${WIZARD_SUBPANEL} flex flex-col gap-2 p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">{label}</p>
          {description ? <p className="text-xs text-[var(--settings-foreground-subtle)]">{description}</p> : null}
          {aspectHint ? <p className="text-[10px] text-[var(--settings-foreground-subtle)]">Recommended aspect: {aspectHint}</p> : null}
        </div>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-[var(--settings-foreground-subtle)] hover:text-[var(--settings-foreground-strong)]"
            onClick={onClear}
            disabled={uploading}
          >
            Clear
          </Button>
        ) : null}
      </div>

      <label
        htmlFor={inputId}
        className="group relative flex h-36 w-full cursor-pointer items-center justify-center overflow-hidden rounded-[14px] border border-dashed border-[var(--settings-border-soft)] bg-[var(--settings-elevated)] text-sm text-[var(--settings-foreground-subtle)] transition-colors duration-150 ease-out hover:border-[var(--settings-border-strong)] hover:text-[var(--settings-accent)]"
      >
        {value?.url ? (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value.url} alt={`${label} preview`} className="h-full w-full object-cover" />
          </div>
        ) : null}
        <div className="relative z-10 flex flex-col items-center gap-1 rounded-lg bg-[color-mix(in_oklab,var(--settings-card-bg)_80%,transparent)] px-3 py-2 text-center text-xs font-medium text-[var(--settings-foreground-strong)]">
          <CheckCircle2 className="h-4 w-4" />
          <span>{uploading ? "Uploading..." : value ? "Replace image" : "Upload image"}</span>
        </div>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleChange}
          disabled={uploading}
        />
      </label>
    </div>
  );
}

function ToolsStep() {
  const { control } = useFormContext<AgentWizardValues>();
  return (
    <Card className={WIZARD_PANEL}>
      <CardHeader>
        <CardTitle className="settings-card-title">Tools & MCP bindings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {TOOL_CATALOG.map((tool, index) => (
          <FormField
            key={tool.id}
            control={control}
            name={`tools.${index}.enabled`}
            render={({ field }) => (
              <FormItem className={`${WIZARD_SUBPANEL} flex items-start justify-between gap-4 p-4`}>
                <div>
                  <FormLabel className="flex items-center gap-2 text-base text-[var(--settings-foreground-strong)]">
                    {tool.name}
                    <span className="text-xs uppercase text-[var(--settings-foreground-subtle)]">MCP</span>
                  </FormLabel>
                  <p className="text-sm text-[var(--settings-foreground-muted)]">{tool.description}</p>
                  {field.value ? (
                    <FormField
                      control={control}
                      name={`tools.${index}.config`}
                      render={({ field: configField }) => (
                        <FormItem className="mt-3">
                          <FormLabel className={SECTION_LABEL}>Configuration (JSON)</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={4}
                              className={`${WIZARD_TEXTAREA} font-mono text-xs`}
                              defaultValue={JSON.stringify(configField.value ?? {}, null, 2)}
                              onBlur={(event) => {
                                const raw = event.target.value.trim();
                                if (!raw) {
                                  configField.onChange({});
                                  return;
                                }
                                try {
                                  const parsed = JSON.parse(raw);
                                  configField.onChange(parsed);
                                } catch {
                                  toast.error("Config must be valid JSON");
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function ModelStep() {
  const { control, watch, setValue } = useFormContext<AgentWizardValues>();
  const temperature = watch("temperature");
  return (
    <Card className={WIZARD_PANEL}>
      <CardHeader>
        <CardTitle className="settings-card-title">Model configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name="modelId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={SECTION_LABEL}>Model</FormLabel>
              <FormControl>
                <Input className={WIZARD_FIELD} {...field} placeholder="openai/gpt-5.4" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="temperature"
          render={() => (
            <FormItem>
              <FormLabel className={SECTION_LABEL}>
                Temperature ({temperature.toFixed(2)})
              </FormLabel>
              <Slider
                value={[temperature]}
                min={0}
                max={2}
                step={0.05}
                onValueChange={([value]) => setValue("temperature", value)}
              />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="maxTokens"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={SECTION_LABEL}>Max tokens</FormLabel>
              <FormControl>
                <Input className={WIZARD_FIELD} type="number" min={256} max={32000} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

function SecretsStep({ array }: { array: UseFieldArrayReturn<AgentWizardValues, "secrets"> }) {
  const { control, setValue } = useFormContext<AgentWizardValues>();
  return (
    <Card className={WIZARD_PANEL}>
      <CardHeader>
        <CardTitle className="settings-card-title">Secret envelopes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="rounded-[14px]"
          onClick={() => array.append({ keyName: "API_KEY", envelope: "" })}
        >
          Add secret
        </Button>
        {array.fields.length === 0 ? (
          <p className="text-sm text-[var(--settings-foreground-muted)]">
            Encrypt secrets server-side and paste AES-GCM envelopes here.
          </p>
        ) : null}
        {array.fields.map((field, index) => (
          <div key={field.id} className={`${WIZARD_SUBPANEL} space-y-3 p-4`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-[var(--settings-foreground-strong)]">Secret {index + 1}</h3>
              <Button
                type="button"
                variant="ghost"
                className="h-auto p-0 text-xs text-[var(--settings-foreground-subtle)] hover:text-[var(--settings-foreground-strong)]"
                onClick={() => array.remove(index)}
              >
                Remove
              </Button>
            </div>
            <FormField
              control={control}
              name={`secrets.${index}.keyName`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={SECTION_LABEL}>Key name</FormLabel>
                  <FormControl>
                    <Input className={WIZARD_FIELD} placeholder="OPENAI_API_KEY" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`secrets.${index}.envelope`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={SECTION_LABEL}>Encrypted envelope</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Textarea
                        rows={4}
                        className={`${WIZARD_TEXTAREA} font-mono text-xs`}
                        placeholder="Paste encrypted JSON"
                        {...field}
                      />
                      <Input
                        className={WIZARD_FIELD}
                        type="file"
                        accept="application/json,.json,.txt"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          try {
                            const text = await file.text();
                            setValue(`secrets.${index}.envelope`, text, { shouldDirty: true, shouldValidate: true });
                            toast.success(`Loaded envelope from ${file.name}`);
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Failed to read file");
                          }
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PricingStep({ array }: { array: UseFieldArrayReturn<AgentWizardValues, "pricing"> }) {
  return (
    <Card className={WIZARD_PANEL}>
      <CardHeader>
        <CardTitle className="settings-card-title">Listings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="rounded-[14px]"
          onClick={() =>
            array.append({
              listingType: "sale",
              networkId: "eip155:1",
              assetId: undefined,
              priceBaseUnits: "0",
              currencySymbol: "ETH",
              currencyDecimals: 18,
            })
          }
        >
          Add listing
        </Button>
        {array.fields.length === 0 ? (
          <p className="text-sm text-[var(--settings-foreground-muted)]">
            Publish at least one listing to monetize the agent.
          </p>
        ) : null}
        {array.fields.map((field, index) => (
          <PricingRow key={field.id} index={index} onRemove={() => array.remove(index)} />
        ))}
      </CardContent>
    </Card>
  );
}

function StrategySnapshotPreview({ snapshot }: { snapshot: StrategySnapshot }) {
  return (
    <Card data-testid="strategy-snapshot-preview" className={WIZARD_PANEL}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-[var(--settings-foreground-strong)]">Strategy attached</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-[var(--settings-foreground-subtle)]">
        <p className="text-[var(--settings-foreground-strong)]">
          {snapshot.templateId ? `Template: ${snapshot.templateId}` : "Custom strategy draft"}
        </p>
        <p>
          {snapshot.workflow.nodes.length} node{snapshot.workflow.nodes.length === 1 ? "" : "s"} ready for publishing
        </p>
      </CardContent>
    </Card>
  );
}

function ReviewStep({ values, strategySnapshot }: { values: AgentWizardValues; strategySnapshot: StrategySnapshot | null }) {
  return (
    <Card className={WIZARD_PANEL}>
      <CardHeader>
        <CardTitle className="settings-card-title">Review & submit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-[var(--settings-foreground-muted)]">
        <div className="space-y-1">
          <p>
            <span className="font-medium text-[var(--settings-foreground-strong)]">Slug:</span> {values.slug}
          </p>
          <p>
            <span className="font-medium text-[var(--settings-foreground-strong)]">Visibility:</span> {values.visibility}
          </p>
          <p>
            <span className="font-medium text-[var(--settings-foreground-strong)]">Model:</span> {values.modelId} (temp {values.temperature})
          </p>
          <p>
            <span className="font-medium text-[var(--settings-foreground-strong)]">Secrets:</span> {values.secrets.length}
          </p>
          <p>
            <span className="font-medium text-[var(--settings-foreground-strong)]">Strategy:</span>{" "}
            {strategySnapshot ? (strategySnapshot.templateId ?? "Custom draft") : "None"}
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-[var(--settings-foreground-strong)]">Listings</h3>
          {values.pricing.length === 0 ? (
            <p className="text-xs text-[var(--settings-foreground-subtle)]">No listings configured.</p>
          ) : (
            <ul className="space-y-2">
              {values.pricing.map((listing, index) => {
                const preview: AgentListingSummary = {
                  listingId: `preview-${index}`,
                  listingType: listing.listingType,
                  networkId: listing.networkId,
                  assetId: listing.assetId ?? null,
                  priceBaseUnits: listing.priceBaseUnits,
                  currencySymbol: listing.currencySymbol ?? null,
                  currencyDecimals: listing.currencyDecimals,
                };
                return (
                  <li
                    key={`${listing.listingType}-${listing.networkId}-${index}`}
                    className={`${WIZARD_SUBPANEL} flex items-center justify-between px-3 py-2`}
                  >
                    <span className="text-[var(--settings-foreground-strong)]">
                      {listing.listingType.toUpperCase()} • {humanizeNetwork(listing.networkId)}
                    </span>
                    <span className="text-xs text-[var(--settings-foreground-subtle)]">{formatListingPrice(preview)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function buildAgentPayload(
  values: AgentWizardValues,
  orgId?: string | null,
  strategySnapshot?: StrategySnapshot | null,
) {
  const versionConfig = {
    model: {
      id: values.modelId,
      temperature: values.temperature,
      maxTokens: values.maxTokens,
    },
    tools: values.tools.filter((tool) => tool.enabled).map((tool) => ({ id: tool.id, config: tool.config ?? {} })),
    assets: {
      avatarPath: values.avatar?.path ?? null,
      bannerPath: values.banner?.path ?? null,
    },
  };

  const payload: Record<string, UntypedJson> = {
    name: values.name,
    description: values.description,
    visibility: values.visibility,
    systemPrompt: values.systemPrompt,
    versionConfig,
    secrets: values.secrets.map((secret) => ({ key_name: secret.keyName, envelope: secret.envelope })),
  };

  if (orgId) {
    payload.orgId = orgId;
  }
  if (strategySnapshot?.blocklyXml && strategySnapshot.blocklyXml.length >= 10) {
    payload.strategy = {
      blocklyXml: strategySnapshot.blocklyXml,
      ...(strategySnapshot.templateId ? { templateId: strategySnapshot.templateId } : {}),
    };
  }
  payload.slug = values.slug;

  return payload as {
    orgId?: string;
    slug: string;
    name: string;
    description?: string;
    visibility: string;
    systemPrompt?: string;
    versionConfig: typeof versionConfig;
    secrets: { key_name: string; envelope: string }[];
  };
}

