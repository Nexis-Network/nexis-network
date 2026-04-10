import { useMemo, useReducer } from "react";

export type ChatStatusState = "idle" | "auth_blocked" | "submitting" | "streaming" | "error";

export type ChatState = {
  status: ChatStatusState;
  lastError: string | null;
  submissionId: string | null;
};

export type ChatMachineEvent =
  | { type: "RESET" }
  | { type: "SUBMIT"; submissionId: string }
  | { type: "AUTH_REQUIRED" }
  | { type: "STREAM_READY" }
  | { type: "STREAM_DONE" }
  | { type: "STREAM_FAIL"; error?: string | null };

export const initialChatState: ChatState = {
  status: "idle",
  lastError: null,
  submissionId: null,
};

export function chatReducer(state: ChatState, event: ChatMachineEvent): ChatState {
  switch (event.type) {
    case "RESET":
      return initialChatState;
    case "SUBMIT":
      return {
        status: "submitting",
        lastError: null,
        submissionId: event.submissionId,
      };
    case "AUTH_REQUIRED":
      return {
        status: "auth_blocked",
        lastError: null,
        submissionId: state.submissionId,
      };
    case "STREAM_READY":
      if (state.status === "submitting" || state.status === "auth_blocked") {
        return {
          ...state,
          status: "streaming",
        };
      }
      return state;
    case "STREAM_DONE":
      return {
        status: "idle",
        lastError: null,
        submissionId: null,
      };
    case "STREAM_FAIL":
      return {
        status: "error",
        lastError: event.error ?? "Unknown error",
        submissionId: state.submissionId,
      };
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

export function useChatStateMachine(initialState: Partial<ChatState> = {}) {
  const mergedInitial = useMemo(() => ({ ...initialChatState, ...initialState }), [initialState]);
  const [state, dispatch] = useReducer(chatReducer, mergedInitial);

  const derived = useMemo(
    () => ({
      isBusy: state.status === "submitting" || state.status === "streaming",
      isAutoScrollActive: state.status === "submitting" || state.status === "streaming",
    }),
    [state.status],
  );

  return {
    state,
    dispatch,
    derived,
  } as const;
}
