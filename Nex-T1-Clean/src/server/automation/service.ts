import { getErrorMessage } from "@/lib/utils/error";
import type { SupabaseServerClient } from "@/server/services/supabase/server";

import {
  agentStrategyBindingSchema,
  anchorAutomationStrategyInputSchema,
  automationStrategySchema,
  createAgentKeyInputSchema,
  createAutomationStrategyInputSchema,
  createGuardianCouncilInputSchema,
  createGuardianMemberInputSchema,
  createOverrideEventInputSchema,
  createStrategyBindingInputSchema,
  guardianCouncilSchema,
  guardianMemberSchema,
  overrideEventSchema,
  paymasterBalanceSchema,
  revokeAgentKeyInputSchema,
  updateAutomationStrategyInputSchema,
  updateGuardianCouncilInputSchema,
  updateGuardianMemberInputSchema,
  updateOverrideEventInputSchema,
  updateStrategyBindingInputSchema,
  upsertPaymasterBalanceInputSchema,
  userAgentKeySchema,
  computeStrategyHash,
  type AgentStrategyBinding,
  type AnchorAutomationStrategyInput,
  type AutomationStrategy,
  type CreateAgentKeyInput,
  type CreateAutomationStrategyInput,
  type CreateGuardianCouncilInput,
  type CreateGuardianMemberInput,
  type CreateOverrideEventInput,
  type CreateStrategyBindingInput,
  type GuardianCouncil,
  type GuardianMember,
  type OverrideEvent,
  type PaymasterBalance,
  type RevokeAgentKeyInput,
  type UpdateAutomationStrategyInput,
  type UpdateGuardianCouncilInput,
  type UpdateGuardianMemberInput,
  type UpdateOverrideEventInput,
  type UpdateStrategyBindingInput,
  type UpsertPaymasterBalanceInput,
  type UserAgentKey,
} from "@/server/automation/schema";

type SupabaseQueryFn<T> = () => PromiseLike<{ data: T | null; error: UntypedJson }>;

function assertSupabaseError(error: UntypedJson, defaultMessage: string): never {
  const message = getErrorMessage(error, defaultMessage);
  const err = new Error(message);
  err.name = "SupabaseError";
  throw err;
}

function unwrapSingle<T>(schema: { parse: (input: UntypedJson) => T }, value: UntypedJson, label: string): T {
  try {
    return schema.parse(value);
  } catch (error) {
    throw new Error(`${label} parse failed: ${getErrorMessage(error, "Invalid response payload")}`);
  }
}

