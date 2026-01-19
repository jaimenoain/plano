import { useEffect, useState } from "react";

export function useIntersectionObserver(
  options: IntersectionObserverInit = {
    root: null,
    rootMargin: "0px",
    threshold: 0,
  }
) {
  const [ref, setRef] = useState<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      options
    );

    observer.observe(ref);

    return () => {
      observer.disconnect();
    };
  }, [ref, options.root, options.rootMargin, options.threshold]);

  return { containerRef: setRef, isVisible };
}
