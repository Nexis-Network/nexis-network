"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, PlusCircle, ShieldCheck, Trash, Users } from "lucide-react";

import {
  useAddGuardianMember,
  useCreateGuardianCouncil,
  useCreateOverrideEvent,
  useDeleteGuardianCouncil,
  useGuardianCouncils,
  useGuardianMembers,
  useOverrideEvents,
  useRemoveGuardianMember,
  useUpdateGuardianMember,
  useUpdateGuardianCouncil,
  useUpdateOverrideEvent,
} from "@/modules/automation/hooks";
import type {
  CreateOverrideEventPayload,
  GuardianCouncilRecord,
  GuardianMemberRecord,
  OverrideEventRecord,
} from "@/modules/automation/types";
import { useToast } from "@/hooks/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/settings/shared/settings-button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OverrideEventStatus = OverrideEventRecord["status"];

type CouncilFormState = {
  daoIdentifier: string;
  multisigAddress: string;
  executionChain: string;
  slaHours: string;
  metadata: string;
};

type MemberFormState = {
  memberAddress: string;
  memberType: "human" | "agent";
  metadata: string;
};

type OverrideEventFormState = {
  triggeredBy: string;
  triggerType: string;
  chainSlug: string;
  txHash: string;
  status: OverrideEventStatus;
  reason: string;
  metadata: string;
};

const DEFAULT_COUNCIL_FORM: CouncilFormState = {
  daoIdentifier: "",
  multisigAddress: "",
  executionChain: "",
  slaHours: "24",
  metadata: "{\n  \n}",
};

const DEFAULT_MEMBER_FORM: MemberFormState = {
  memberAddress: "",
  memberType: "human",
  metadata: "{\n  \n}",
};

const DEFAULT_EVENT_FORM: OverrideEventFormState = {
  triggeredBy: "",
  triggerType: "",
  chainSlug: "",
  txHash: "",
  status: "pending",
  reason: "",
  metadata: "{\n  \n}",
};

const EVENT_STATUS_OPTIONS = ["pending", "processing", "resolved", "rejected"] as const satisfies ReadonlyArray<
  OverrideEventStatus
>;

const EVENT_STATUS_SET = new Set<OverrideEventStatus>(EVENT_STATUS_OPTIONS);

const normalizeOverrideStatus = (value: UntypedJson): OverrideEventStatus => {
  if (typeof value === "string") {
    const lowered = value.toLowerCase() as OverrideEventStatus;
    if (EVENT_STATUS_SET.has(lowered)) {
      return lowered;
    }
  }
  return "pending";
};

