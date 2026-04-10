import type { AuthMethod, Mode, Step } from "@/components/auth/login/types";

export type LoginState = {
  step: Step;
  mode: Mode;
  authMethod: AuthMethod;
};

export type LoginEvent =
  | { type: "SET_STEP"; step: Step }
  | { type: "SET_MODE"; mode: Mode }
  | { type: "TOGGLE_MODE" }
  | { type: "SET_AUTH_METHOD"; method: AuthMethod }
  | { type: "RESET"; mode?: Mode; authMethod?: AuthMethod };

export function createLoginState(initialMode: Mode = "sign-in", initialAuthMethod: AuthMethod = "email"): LoginState {
  return {
    step: "entry",
    mode: initialMode,
    authMethod: initialAuthMethod,
  } satisfies LoginState;
}

export function loginReducer(state: LoginState, event: LoginEvent): LoginState {
  switch (event.type) {
    case "SET_STEP":
      return { ...state, step: event.step };
    case "SET_MODE":
      return { ...state, mode: event.mode, step: "entry" };
    case "TOGGLE_MODE":
      return { ...state, mode: state.mode === "sign-in" ? "sign-up" : "sign-in", step: "entry" };
    case "SET_AUTH_METHOD":
      return { ...state, authMethod: event.method, step: "entry" };
    case "RESET":
      return createLoginState(event.mode ?? state.mode, event.authMethod ?? state.authMethod);
    default:
      return state;
  }
}