function unwrapArray<T>(
  schema: { parse: (input: UntypedJson) => T },
  value: UntypedJson,
  label: string,
): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} parse failed: expected array`);
  }
  return value.map((entry) => unwrapSingle(schema, entry, label));
}

async function executeQuery<T>(query: SupabaseQueryFn<T>, label: string): Promise<T> {
  const { data, error } = await query();
  if (error) {
    assertSupabaseError(error, `Failed to ${label}`);
  }
  if (data === null) {
    assertSupabaseError(new Error(`null response for ${label}`), `Failed to ${label}`);
  }
  return data;
}

/*
 * Session Keys
 */

export async function listUserAgentKeys(client: SupabaseServerClient, userId: string): Promise<UserAgentKey[]> {
  const data = await executeQuery(
    () =>
      client
        .from("user_agent_keys")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    "list user agent keys",
  );

  return unwrapArray(userAgentKeySchema, data, "userAgentKeys");
}

export async function createUserAgentKey(
  client: SupabaseServerClient,
  userId: string,
  input: CreateAgentKeyInput,
): Promise<UserAgentKey> {
  const payload = createAgentKeyInputSchema.parse(input);

  const data = await executeQuery(
    () =>
      client
        .from("user_agent_keys")
        .insert({
          user_id: userId,
          agent_identifier: payload.agentIdentifier,
          chain_slug: payload.chainSlug,
          wallet_address: payload.walletAddress,
          session_key_public: payload.sessionKeyPublic,
          scopes: payload.scopes,
          expires_at: payload.expiresAt ? payload.expiresAt.toISOString() : null,
          metadata: payload.metadata ?? {},
        })
        .select("*")
        .single(),
    "create user agent key",
  );

  return unwrapSingle(userAgentKeySchema, data, "userAgentKey");
}

export async function revokeUserAgentKey(
  client: SupabaseServerClient,
  userId: string,
  keyId: string,
  input: RevokeAgentKeyInput,
): Promise<UserAgentKey> {
  const payload = revokeAgentKeyInputSchema.parse(input);

  const data = await executeQuery(
    () =>
      client
        .from("user_agent_keys")
        .update({
          revoked_at: new Date().toISOString(),
          revoked_reason: payload.revokedReason ?? null,
          scopes: [],
        })
        .eq("id", keyId)
        .eq("user_id", userId)
        .select("*")
        .single(),
    "revoke user agent key",
  );

  return unwrapSingle(userAgentKeySchema, data, "userAgentKey");
}

/*
 * Automation Strategies
 */

export async function listAutomationStrategies(
  client: SupabaseServerClient,
  userId: string,
): Promise<AutomationStrategy[]> {
  const data = await executeQuery(
    () =>
      client
        .from("automation_strategies")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    "list automation strategies",
  );

  return unwrapArray(automationStrategySchema, data, "automationStrategies");
}

export async function getAutomationStrategy(
  client: SupabaseServerClient,
  userId: string,
  strategyId: string,
): Promise<AutomationStrategy> {
  const data = await executeQuery(
    () =>
      client
        .from("automation_strategies")
        .select("*")
        .eq("id", strategyId)
        .eq("user_id", userId)
        .single(),
    "load automation strategy",
  );

  return unwrapSingle(automationStrategySchema, data, "automationStrategy");
}

export async function createAutomationStrategy(
  client: SupabaseServerClient,
  userId: string,
  input: CreateAutomationStrategyInput,
): Promise<AutomationStrategy> {
  const payload = createAutomationStrategyInputSchema.parse(input);

  const data = await executeQuery(
    () =>
      client
        .from("automation_strategies")
        .insert({
          user_id: userId,
          name: payload.name,
          description: payload.description ?? null,
          parameters: payload.parameters ?? {},
          strategy_hash: computeStrategyHash(payload.parameters ?? {}),
          metadata: payload.metadata ?? {},
        })
        .select("*")
        .single(),
    "create automation strategy",
  );

  return unwrapSingle(automationStrategySchema, data, "automationStrategy");
}

export async function updateAutomationStrategy(
  client: SupabaseServerClient,
  userId: string,
  strategyId: string,
  input: UpdateAutomationStrategyInput,
): Promise<AutomationStrategy> {
  const payload = updateAutomationStrategyInputSchema.parse(input);
  const patch: Record<string, UntypedJson> = {};

  if (payload.name !== undefined) patch.name = payload.name;
  if (payload.description !== undefined) patch.description = payload.description;
  if (payload.isActive !== undefined) patch.is_active = payload.isActive;
  if (payload.metadata !== undefined) patch.metadata = payload.metadata;

  if (Object.keys(patch).length === 0) {
    const { data, error } = await client
      .from("automation_strategies")
      .select("*")
      .eq("id", strategyId)
      .eq("user_id", userId)
      .single();

    if (error) {
      assertSupabaseError(error, "Failed to load automation strategy");
    }

    return unwrapSingle(automationStrategySchema, data, "automationStrategy");
  }

  const data = await executeQuery(
    () =>
      client
        .from("automation_strategies")
        .update(patch)
        .eq("id", strategyId)
        .eq("user_id", userId)
        .select("*")
        .single(),
    "update automation strategy",
  );

  return unwrapSingle(automationStrategySchema, data, "automationStrategy");
}

export async function anchorAutomationStrategy(
  client: SupabaseServerClient,
  userId: string,
  strategyId: string,
  input: AnchorAutomationStrategyInput,
): Promise<AutomationStrategy> {
  const payload = anchorAutomationStrategyInputSchema.parse(input);

  const data = await executeQuery(
    () =>
      client
        .from("automation_strategies")
        .update({
          anchored_chain: payload.anchoredChain,
          anchored_tx_hash: payload.anchoredTxHash,
          anchored_at: (payload.anchoredAt ?? new Date()).toISOString(),
        })
        .eq("id", strategyId)
        .eq("user_id", userId)
        .select("*")
        .single(),
    "anchor automation strategy",
  );

  return unwrapSingle(automationStrategySchema, data, "automationStrategy");
}

export async function deactivateAutomationStrategy(
  client: SupabaseServerClient,
  userId: string,
  strategyId: string,
): Promise<AutomationStrategy> {
  const data = await executeQuery(
    () =>
      client
        .from("automation_strategies")
        .update({ is_active: false })
        .eq("id", strategyId)
        .eq("user_id", userId)
        .select("*")
        .single(),
    "deactivate automation strategy",
  );

  return unwrapSingle(automationStrategySchema, data, "automationStrategy");
}

/*
 * Strategy Bindings
 */

export async function listStrategyBindings(
  client: SupabaseServerClient,
  userId: string,
  strategyId: string,
): Promise<AgentStrategyBinding[]> {
  const data = await executeQuery(
    () =>
      client
        .from("agent_strategy_bindings")
        .select("*")
        .eq("user_id", userId)
        .eq("strategy_id", strategyId)
        .order("created_at", { ascending: false }),
    "list strategy bindings",
  );

  return unwrapArray(agentStrategyBindingSchema, data, "agentStrategyBindings");
}

export async function createStrategyBinding(
  client: SupabaseServerClient,
  userId: string,
  strategyId: string,
  input: CreateStrategyBindingInput,
): Promise<AgentStrategyBinding> {
  const payload = createStrategyBindingInputSchema.parse(input);

  const data = await executeQuery(
    () =>
      client
        .from("agent_strategy_bindings")
        .insert({
          strategy_id: strategyId,
          user_id: userId,
          agent_identifier: payload.agentIdentifier,
          metadata: payload.metadata ?? {},
        })
        .select("*")
        .single(),
    "create strategy binding",
  );

  return unwrapSingle(agentStrategyBindingSchema, data, "agentStrategyBinding");
}

export async function updateStrategyBinding(
  client: SupabaseServerClient,
  userId: string,
  strategyId: string,
  bindingId: string,
  input: UpdateStrategyBindingInput,
): Promise<AgentStrategyBinding> {
  const payload = updateStrategyBindingInputSchema.parse(input);
  const patch: Record<string, UntypedJson> = {};

  if (payload.status !== undefined) patch.status = payload.status;
  if (payload.confirmationSignature !== undefined) patch.confirmation_signature = payload.confirmationSignature ?? null;
  if (payload.confirmationPayload !== undefined) patch.confirmation_payload = payload.confirmationPayload ?? {};
  if (payload.metadata !== undefined) patch.metadata = payload.metadata ?? {};
  if (payload.status && payload.status === "approved" && !patch.confirmation_signature) {
    patch.confirmed_at = new Date().toISOString();
  }

  const data = await executeQuery(
    () =>
      client
        .from("agent_strategy_bindings")
        .update(patch)
        .eq("id", bindingId)
        .eq("strategy_id", strategyId)
        .eq("user_id", userId)
        .select("*")
        .single(),
    "update strategy binding",
  );

  return unwrapSingle(agentStrategyBindingSchema, data, "agentStrategyBinding");
}

export async function deleteStrategyBinding(
  client: SupabaseServerClient,
  userId: string,
  strategyId: string,
  bindingId: string,
): Promise<void> {
  const { error } = await client
    .from("agent_strategy_bindings")
    .delete()
    .eq("id", bindingId)
    .eq("strategy_id", strategyId)
    .eq("user_id", userId);

  if (error) {
    assertSupabaseError(error, "delete strategy binding");
  }
}

/*
 * Guardian Councils
 */

export async function listGuardianCouncils(client: SupabaseServerClient, userId: string): Promise<GuardianCouncil[]> {
  const data = await executeQuery(
    () =>
      client
        .from("guardian_councils")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    "list guardian councils",
  );

  return unwrapArray(guardianCouncilSchema, data, "guardianCouncils");
}

export async function getGuardianCouncil(
  client: SupabaseServerClient,
  userId: string,
  councilId: string,
): Promise<GuardianCouncil> {
  const data = await executeQuery(
    () =>
      client
        .from("guardian_councils")
        .select("*")
        .eq("id", councilId)
        .eq("user_id", userId)
        .single(),
    "load guardian council",
  );

  return unwrapSingle(guardianCouncilSchema, data, "guardianCouncil");
}

export async function createGuardianCouncil(
  client: SupabaseServerClient,
  userId: string,
  input: CreateGuardianCouncilInput,
): Promise<GuardianCouncil> {
  const payload = createGuardianCouncilInputSchema.parse(input);

  const data = await executeQuery(
    () =>
      client
        .from("guardian_councils")
        .insert({
          user_id: userId,
          dao_identifier: payload.daoIdentifier,
          multisig_address: payload.multisigAddress,
          execution_chain: payload.executionChain,
          sla_hours: payload.slaHours,
          metadata: payload.metadata ?? {},
        })
        .select("*")
        .single(),
    "create guardian council",
  );

  return unwrapSingle(guardianCouncilSchema, data, "guardianCouncil");
}

export async function updateGuardianCouncil(
  client: SupabaseServerClient,
  userId: string,
  councilId: string,
  input: UpdateGuardianCouncilInput,
): Promise<GuardianCouncil> {
  const payload = updateGuardianCouncilInputSchema.parse(input);
  const patch: Record<string, UntypedJson> = {};

  if (payload.multisigAddress !== undefined) patch.multisig_address = payload.multisigAddress;
  if (payload.executionChain !== undefined) patch.execution_chain = payload.executionChain;
  if (payload.slaHours !== undefined) patch.sla_hours = payload.slaHours;
  if (payload.metadata !== undefined) patch.metadata = payload.metadata ?? {};

  const data = await executeQuery(
    () =>
      client
        .from("guardian_councils")
        .update(patch)
        .eq("id", councilId)
        .eq("user_id", userId)
        .select("*")
        .single(),
    "update guardian council",
  );

  return unwrapSingle(guardianCouncilSchema, data, "guardianCouncil");
}

export async function deleteGuardianCouncil(
  client: SupabaseServerClient,
  userId: string,
  councilId: string,
): Promise<void> {
  const { error } = await client.from("guardian_councils").delete().eq("id", councilId).eq("user_id", userId);
  if (error) {
    assertSupabaseError(error, "delete guardian council");
  }
}

/*
 * Guardian Members
 */

export async function listGuardianMembers(
  client: SupabaseServerClient,
  userId: string,
  councilId: string,
): Promise<GuardianMember[]> {
  await executeQuery(
    () =>
      client
        .from("guardian_councils")
        .select("id")
        .eq("id", councilId)
        .eq("user_id", userId)
        .single(),
    "verify guardian council ownership",
  );

  const data = await executeQuery(
    () =>
      client
        .from("guardian_members")
        .select("*")
        .eq("council_id", councilId)
        .eq("is_active", true)
        .order("added_at", { ascending: false }),
    "list guardian members",
  );

  return unwrapArray(guardianMemberSchema, data, "guardianMembers");
}

export async function addGuardianMember(
  client: SupabaseServerClient,
  userId: string,
  councilId: string,
  input: CreateGuardianMemberInput,
): Promise<GuardianMember> {
  // ensure user owns council
  await executeQuery(
    () =>
      client
        .from("guardian_councils")
        .select("id")
        .eq("id", councilId)
        .eq("user_id", userId)
        .single(),
    "verify guardian council ownership",
  );

  const payload = createGuardianMemberInputSchema.parse(input);

  const data = await executeQuery(
    () =>
      client
        .from("guardian_members")
        .insert({
          council_id: councilId,
          member_address: payload.memberAddress,
          member_type: payload.memberType,
          metadata: payload.metadata ?? {},
        })
        .select("*")
        .single(),
    "add guardian member",
  );

  return unwrapSingle(guardianMemberSchema, data, "guardianMember");
}

export async function updateGuardianMember(
  client: SupabaseServerClient,
  userId: string,
  councilId: string,
  memberId: string,
  input: UpdateGuardianMemberInput,
): Promise<GuardianMember> {
  await executeQuery(
    () =>
      client
        .from("guardian_councils")
        .select("id")
        .eq("id", councilId)
        .eq("user_id", userId)
        .single(),
    "verify guardian council ownership",
  );

  const payload = updateGuardianMemberInputSchema.parse(input);
  const patch: Record<string, UntypedJson> = {};

  if (payload.memberType !== undefined) patch.member_type = payload.memberType;
  if (payload.isActive !== undefined) patch.is_active = payload.isActive;
  if (payload.metadata !== undefined) patch.metadata = payload.metadata ?? {};
  if (payload.isActive === false) {
    patch.removed_at = new Date().toISOString();
  }

  const data = await executeQuery(
    () =>
      client
        .from("guardian_members")
        .update(patch)
        .eq("id", memberId)
        .eq("council_id", councilId)
        .select("*")
        .single(),
    "update guardian member",
  );

  return unwrapSingle(guardianMemberSchema, data, "guardianMember");
}

export async function removeGuardianMember(
  client: SupabaseServerClient,
  userId: string,
  councilId: string,
  memberId: string,
): Promise<void> {
  await executeQuery(
    () =>
      client
        .from("guardian_councils")
        .select("id")
        .eq("id", councilId)
        .eq("user_id", userId)
        .single(),
    "verify guardian council ownership",
  );

  const { error } = await client
    .from("guardian_members")
    .update({ is_active: false, removed_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("council_id", councilId);

  if (error) {
    assertSupabaseError(error, "remove guardian member");
  }
}

/*
 * Override Events
 */

export async function listOverrideEvents(
  client: SupabaseServerClient,
  userId: string,
  councilId: string,
): Promise<OverrideEvent[]> {
  await executeQuery(
    () =>
      client
        .from("guardian_councils")
        .select("id")
        .eq("id", councilId)
        .eq("user_id", userId)
        .single(),
    "verify guardian council ownership",
  );

  const data = await executeQuery(
    () =>
      client
        .from("governance_override_events")
        .select("*")
        .eq("council_id", councilId)
        .order("created_at", { ascending: false }),
    "list override events",
  );

  return unwrapArray(overrideEventSchema, data, "overrideEvents");
}

export async function createOverrideEvent(
  client: SupabaseServerClient,
  userId: string,
  councilId: string,
  input: CreateOverrideEventInput,
): Promise<OverrideEvent> {
  await executeQuery(
    () =>
      client
        .from("guardian_councils")
        .select("id")
        .eq("id", councilId)
        .eq("user_id", userId)
        .single(),
    "verify guardian council ownership",
  );

  const payload = createOverrideEventInputSchema.parse(input);

  const data = await executeQuery(
    () =>
      client
        .from("governance_override_events")
        .insert({
          council_id: councilId,
          triggered_by: payload.triggeredBy,
          trigger_type: payload.triggerType,
          chain_slug: payload.chainSlug,
          tx_hash: payload.txHash ?? null,
          status: payload.status ?? "pending",
          reason: payload.reason ?? null,
          metadata: payload.metadata ?? {},
        })
        .select("*")
        .single(),
    "create override event",
  );

  return unwrapSingle(overrideEventSchema, data, "overrideEvent");
}

export async function updateOverrideEvent(
  client: SupabaseServerClient,
  userId: string,
  councilId: string,
  eventId: string,
  input: UpdateOverrideEventInput,
): Promise<OverrideEvent> {
  await executeQuery(
    () =>
      client
        .from("guardian_councils")
        .select("id")
        .eq("id", councilId)
        .eq("user_id", userId)
        .single(),
    "verify guardian council ownership",
  );

  const payload = updateOverrideEventInputSchema.parse(input);
  const patch: Record<string, UntypedJson> = {};

  if (payload.status !== undefined) patch.status = payload.status;
  if (payload.txHash !== undefined) patch.tx_hash = payload.txHash ?? null;
  if (payload.resolvedAt !== undefined) patch.resolved_at = payload.resolvedAt.toISOString();
  if (payload.reason !== undefined) patch.reason = payload.reason ?? null;
  if (payload.metadata !== undefined) patch.metadata = payload.metadata ?? {};

  const data = await executeQuery(
    () =>
      client
        .from("governance_override_events")
        .update(patch)
        .eq("id", eventId)
        .eq("council_id", councilId)
        .select("*")
        .single(),
    "update override event",
  );

  return unwrapSingle(overrideEventSchema, data, "overrideEvent");
}

/*
 * Paymaster Balances
 */

export async function listPaymasterBalances(client: SupabaseServerClient): Promise<PaymasterBalance[]> {
  const data = await executeQuery(
    () =>
      client
        .from("engine_paymaster_balances")
        .select("*")
        .order("chain_slug", { ascending: true }),
    "list paymaster balances",
  );

  return unwrapArray(paymasterBalanceSchema, data, "paymasterBalances");
}

export async function upsertPaymasterBalance(
  client: SupabaseServerClient,
  input: UpsertPaymasterBalanceInput,
): Promise<PaymasterBalance> {
  const payload = upsertPaymasterBalanceInputSchema.parse(input);

  const data = await executeQuery(
    () =>
      client
        .from("engine_paymaster_balances")
        .upsert(
          {
            chain_slug: payload.chainSlug,
            paymaster_address: payload.paymasterAddress,
            current_balance: payload.currentBalance,
            balance_currency: payload.balanceCurrency,
            threshold_amount: payload.thresholdAmount,
            last_refreshed_at: (payload.lastRefreshedAt ?? new Date()).toISOString(),
            metadata: payload.metadata ?? {},
          },
          { onConflict: "chain_slug,paymaster_address" },
        )
        .select("*")
        .single(),
    "upsert paymaster balance",
  );

  return unwrapSingle(paymasterBalanceSchema, data, "paymasterBalance");
}

