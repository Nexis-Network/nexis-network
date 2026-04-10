export function normalizeCategorySelection(next: string[], limit = 5): string[] {
  const unique = Array.from(new Set(next.filter(Boolean)));
  if (limit <= 0) {
    return unique;
  }
  return unique.slice(0, limit);
}
