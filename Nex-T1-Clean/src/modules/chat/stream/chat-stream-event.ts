type ChatStreamEventTypeMap = {
  "artifact-complete": UntypedJson;
  "artifact-data": UntypedJson;
  "artifact-start": UntypedJson;
  artifact_update: UntypedJson;
  cache: UntypedJson;
  chunk: UntypedJson;
  classification: UntypedJson;
  context_compaction: UntypedJson;
  credits: UntypedJson;
  error: UntypedJson;
  finish: UntypedJson;
  intent: UntypedJson;
  "market-data": UntypedJson;
  payloads: Array<Record<string, UntypedJson>>;
  ping: null;
  routing: UntypedJson;
  runtime_capabilities: UntypedJson;
  security: UntypedJson;
  task_update: UntypedJson;
  tool_call: UntypedJson;
  "tool-input-available": UntypedJson;
  "tool-input-delta": UntypedJson;
  "tool-input-start": UntypedJson;
  tool_result: UntypedJson;
  "tool-event": UntypedJson;
  tool_plan: UntypedJson;
  tool_validation_warning: UntypedJson;
  usage: UntypedJson;
  wallet_snapshot: UntypedJson;
  warn: UntypedJson;
  workflow_update: {
    workflowId: string;
    stepName: string;
    status: string;
    progress?: number;
  };
};

export type ChatStreamEventType = keyof ChatStreamEventTypeMap;

export type ChatStreamEvent<TType extends ChatStreamEventType = ChatStreamEventType> = {
  type: TType;
  data: ChatStreamEventTypeMap[TType];
};

export type ChatStreamEventData<TType extends ChatStreamEventType> =
  ChatStreamEventTypeMap[TType];

export type EmitChatStreamEvent = {
  <TType extends ChatStreamEventType>(
    type: TType,
    data: ChatStreamEventData<TType>,
  ): void;
  (event: ChatStreamEvent): void;
};

export function createEmitChatStreamEvent(
  update: (event: ChatStreamEvent) => void,
): EmitChatStreamEvent {
  function emit<TType extends ChatStreamEventType>(
    typeOrEvent: TType | ChatStreamEvent,
    data?: ChatStreamEventData<TType>,
  ): void {
    if (typeof typeOrEvent === "string") {
      update({
        type: typeOrEvent,
        data: data as ChatStreamEventData<TType>,
      });
      return;
    }

    update(typeOrEvent);
  }

  return emit as EmitChatStreamEvent;
}
