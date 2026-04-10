"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Shield,
  ShieldAlert,
  Plus,
  Trash2,
  Edit,
  RotateCcw,
  Loader2,
  Save,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCdpPolicies,
  useCdpCreatePolicy,
  useCdpUpdatePolicy,
  useCdpDeletePolicy,
  type PolicyRule,
  type PolicyCriteria,
} from "@/lib/hooks/cdp/use-cdp-policies";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type AgentPolicyEditorProps = {
  agentId: string;
  walletAddress: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CRITERIA_TYPE_LABELS: Record<PolicyCriteria["type"], string> = {
  evmAddress: "EVM Address",
  ethValue: "ETH Value (wei)",
  evmNetwork: "EVM Network",
  netUSDChange: "Net USD Change",
};

const CRITERIA_TYPES = Object.keys(CRITERIA_TYPE_LABELS) as PolicyCriteria["type"][];

const DEFAULT_RULES: PolicyRule[] = [
  {
    action: "reject",
    criteria: [{ type: "ethValue", lte: "100000000000000000" }],
  },
  {
    action: "reject",
    criteria: [{ type: "netUSDChange", lte: -500 }],
  },
  {
    action: "accept",
    criteria: [],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AgentPolicyEditor({ agentId, walletAddress }: AgentPolicyEditorProps) {
  const { data: policies, isLoading, error: fetchError } = useCdpPolicies(walletAddress);
  const createMutation = useCdpCreatePolicy();
  const updateMutation = useCdpUpdatePolicy();
  const deleteMutation = useCdpDeletePolicy();

  const [editingRules, setEditingRules] = useState<PolicyRule[] | null>(null);
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);

  // New rule form state
  const [newRuleAction, setNewRuleAction] = useState<"accept" | "reject">("reject");
  const [newCriteriaType, setNewCriteriaType] = useState<PolicyCriteria["type"]>("ethValue");
  const [newCriteriaValues, setNewCriteriaValues] = useState<Record<string, string>>({});

  // Find the active policy for this wallet
  const activePolicy = useMemo(() => {
    if (!policies || policies.length === 0) return null;
    return policies.find((p) => p.accountAddress?.toLowerCase() === walletAddress.toLowerCase()) ?? policies[0];
  }, [policies, walletAddress]);

  // Working rules: either user's edits or the current policy rules
  const workingRules = editingRules ?? activePolicy?.rules ?? [];

  const hasUnsavedChanges = editingRules !== null;

  // ---

  const resetNewRuleForm = useCallback(() => {
    setNewRuleAction("reject");
    setNewCriteriaType("ethValue");
    setNewCriteriaValues({});
    setEditingRuleIndex(null);
  }, []);

  const buildCriteriaFromForm = useCallback((): PolicyCriteria | null => {
    switch (newCriteriaType) {
      case "evmAddress": {
        const addresses = (newCriteriaValues.addresses ?? "")
          .split(",")
          .map((a) => a.trim())
          .filter((a) => /^0x[a-fA-F0-9]{40}$/.test(a));
        if (addresses.length === 0) {
          toast.error("Enter at least one valid EVM address");
          return null;
        }
        const operator = (newCriteriaValues.operator as "in" | "not_in") || "in";
        return { type: "evmAddress", addresses, operator };
      }
      case "ethValue": {
        const gte = newCriteriaValues.gte?.trim() || undefined;
        const lte = newCriteriaValues.lte?.trim() || undefined;
        if (!gte && !lte) {
          toast.error("Enter at least one bound (min or max) for ETH value");
          return null;
        }
        return { type: "ethValue", gte, lte };
      }
      case "evmNetwork": {
        const networks = (newCriteriaValues.networks ?? "")
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean);
        if (networks.length === 0) {
          toast.error("Enter at least one network name");
          return null;
        }
        return { type: "evmNetwork", networks };
      }
      case "netUSDChange": {
        const gte = newCriteriaValues.gte ? Number(newCriteriaValues.gte) : undefined;
        const lte = newCriteriaValues.lte ? Number(newCriteriaValues.lte) : undefined;
        if (gte === undefined && lte === undefined) {
          toast.error("Enter at least one bound (min or max) for USD change");
          return null;
        }
        if ((gte !== undefined && isNaN(gte)) || (lte !== undefined && isNaN(lte))) {
          toast.error("USD bounds must be valid numbers");
          return null;
        }
        return { type: "netUSDChange", gte, lte };
      }
      default:
        return null;
    }
  }, [newCriteriaType, newCriteriaValues]);

  const handleAddRule = useCallback(() => {
    const criteria = buildCriteriaFromForm();
    // Allow accept rules without criteria (base rule)
    const criteriaList = criteria ? [criteria] : [];

    if (newRuleAction === "reject" && criteriaList.length === 0) {
      toast.error("Reject rules must have at least one criteria");
      return;
    }

    const newRule: PolicyRule = {
      action: newRuleAction,
      criteria: criteriaList,
    };

    const current = editingRules ?? activePolicy?.rules ?? [];

    if (editingRuleIndex !== null) {
      // Editing existing rule
      const updated = [...current];
      updated[editingRuleIndex] = newRule;
      setEditingRules(updated);
    } else {
      // Adding new rule (insert before the last accept rule if it exists)
      const lastAcceptIdx = current.findLastIndex((r) => r.action === "accept" && r.criteria.length === 0);
      if (lastAcceptIdx >= 0 && newRule.action === "reject") {
        const updated = [...current];
        updated.splice(lastAcceptIdx, 0, newRule);
        setEditingRules(updated);
      } else {
        setEditingRules([...current, newRule]);
      }
    }

    setAddRuleOpen(false);
    resetNewRuleForm();
  }, [buildCriteriaFromForm, newRuleAction, editingRules, activePolicy?.rules, editingRuleIndex, resetNewRuleForm]);

  const handleRemoveRule = useCallback(
    (index: number) => {
      const current = editingRules ?? activePolicy?.rules ?? [];
      setEditingRules(current.filter((_, i) => i !== index));
    },
    [editingRules, activePolicy?.rules],
  );

  const handleEditRule = useCallback(
    (index: number) => {
      const current = editingRules ?? activePolicy?.rules ?? [];
      const rule = current[index];
      if (!rule) return;

      setNewRuleAction(rule.action);

      if (rule.criteria.length > 0) {
        const c = rule.criteria[0];
        setNewCriteriaType(c.type);

        const values: Record<string, string> = {};
        switch (c.type) {
          case "evmAddress":
            values.addresses = c.addresses.join(", ");
            values.operator = c.operator;
            break;
          case "ethValue":
            if (c.gte) values.gte = c.gte;
            if (c.lte) values.lte = c.lte;
            break;
          case "evmNetwork":
            values.networks = c.networks.join(", ");
            break;
          case "netUSDChange":
            if (c.gte !== undefined) values.gte = String(c.gte);
            if (c.lte !== undefined) values.lte = String(c.lte);
            break;
        }
        setNewCriteriaValues(values);
      } else {
        setNewCriteriaType("ethValue");
        setNewCriteriaValues({});
      }

      setEditingRuleIndex(index);
      setAddRuleOpen(true);
    },
    [editingRules, activePolicy?.rules],
  );

  const handleSave = useCallback(async () => {
    if (!editingRules) return;

    try {
      if (activePolicy) {
        await updateMutation.mutateAsync({
          policyId: activePolicy.id,
          params: { rules: editingRules },
        });
        toast.success("Policy updated");
      } else {
        await createMutation.mutateAsync({
          name: `Agent ${agentId.slice(0, 8)} Policy`,
          description: `Spending policy for agent wallet ${walletAddress}`,
          scope: "account",
          accountAddress: walletAddress,
          rules: editingRules,
        });
        toast.success("Policy created");
      }
      setEditingRules(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save policy");
    }
  }, [editingRules, activePolicy, updateMutation, createMutation, agentId, walletAddress]);

  const handleResetToDefaults = useCallback(() => {
    setEditingRules([...DEFAULT_RULES]);
    toast.info("Defaults applied. Save to persist changes.");
  }, []);

  const handleDeletePolicy = useCallback(async () => {
    if (!deleteConfirmId) return;

    try {
      await deleteMutation.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
      setEditingRules(null);
      toast.success("Policy deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete policy");
    }
  }, [deleteConfirmId, deleteMutation]);

  const handleCreateDefault = useCallback(async () => {
    try {
      await createMutation.mutateAsync({
        name: `Agent ${agentId.slice(0, 8)} Default Policy`,
        description: `Default spending policy for agent wallet ${walletAddress}. Per-tx limits: 0.1 ETH / $500 USD.`,
        scope: "account",
        accountAddress: walletAddress,
        rules: DEFAULT_RULES,
      });
      toast.success("Default policy created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create default policy");
    }
  }, [createMutation, agentId, walletAddress]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="rounded-xl border border-white/5 bg-[#1a1a1a] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-400" />
          <h3 className="text-sm font-medium text-white">Spending Policy</h3>
        </div>
        <div className="flex items-center gap-2">
          {activePolicy && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-red-400 hover:text-red-300"
              onClick={() => setDeleteConfirmId(activePolicy.id)}
              disabled={isSaving}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={handleResetToDefaults}
            disabled={isSaving}
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset to defaults
          </Button>
        </div>
      </div>

      {/* Loading / Error States */}
      {isLoading && (
        <div className="flex items-center gap-2 py-6 justify-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading policies...
        </div>
      )}

      {fetchError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {fetchError instanceof Error ? fetchError.message : "Failed to load policies"}
        </div>
      )}

      {/* No Policy State */}
      {!isLoading && !fetchError && !activePolicy && !editingRules && (
        <div className="flex flex-col items-center gap-3 py-6">
          <ShieldAlert className="h-8 w-8 text-yellow-500/60" />
          <p className="text-sm text-muted-foreground text-center">
            No spending policy is configured for this agent wallet.
          </p>
          <Button
            size="sm"
            onClick={handleCreateDefault}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Shield className="mr-1 h-3 w-3" />
            )}
            Create default policy
          </Button>
        </div>
      )}

      {/* Rules List */}
      {(workingRules.length > 0 || editingRules) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Rules (evaluated top-down)
            </span>
            <span className="text-xs text-muted-foreground">
              {workingRules.length} rule{workingRules.length !== 1 ? "s" : ""}
            </span>
          </div>

          {workingRules.map((rule, index) => (
            <RuleItem
              key={`rule-${index}`}
              rule={rule}
              index={index}
              onEdit={() => handleEditRule(index)}
              onRemove={() => handleRemoveRule(index)}
              disabled={isSaving}
            />
          ))}
        </div>
      )}

      {/* Add Rule + Save */}
      {(activePolicy || editingRules) && (
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => {
              resetNewRuleForm();
              setAddRuleOpen(true);
            }}
            disabled={isSaving}
          >
            <Plus className="h-3 w-3" />
            Add rule
          </Button>

          {hasUnsavedChanges && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setEditingRules(null)}
                disabled={isSaving}
              >
                Discard
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                Save changes
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Rule Dialog */}
      <Dialog
        open={addRuleOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetNewRuleForm();
          }
          setAddRuleOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingRuleIndex !== null ? "Edit rule" : "Add policy rule"}
            </DialogTitle>
            <DialogDescription>
              Configure a rule that determines whether a transaction should be accepted or rejected.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Action */}
            <div className="grid gap-2">
              <Label htmlFor="rule-action">Action</Label>
              <Select
                value={newRuleAction}
                onValueChange={(v) => setNewRuleAction(v as "accept" | "reject")}
              >
                <SelectTrigger id="rule-action" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reject">Reject</SelectItem>
                  <SelectItem value="accept">Accept</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Criteria Type */}
            <div className="grid gap-2">
              <Label htmlFor="criteria-type">Criteria type</Label>
              <Select
                value={newCriteriaType}
                onValueChange={(v) => {
                  setNewCriteriaType(v as PolicyCriteria["type"]);
                  setNewCriteriaValues({});
                }}
              >
                <SelectTrigger id="criteria-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRITERIA_TYPES.map((ct) => (
                    <SelectItem key={ct} value={ct}>
                      {CRITERIA_TYPE_LABELS[ct]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Criteria-specific fields */}
            <CriteriaFields
              type={newCriteriaType}
              values={newCriteriaValues}
              onChange={setNewCriteriaValues}
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setAddRuleOpen(false);
                resetNewRuleForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddRule}>
              {editingRuleIndex !== null ? "Update rule" : "Add rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete policy</DialogTitle>
            <DialogDescription>
              This will permanently remove the spending policy for this agent wallet.
              The agent will have no transaction restrictions until a new policy is created.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePolicy}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-3 w-3" />
              )}
              Delete policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rule Item Sub-Component
