import { isValidElement } from "react";
import type { ReactNode } from "react";

export default function getNodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return node.toString();
  }

  if (Array.isArray(node)) {
    return node.map(getNodeText).join(" ").trim();
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getNodeText(node.props.children ?? null);
  }

  console.warn("Unresolved `node` of type:", typeof node, node);
  return "";
}
