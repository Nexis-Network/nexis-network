export type ComposerTrigger = "/" | "@";

export type ComposerTriggerMatch = {
  trigger: ComposerTrigger;
  triggerIndex: number;
  insertionIndex: number;
};

export function resolveComposerTriggerAtCursor(params: {
  value: string;
  selectionStart: number;
  altKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
}): ComposerTrigger | null {
  const { value, selectionStart, altKey, metaKey, ctrlKey } = params;

  if (altKey || metaKey || ctrlKey || selectionStart <= 0) {
    return null;
  }

  const insertedCharacter = value[selectionStart - 1];
  return insertedCharacter === "/" || insertedCharacter === "@"
    ? insertedCharacter
    : null;
}

export function findComposerTriggerMatch(
  value: string,
  selectionStart: number,
  trigger: ComposerTrigger,
): ComposerTriggerMatch | null {
  if (selectionStart <= 0 || value[selectionStart - 1] !== trigger) {
    return null;
  }

  const precedingCharacter = selectionStart > 1 ? value[selectionStart - 2] : "";
  if (precedingCharacter && !/\s/.test(precedingCharacter)) {
    return null;
  }

  return {
    trigger,
    triggerIndex: selectionStart - 1,
    insertionIndex: selectionStart - 1,
  };
}

export function removeComposerTrigger(
  value: string,
  match: ComposerTriggerMatch,
): {
  value: string;
  selectionStart: number;
} {
  const nextValue =
    value.slice(0, match.triggerIndex) + value.slice(match.triggerIndex + 1);

  return {
    value: nextValue,
    selectionStart: match.insertionIndex,
  };
}

export function insertTextAtCursor(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  text: string,
): {
  value: string;
  selectionStart: number;
} {
  const nextValue =
    value.slice(0, selectionStart) + text + value.slice(selectionEnd);
  const nextSelectionStart = selectionStart + text.length;

  return {
    value: nextValue,
    selectionStart: nextSelectionStart,
  };
}