export function GuardianCouncilManager() {
  const { data, isLoading, error, refetch, isRefetching } = useGuardianCouncils();
  const createCouncil = useCreateGuardianCouncil();
  const updateCouncil = useUpdateGuardianCouncil();
  const deleteCouncil = useDeleteGuardianCouncil();
  const { toast } = useToast();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formState, setFormState] = useState<CouncilFormState>(DEFAULT_COUNCIL_FORM);
  const [expandedCouncils, setExpandedCouncils] = useState<Record<string, boolean>>({});

  const handleFormChange = <K extends keyof CouncilFormState>(key: K, value: CouncilFormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => setFormState(DEFAULT_COUNCIL_FORM);

  const sortedCouncils = useMemo(() => {
    return [...(data ?? [])].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [data]);

  const handleCreateCouncil = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createCouncil.isPending) return;

    let metadata: Record<string, UntypedJson> | undefined;
    try {
      metadata = formState.metadata.trim().length > 0 ? safeParseJson(formState.metadata) : undefined;
    } catch (parseError) {
      toast({
        title: "Invalid metadata",
        description:
          parseError instanceof Error ? parseError.message : "Metadata JSON could not be parsed.",
        variant: "destructive",
      });
      return;
    }

    const slaHours = Number(formState.slaHours);
    if (!Number.isFinite(slaHours) || slaHours <= 0) {
      toast({
        title: "Invalid SLA",
        description: "Provide a positive SLA window in hours.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createCouncil.mutateAsync({
        daoIdentifier: formState.daoIdentifier.trim(),
        multisigAddress: formState.multisigAddress.trim(),
        executionChain: formState.executionChain.trim(),
        slaHours,
        metadata,
      });
      toast({
        title: "Guardian council created",
        description: "Council members can now manage emergency overrides.",
      });
      resetForm();
      setShowCreateForm(false);
    } catch (mutationError) {
      toast({
        title: "Failed to create guardian council",
        description:
          mutationError instanceof Error ? mutationError.message : "An unknown error occurred while creating council.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSla = async (councilId: string, slaHours: number) => {
    if (!Number.isFinite(slaHours) || slaHours <= 0) {
      toast({
        title: "Invalid SLA",
        description: "SLA window must be greater than zero hours.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateCouncil.mutateAsync({
        councilId,
        payload: {
          slaHours,
        },
      });
      toast({
        title: "SLA updated",
        description: "Guardian council SLA updated successfully.",
      });
    } catch (mutationError) {
      toast({
        title: "Failed to update SLA",
        description:
          mutationError instanceof Error ? mutationError.message : "An unknown error occurred while updating SLA.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCouncil = async (councilId: string) => {
    try {
      await deleteCouncil.mutateAsync(councilId);
      toast({
        title: "Guardian council removed",
        description: "Council and associated members have been removed.",
      });
    } catch (mutationError) {
      toast({
        title: "Failed to remove council",
        description:
          mutationError instanceof Error ? mutationError.message : "An unknown error occurred while removing council.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-border/60 bg-card dark:bg-[#121212]">
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Guardian Councils</CardTitle>
            <CardDescription>
              Manage DAO-level guardians, enforce SLA windows, and orchestrate emergency override actions.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={isRefetching || isLoading}
              onClick={() => refetch()}
              aria-label="Refresh guardian councils"
            >
              {isRefetching ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />}
            </Button>
            <Button
              variant={showCreateForm ? "secondary" : "default"}
              onClick={() => setShowCreateForm((prev) => !prev)}
            >
              <PlusCircle className="mr-2 size-4" />
              {showCreateForm ? "Close form" : "New council"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {showCreateForm && (
          <form onSubmit={handleCreateCouncil} className="grid gap-4 rounded-lg border border-border/60 bg-white/80 p-4 dark:bg-black/20">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="guardian-dao-identifier">DAO identifier</Label>
                <Input
                  id="guardian-dao-identifier"
                  value={formState.daoIdentifier}
                  onChange={(event) => handleFormChange("daoIdentifier", event.target.value)}
                  placeholder="nex-governance"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="guardian-multisig-address">Guardian multisig</Label>
                <Input
                  id="guardian-multisig-address"
                  value={formState.multisigAddress}
                  onChange={(event) => handleFormChange("multisigAddress", event.target.value)}
                  placeholder="0x..."
                  required
                />
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="guardian-execution-chain">Execution chain</Label>
                <Input
                  id="guardian-execution-chain"
                  value={formState.executionChain}
                  onChange={(event) => handleFormChange("executionChain", event.target.value)}
                  placeholder="base, optimism, solana"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="guardian-sla-hours">SLA hours</Label>
                <Input
                  id="guardian-sla-hours"
                  type="number"
                  min={1}
                  value={formState.slaHours}
                  onChange={(event) => handleFormChange("slaHours", event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="guardian-metadata">Metadata (JSON)</Label>
              <Textarea
                id="guardian-metadata"
                rows={4}
                value={formState.metadata}
                onChange={(event) => handleFormChange("metadata", event.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  resetForm();
                  setShowCreateForm(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createCouncil.isPending}>
                {createCouncil.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create council"
                )}
              </Button>
            </div>
          </form>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-white/80 px-3 py-2 text-sm text-muted-foreground dark:bg-black/20">
            <Loader2 className="size-4 animate-spin" />
            Loading guardian councils…
          </div>
        )}

        {!isLoading && (data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            No guardian councils defined. Create a council to introduce human-controlled overrides for automation.
          </p>
        )}

        {sortedCouncils.map((council) => {
          const isExpanded = Boolean(expandedCouncils[council.id]);
          const isSlaUpdatePending =
            updateCouncil.isPending && updateCouncil.variables?.councilId === council.id;
          const isCouncilDeletePending = deleteCouncil.isPending && deleteCouncil.variables === council.id;
          return (
            <div key={council.id} className="rounded-lg border border-border/60 bg-white/80 dark:bg-black/20">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-t-lg bg-white px-4 py-3 text-left text-sm font-medium text-foreground transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 dark:bg-white/5 dark:hover:bg-white/10 dark:focus-visible:ring-white/20"
                onClick={() =>
                  setExpandedCouncils((prev) => ({
                    ...prev,
                    [council.id]: !prev[council.id],
                  }))
                }
              >
                <div className="flex flex-wrap items-center gap-3">
                  {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  <span>{council.daoIdentifier}</span>
                  <Badge variant="outline">{council.executionChain}</Badge>
                  <Badge variant="secondary">SLA {council.slaHours}h</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Updated {council.updatedAt.toLocaleString()}
                </div>
              </button>
              {isExpanded && (
                <CouncilDetails
                  council={council}
                  onUpdateSla={handleUpdateSla}
                  onDelete={handleDeleteCouncil}
                  isUpdateSlaPending={isSlaUpdatePending}
                  isDeletePending={isCouncilDeletePending}
                />
              )}
            </div>
          );
        })}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Guardian councils provide a human-layer circuit breaker for AI agents and must meet SLA windows before
        automation proceeds.
      </CardFooter>
    </Card>
  );
}

type CouncilDetailsProps = {
  council: GuardianCouncilRecord;
  onUpdateSla: (councilId: string, slaHours: number) => void;
  onDelete: (councilId: string) => void;
  isUpdateSlaPending: boolean;
  isDeletePending: boolean;
};

function CouncilDetails({ council, onUpdateSla, onDelete, isUpdateSlaPending, isDeletePending }: CouncilDetailsProps) {
  const membersQuery = useGuardianMembers(council.id, true);
  const addMember = useAddGuardianMember(council.id);
  const updateMember = useUpdateGuardianMember(council.id);
  const removeMember = useRemoveGuardianMember(council.id);

  const eventsQuery = useOverrideEvents(council.id, true);
  const createEvent = useCreateOverrideEvent(council.id);
  const updateEvent = useUpdateOverrideEvent(council.id);
  const { toast } = useToast();

  const [slaInput, setSlaInput] = useState(String(council.slaHours));
  const [memberForm, setMemberForm] = useState<MemberFormState>(DEFAULT_MEMBER_FORM);
  const [eventForm, setEventForm] = useState<OverrideEventFormState>(DEFAULT_EVENT_FORM);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, OverrideEventStatus>>({});

  const handleMemberFormChange = <K extends keyof MemberFormState>(key: K, value: MemberFormState[K]) => {
    setMemberForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetMemberForm = () => setMemberForm(DEFAULT_MEMBER_FORM);

  const handleEventFormChange = <K extends keyof OverrideEventFormState>(key: K, value: OverrideEventFormState[K]) => {
    setEventForm((prev) => {
      if (key === "status") {
        return { ...prev, status: normalizeOverrideStatus(value) };
      }
      const next = { ...prev, [key]: value };
      return next as OverrideEventFormState;
    });
  };

  const resetEventForm = () => setEventForm(DEFAULT_EVENT_FORM);

  const handleAddMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let metadata: Record<string, UntypedJson> | undefined;
    try {
      metadata = memberForm.metadata.trim().length > 0 ? safeParseJson(memberForm.metadata) : undefined;
    } catch (parseError) {
      toast({
        title: "Invalid metadata",
        description:
          parseError instanceof Error ? parseError.message : "Metadata JSON could not be parsed.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addMember.mutateAsync({
        memberAddress: memberForm.memberAddress.trim(),
        memberType: memberForm.memberType,
        metadata,
      });
      toast({
        title: "Member added",
        description: "Guardian has been added to the council.",
      });
      resetMemberForm();
    } catch (mutationError) {
      toast({
        title: "Failed to add member",
        description:
          mutationError instanceof Error ? mutationError.message : "An unknown error occurred while adding member.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateMemberStatus = async (member: GuardianMemberRecord, isActive: boolean) => {
    try {
      await updateMember.mutateAsync({
        memberId: member.id,
        payload: {
          isActive,
        },
      });
      toast({
        title: isActive ? "Member reactivated" : "Member deactivated",
        description: isActive
          ? "Guardian member restored to active status."
          : "Guardian removed from active roster.",
      });
    } catch (mutationError) {
      toast({
        title: "Failed to update member",
        description:
          mutationError instanceof Error ? mutationError.message : "An unknown error occurred while updating member.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember.mutateAsync({ memberId });
      toast({
        title: "Member removed",
        description: "Guardian revoked from council.",
      });
    } catch (mutationError) {
      toast({
        title: "Failed to remove member",
        description:
          mutationError instanceof Error ? mutationError.message : "An unknown error occurred while removing member.",
        variant: "destructive",
      });
    }
  };

  const handleCreateOverrideEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let metadata: Record<string, UntypedJson> | undefined;
    try {
      metadata = eventForm.metadata.trim().length > 0 ? safeParseJson(eventForm.metadata) : undefined;
    } catch (parseError) {
      toast({
        title: "Invalid metadata",
        description:
          parseError instanceof Error ? parseError.message : "Metadata JSON could not be parsed.",
        variant: "destructive",
      });
      return;
    }

    try {
      const status: OverrideEventStatus = normalizeOverrideStatus(eventForm.status);
      const payload: CreateOverrideEventPayload = {
        triggeredBy: eventForm.triggeredBy.trim(),
        triggerType: eventForm.triggerType.trim(),
        chainSlug: eventForm.chainSlug.trim(),
        txHash: eventForm.txHash.trim() || undefined,
        status,
        reason: eventForm.reason.trim() || undefined,
        metadata,
      };
      await createEvent.mutateAsync(payload);
      toast({
        title: "Override event logged",
        description: "Override event recorded for audit trail.",
      });
      resetEventForm();
    } catch (mutationError) {
      toast({
        title: "Failed to log override",
        description:
          mutationError instanceof Error ? mutationError.message : "An unknown error occurred while logging override.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateOverrideStatus = async (overrideEvent: OverrideEventRecord, status: OverrideEventStatus) => {
    try {
      const normalizedStatus = normalizeOverrideStatus(status);
      await updateEvent.mutateAsync({
        eventId: overrideEvent.id,
        payload: {
          status: normalizedStatus,
          resolvedAt: normalizedStatus === "resolved" ? new Date() : undefined,
        },
      });
      toast({
        title: "Override status updated",
        description: `Override event marked as ${normalizedStatus}.`,
      });
    } catch (mutationError) {
      toast({
        title: "Failed to update override",
        description:
          mutationError instanceof Error ? mutationError.message : "An unknown error occurred while updating override.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 bg-white/80 p-4 text-sm text-muted-foreground dark:bg-black/20">
      <div className="grid gap-2 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`council-sla-${council.id}`}>SLA hours</Label>
          <div className="flex gap-2">
            <Input
              id={`council-sla-${council.id}`}
              value={slaInput}
              onChange={(event) => setSlaInput(event.target.value)}
              type="number"
              min={1}
            />
            <Button
              variant="secondary"
              onClick={() => onUpdateSla(council.id, Number(slaInput))}
              disabled={isUpdateSlaPending}
            >
              {isUpdateSlaPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Update SLA
            </Button>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Guardian multisig</Label>
          <p className="rounded-md border border-border/50 bg-white/70 px-3 py-2 font-mono text-xs text-foreground dark:bg-black/30">
            {council.multisigAddress}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(council.id)}
          disabled={isDeletePending}
        >
          {isDeletePending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Trash className="mr-2 size-4" />
          )}
          Remove council
        </Button>
      </div>

      <section className="space-y-3 rounded-lg border border-border/50 bg-white/70 p-4 dark:bg-black/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-regular text-foreground">Guardian members</h3>
            <p className="text-xs text-muted-foreground">
              Active guardians must acknowledge overrides within the SLA window.
            </p>
          </div>
          {membersQuery.isRefetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <form onSubmit={handleAddMember} className="grid gap-3 rounded-md border border-border/40 bg-white/80 p-3 dark:bg-black/20">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`member-address-${council.id}`}>Member address / identifier</Label>
              <Input
                id={`member-address-${council.id}`}
                value={memberForm.memberAddress}
                onChange={(event) => handleMemberFormChange("memberAddress", event.target.value)}
                placeholder="0x… or agent handle"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`member-type-${council.id}`}>Member type</Label>
              <Select
                value={memberForm.memberType}
                onValueChange={(value: "human" | "agent") => handleMemberFormChange("memberType", value)}
              >
                <SelectTrigger id={`member-type-${council.id}`} className="text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="human">Human</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`member-metadata-${council.id}`}>Metadata (JSON)</Label>
            <Textarea
              id={`member-metadata-${council.id}`}
              rows={3}
              value={memberForm.metadata}
              onChange={(event) => handleMemberFormChange("metadata", event.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={addMember.isPending}>
              {addMember.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Adding…
                </>
              ) : (
                "Add guardian"
              )}
            </Button>
          </div>
        </form>

        {(membersQuery.data ?? []).map((member) => (
          <div
            key={member.id}
            className="flex flex-col gap-3 rounded-md border border-border/40 bg-white/80 p-3 dark:bg-black/20 md:flex-row md:items-start md:justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm text-foreground">
                <span className="font-regular">{member.memberAddress}</span>
                <Badge variant="outline">{member.memberType}</Badge>
                <Badge variant={member.isActive ? "secondary" : "outline"}>
                  {member.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Added {member.addedAt.toLocaleString()}
                {member.removedAt && (
                  <>
                    {" · "}Removed {member.removedAt.toLocaleString()}
                  </>
                )}
              </div>
                {member.metadata && Object.keys(member.metadata).length > 0 && (
                  <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap rounded-md bg-white/60 p-2 text-[11px] text-foreground dark:bg-black/40">
                    {JSON.stringify(member.metadata, null, 2)}
                  </pre>
                )}
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <Button
                size="sm"
                variant={member.isActive ? "secondary" : "outline"}
                onClick={() => handleUpdateMemberStatus(member, !member.isActive)}
                disabled={
                  updateMember.isPending &&
                  updateMember.variables?.memberId === member.id
                }
              >
                {updateMember.isPending && updateMember.variables?.memberId === member.id ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {member.isActive ? "Deactivate" : "Reactivate"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleRemoveMember(member.id)}
                disabled={removeMember.isPending && removeMember.variables?.memberId === member.id}
              >
                {removeMember.isPending && removeMember.variables?.memberId === member.id ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Trash className="mr-2 size-4" />
                )}
                Remove
              </Button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-lg border border-border/50 bg-white/70 p-4 dark:bg-black/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-regular text-foreground">Override events</h3>
            <p className="text-xs text-muted-foreground">
              Emergency overrides documented for audit trails and SLA compliance.
            </p>
          </div>
          {eventsQuery.isRefetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <form onSubmit={handleCreateOverrideEvent} className="grid gap-3 rounded-md border border-border/40 bg-white/80 p-3 dark:bg-black/20">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`event-triggered-by-${council.id}`}>Triggered by</Label>
              <Input
                id={`event-triggered-by-${council.id}`}
                value={eventForm.triggeredBy}
                onChange={(event) => handleEventFormChange("triggeredBy", event.target.value)}
                placeholder="guardian:alice"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`event-trigger-type-${council.id}`}>Trigger type</Label>
              <Input
                id={`event-trigger-type-${council.id}`}
                value={eventForm.triggerType}
                onChange={(event) => handleEventFormChange("triggerType", event.target.value)}
                placeholder="pause_automation, adjust_sla…"
                required
              />
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`event-chain-${council.id}`}>Chain slug</Label>
              <Input
                id={`event-chain-${council.id}`}
                value={eventForm.chainSlug}
                onChange={(event) => handleEventFormChange("chainSlug", event.target.value)}
                placeholder="base, optimism, solana"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`event-tx-${council.id}`}>Transaction hash (optional)</Label>
              <Input
                id={`event-tx-${council.id}`}
                value={eventForm.txHash}
                onChange={(event) => handleEventFormChange("txHash", event.target.value)}
                placeholder="0x..."
              />
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`event-status-${council.id}`}>Status</Label>
            <Select
              value={eventForm.status}
              onValueChange={(value) => handleEventFormChange("status", normalizeOverrideStatus(value))}
            >
                <SelectTrigger id={`event-status-${council.id}`} className="text-xs">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`event-reason-${council.id}`}>Reason (optional)</Label>
              <Input
                id={`event-reason-${council.id}`}
                value={eventForm.reason}
                onChange={(event) => handleEventFormChange("reason", event.target.value)}
                placeholder="Describe the override rationale"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`event-metadata-${council.id}`}>Metadata (JSON)</Label>
            <Textarea
              id={`event-metadata-${council.id}`}
              rows={3}
              value={eventForm.metadata}
              onChange={(event) => handleEventFormChange("metadata", event.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={createEvent.isPending}>
              {createEvent.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Logging…
                </>
              ) : (
                "Log override"
              )}
            </Button>
          </div>
        </form>

        {(eventsQuery.data ?? []).map((overrideEvent) => {
          const draftStatus = statusDrafts[overrideEvent.id] ?? normalizeOverrideStatus(overrideEvent.status);
          return (
            <div
              key={overrideEvent.id}
              className="flex flex-col gap-3 rounded-md border border-border/40 bg-white/80 p-3 dark:bg-black/20 md:flex-row md:items-start md:justify-between"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                  <Badge variant="outline">{overrideEvent.status}</Badge>
                  <span className="font-regular">{overrideEvent.triggeredBy}</span>
                  <span className="text-xs text-muted-foreground">{overrideEvent.triggerType}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Triggered on {overrideEvent.createdAt.toLocaleString()} — chain {overrideEvent.chainSlug}
                  {overrideEvent.resolvedAt && (
                    <>
                      {" · "}resolved {overrideEvent.resolvedAt.toLocaleString()}
                    </>
                  )}
                  {overrideEvent.txHash && (
                    <>
                      {" · "}
                      <span className="font-mono text-[11px] text-foreground">
                        {truncateMiddle(overrideEvent.txHash, 16)}
                      </span>
                    </>
                  )}
                </div>
                {overrideEvent.reason && (
                  <p className="text-xs text-muted-foreground">Reason: {overrideEvent.reason}</p>
                )}
                {overrideEvent.metadata && Object.keys(overrideEvent.metadata).length > 0 && (
                  <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap rounded-md bg-white/60 p-2 text-[11px] text-foreground dark:bg-black/40">
                    {JSON.stringify(overrideEvent.metadata, null, 2)}
                  </pre>
                )}
              </div>
              <div className="flex flex-col gap-2 text-xs md:w-48">
                <Select
                  value={draftStatus}
                  onValueChange={(value) =>
                    setStatusDrafts((prev) => ({
                      ...prev,
                      [overrideEvent.id]: normalizeOverrideStatus(value),
                    }))
                  }
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleUpdateOverrideStatus(overrideEvent, draftStatus)}
                  disabled={updateEvent.isPending && updateEvent.variables?.eventId === overrideEvent.id}
                >
                  {updateEvent.isPending && updateEvent.variables?.eventId === overrideEvent.id ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 size-4" />
                  )}
                  Update status
                </Button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function safeParseJson(value: string): Record<string, UntypedJson> {
  if (!value || value.trim().length === 0) {
    return {};
  }
  return JSON.parse(value);
}

function truncateMiddle(value: string, length: number) {
  if (!value) return "";
  if (value.length <= length) return value;
  const half = Math.floor(length / 2);
  return `${value.slice(0, half)}…${value.slice(-half)}`;
}
