import * as React from "react";

interface UseIsInViewOptions {
  inView?: boolean;
  inViewOnce?: boolean;
  inViewMargin?: string;
}

function useIsInView<T extends HTMLElement = HTMLElement>(
  ref: React.Ref<T>,
  options: UseIsInViewOptions = {},
) {
  const { inView, inViewOnce = false, inViewMargin = "0px" } = options;
  const localRef = React.useRef<T>(null);
  React.useImperativeHandle(ref, () => localRef.current as T);

  // In non-browser/test environments (or very old browsers) IntersectionObserver may be missing.
  // Treat as "in view" so callers degrade gracefully instead of crashing.
  const [inViewResult, setInViewResult] = React.useState(() => {
    if (!inView) return true;
    if (typeof window === "undefined" || typeof window.IntersectionObserver === "undefined") return true;
    return false;
  });

  React.useEffect(() => {
    if (!inView) {
      setInViewResult(true);
      return;
    }

    const el = localRef.current;
    if (!el) return;

    if (typeof window === "undefined" || typeof window.IntersectionObserver === "undefined") {
      setInViewResult(true);
      return;
    }

    setInViewResult(false);

    let didSetOnce = false;
    const observer = new window.IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting) {
          setInViewResult(true);
          if (inViewOnce && !didSetOnce) {
            didSetOnce = true;
            observer.disconnect();
          }
          return;
        }

        // If once=true, don't revert after the first time we become visible.
        if (!inViewOnce) setInViewResult(false);
      },
      { root: null, rootMargin: inViewMargin, threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, inViewMargin, inViewOnce]);

  const isInView = !inView || inViewResult;
  return { ref: localRef, isInView };
}

export { useIsInView, type UseIsInViewOptions };
