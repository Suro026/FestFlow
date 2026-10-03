"use client";

// cache-bust: forces a fresh recompile of this module and its RSC
// client-reference entry, to rule out a stale incremental-build cache.
import * as React from "react";

/**
 * Counts up to `value` once on mount and again whenever `value` changes
 * (e.g. a live-polling dashboard) — the dashboard's own "statistics" moment
 * from the design brief. Formats with the same `en-IN` grouping as
 * `formatCount` so callers can pass a raw number straight from the API.
 *
 * `prefers-reduced-motion` is handled for free: the global rule in
 * globals.css forces every `transition`/`animation` duration to ~0, which
 * also collapses `requestAnimationFrame`-driven easing below to effectively
 * one frame — but to be certain under that preference (rAF isn't CSS-gated),
 * this reads the media query directly and jumps straight to the final value.
 *
 * Isolated in its own client file (rather than living inline in
 * `primitives.tsx`) because it's the one piece of `Kpi` that needs hooks:
 * `primitives.tsx` itself has no "use client", so every Server Component
 * that renders `<Kpi>` (e.g. the public fest page) can keep doing so — only
 * this leaf actually crosses into client code.
 */
export const CountUp = ({ value }: { value: number }) => {
  const [display, setDisplay] = React.useState(value);
  const fromRef = React.useRef(value);

  React.useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    if (reduceMotion || from === value || !Number.isFinite(value)) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const duration = 600;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{new Intl.NumberFormat("en-IN").format(display)}</>;
};
