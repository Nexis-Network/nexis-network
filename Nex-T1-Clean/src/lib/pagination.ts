/**
 * Cursor-based pagination for in-memory arrays.
 * Returns a page of items and the next cursor (null if no more pages).
 */
export function paginateList<T>(
  items: T[],
  cursor: number,
  limit: number,
): { items: T[]; nextCursor: number | null } {
  const start = Math.max(0, cursor);
  const slice = items.slice(start, start + limit);
  // If we have more items than the current slice covers
  const nextCursor = start + limit < items.length ? start + limit : null;
  return { items: slice, nextCursor };
}
