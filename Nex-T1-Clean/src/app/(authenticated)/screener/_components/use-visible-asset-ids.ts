"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MAX_LIVE_VISIBLE_IDS } from "./assets-table.constants";
import type { AssetRowRefSetter } from "./assets-table.types";

export function useVisibleAssetIds(assetIds: string[]): {
  setRowRef: AssetRowRefSetter;
  visibleIds: string[];
} {
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const visibleSet = useRef<Set<string>>(new Set());
  const updateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assetIdsSignature = assetIds.join("|");

  useEffect(() => {
    observerRef.current?.disconnect();
    visibleSet.current.clear();
    setVisibleIds([]);

    if (!assetIdsSignature) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        let hasChanges = false;

        for (const entry of entries) {
          const id = entry.target.getAttribute("data-asset-id");
          if (!id) {
            continue;
          }

          if (entry.isIntersecting) {
            if (!visibleSet.current.has(id)) {
              visibleSet.current.add(id);
              hasChanges = true;
            }
          } else if (visibleSet.current.delete(id)) {
            hasChanges = true;
          }
        }

        if (!hasChanges) {
          return;
        }

        if (updateTimeout.current) {
          clearTimeout(updateTimeout.current);
        }

        updateTimeout.current = setTimeout(() => {
          setVisibleIds(Array.from(visibleSet.current).slice(0, MAX_LIVE_VISIBLE_IDS));
        }, 300);
      },
      { rootMargin: "100px", threshold: 0.01 },
    );

    observerRef.current = observer;
    rowRefs.current.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }
    };
  }, [assetIdsSignature]);

  const setRowRef = useCallback<AssetRowRefSetter>((node, id) => {
    const observer = observerRef.current;
    const previousNode = rowRefs.current.get(id);

    if (previousNode && observer) {
      observer.unobserve(previousNode);
    }

    if (node) {
      rowRefs.current.set(id, node);
      observer?.observe(node);
      return;
    }

    rowRefs.current.delete(id);
    visibleSet.current.delete(id);
  }, []);

  return { visibleIds, setRowRef };
}
