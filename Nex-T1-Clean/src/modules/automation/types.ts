import type {
  AgentStrategyBinding,
  AnchorAutomationStrategyInput,
  AutomationStrategy,
  CreateAgentKeyInput,
  CreateAutomationStrategyInput,
  CreateGuardianCouncilInput,
  CreateGuardianMemberInput,
  CreateOverrideEventInput,
  CreateStrategyBindingInput,
  GuardianCouncil,
  GuardianMember,
  OverrideEvent,
  PaymasterBalance,
  RevokeAgentKeyInput,
  UpdateAutomationStrategyInput,
  UpdateGuardianCouncilInput,
  UpdateGuardianMemberInput,
  UpdateOverrideEventInput,
  UpdateStrategyBindingInput,
  UpsertPaymasterBalanceInput,
  UserAgentKey,
} from "@/server/automation/schema";

export type AutomationSessionKey = UserAgentKey;
export type AutomationStrategyRecord = AutomationStrategy;
export type StrategyBindingRecord = AgentStrategyBinding;
export type GuardianCouncilRecord = GuardianCouncil;
export type GuardianMemberRecord = GuardianMember;
export type OverrideEventRecord = OverrideEvent;
export type PaymasterBalanceRecord = PaymasterBalance;

export type CreateSessionKeyPayload = CreateAgentKeyInput;
export type RevokeSessionKeyPayload = RevokeAgentKeyInput;

export type CreateStrategyPayload = CreateAutomationStrategyInput;
export type UpdateStrategyPayload = UpdateAutomationStrategyInput;
export type AnchorStrategyPayload = AnchorAutomationStrategyInput;

export type CreateStrategyBindingPayload = CreateStrategyBindingInput;
export type UpdateStrategyBindingPayload = UpdateStrategyBindingInput;

export type CreateCouncilPayload = CreateGuardianCouncilInput;
export type UpdateCouncilPayload = UpdateGuardianCouncilInput;

export type CreateGuardianMemberPayload = CreateGuardianMemberInput;
export type UpdateGuardianMemberPayload = UpdateGuardianMemberInput;

export type CreateOverrideEventPayload = CreateOverrideEventInput;
export type UpdateOverrideEventPayload = UpdateOverrideEventInput;

export type UpsertPaymasterBalancePayload = UpsertPaymasterBalanceInput;

