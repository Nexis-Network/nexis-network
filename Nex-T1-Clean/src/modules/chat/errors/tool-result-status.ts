export type ToolResultStatus =
  | "success"
  | "empty_result"
  | "partial_result"
  | "permission_denied"
  | "error";

export function classifyToolResult(
  _toolName: string,
  result: UntypedJson,
): ToolResultStatus {
  // Null or undefined
  if (result === null || result === undefined) {
    return "empty_result";
  }

  // Non-object primitives are treated as success
  if (typeof result !== "object") {
    return "success";
  }

  const obj = result as Record<string, UntypedJson>;

  // Error indicators
  if ("error" in obj || "errorMessage" in obj) {
    return "error";
  }

  // Permission denied indicators
  if (
    "accessDenied" in obj ||
    "unauthorized" in obj ||
    obj.status === 401 ||
    obj.status === 403
  ) {
    return "permission_denied";
  }

  // Partial result indicators
  if (obj.partial === true || obj.incomplete === true) {
    return "partial_result";
  }

  // Empty array or empty object
  if (Array.isArray(result)) {
    return result.length === 0 ? "empty_result" : "success";
  }

  if (Object.keys(obj).length === 0) {
    return "empty_result";
  }

  return "success";
}