// ---------------------------------------------------------------------------

function RuleItem({
  rule,
  index,
  onEdit,
  onRemove,
  disabled,
}: {
  rule: PolicyRule;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const isAccept = rule.action === "accept";
  const isBaseRule = isAccept && rule.criteria.length === 0;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      {/* Index */}
      <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">
        {index + 1}
      </span>

      {/* Action Badge */}
      <span
        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
          isAccept
            ? "bg-green-500/10 text-green-400"
            : "bg-red-500/10 text-red-400"
        }`}
      >
        {rule.action}
      </span>

      {/* Criteria Pills */}
      <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
        {rule.criteria.length === 0 && (
          <span className="text-xs text-muted-foreground italic">
            {isBaseRule ? "all remaining transactions" : "no criteria"}
          </span>
        )}
        {rule.criteria.map((c, ci) => (
          <CriteriaPill key={ci} criteria={c} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-6 w-6 text-muted-foreground hover:text-white"
          onClick={onEdit}
          disabled={disabled}
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-6 w-6 text-muted-foreground hover:text-red-400"
          onClick={onRemove}
          disabled={disabled}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Criteria Pill Sub-Component
// ---------------------------------------------------------------------------

function CriteriaPill({ criteria }: { criteria: PolicyCriteria }) {
  let label: string;

  switch (criteria.type) {
    case "evmAddress":
      label = `${criteria.operator === "not_in" ? "not " : ""}${criteria.addresses.length} address${criteria.addresses.length !== 1 ? "es" : ""}`;
      break;
    case "ethValue": {
      const parts: string[] = [];
      if (criteria.gte) parts.push(`>= ${formatWei(criteria.gte)}`);
      if (criteria.lte) parts.push(`<= ${formatWei(criteria.lte)}`);
      label = `ETH ${parts.join(" & ")}`;
      break;
    }
    case "evmNetwork":
      label = `network: ${criteria.networks.join(", ")}`;
      break;
    case "netUSDChange": {
      const parts: string[] = [];
      if (criteria.gte !== undefined) parts.push(`>= $${criteria.gte}`);
      if (criteria.lte !== undefined) parts.push(`<= $${criteria.lte}`);
      label = `USD ${parts.join(" & ")}`;
      break;
    }
    default:
      label = "unknown";
  }

  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Criteria Form Fields
// ---------------------------------------------------------------------------

function CriteriaFields({
  type,
  values,
  onChange,
}: {
  type: PolicyCriteria["type"];
  values: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const update = (key: string, value: string) =>
    onChange({ ...values, [key]: value });

  switch (type) {
    case "evmAddress":
      return (
        <>
          <div className="grid gap-2">
            <Label htmlFor="addresses">Addresses (comma-separated)</Label>
            <Input
              id="addresses"
              placeholder="0xabc..., 0xdef..."
              value={values.addresses ?? ""}
              onChange={(e) => update("addresses", e.target.value)}
              className="bg-black/40 font-mono text-xs"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="operator">Operator</Label>
            <Select
              value={values.operator ?? "in"}
              onValueChange={(v) => update("operator", v)}
            >
              <SelectTrigger id="operator" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">In (whitelist)</SelectItem>
                <SelectItem value="not_in">Not in (blacklist)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      );

    case "ethValue":
      return (
        <>
          <div className="grid gap-2">
            <Label htmlFor="eth-gte">Min (wei, inclusive)</Label>
            <Input
              id="eth-gte"
              placeholder="e.g. 100000000000000000 (0.1 ETH)"
              value={values.gte ?? ""}
              onChange={(e) => update("gte", e.target.value)}
              className="bg-black/40 font-mono text-xs"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="eth-lte">Max (wei, inclusive)</Label>
            <Input
              id="eth-lte"
              placeholder="e.g. 1000000000000000000 (1 ETH)"
              value={values.lte ?? ""}
              onChange={(e) => update("lte", e.target.value)}
              className="bg-black/40 font-mono text-xs"
            />
          </div>
        </>
      );

    case "evmNetwork":
      return (
        <div className="grid gap-2">
          <Label htmlFor="networks">Networks (comma-separated)</Label>
          <Input
            id="networks"
            placeholder="base, ethereum, arbitrum"
            value={values.networks ?? ""}
            onChange={(e) => update("networks", e.target.value)}
            className="bg-black/40 text-xs"
          />
        </div>
      );

    case "netUSDChange":
      return (
        <>
          <div className="grid gap-2">
            <Label htmlFor="usd-gte">Min USD (inclusive)</Label>
            <Input
              id="usd-gte"
              type="number"
              placeholder="e.g. -500"
              value={values.gte ?? ""}
              onChange={(e) => update("gte", e.target.value)}
              className="bg-black/40 font-mono text-xs"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="usd-lte">Max USD (inclusive)</Label>
            <Input
              id="usd-lte"
              type="number"
              placeholder="e.g. 500"
              value={values.lte ?? ""}
              onChange={(e) => update("lte", e.target.value)}
              className="bg-black/40 font-mono text-xs"
            />
          </div>
        </>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

/**
 * Format a wei string to a human-readable ETH value for display.
 */
function formatWei(wei: string): string {
  try {
    const value = BigInt(wei);
    const eth = Number(value) / 1e18;
    if (eth >= 0.001) {
      return `${eth.toFixed(4)} ETH`;
    }
    return `${wei} wei`;
  } catch {
    return `${wei} wei`;
  }
}
