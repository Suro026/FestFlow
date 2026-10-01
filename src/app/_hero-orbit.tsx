"use client";

import * as React from "react";
import { ArrowRight } from "@phosphor-icons/react";

export interface OrbitFeature {
  eyebrow: string;
  title: string;
  copy: string;
  icon: string;
}

/**
 * The reference's rotating hero visual (github.com/Xioonnox/plansphere,
 * client/src/index.css `.hero-orbit-art` + `.sphere-feature`), reproduced
 * structurally and mechanically:
 *
 *   - the frame rotates 90deg per feature (CSS transform, 0.95s easing)
 *   - the inner layer counter-rotates the opposite direction, so it stays
 *     upright while the frame turns
 *   - one ring spins continuously (18s linear) — everything else is static
 *   - three feature cards are all in the DOM; only the active one is at
 *     full opacity, the rest are dimmed and scaled down, and each is
 *     independently clickable to jump to it
 *   - advances on its own every 4.2s, exactly like the reference
 *
 * Two adaptations, not simplifications:
 *   - the reference's inner layer is a photograph hosted on its own
 *     platform storage, not a Plansphere asset — reproduced here as a
 *     generated abstract pattern (the same dot-field technique HeroField
 *     already uses) instead of borrowing someone else's image.
 *   - the whole assembly is built at the reference's exact 605px design
 *     size, then scaled down with a single `transform: scale()` to fit
 *     the width Plansphere's hero grid actually has free — the same
 *     technique the reference's own mobile breakpoint uses on itself.
 *
 * `prefers-reduced-motion` disables the continuous ring spin, the
 * auto-advance interval, and the rotation/opacity transitions.
 *
 * Sizing is driven by the `--orbit-scale` CSS custom property, not a JS
 * prop — the caller sets it per breakpoint with ordinary responsive
 * Tailwind classes (`[--orbit-scale:0.32] sm:[--orbit-scale:0.4] ...`),
 * the same way the reference's own `.hero-orbit-art` is scaled down at
 * its mobile breakpoints with nothing but CSS.
 */
export const HeroOrbit = ({ features }: { features: readonly OrbitFeature[] }) => {
  const [active, setActive] = React.useState(0);
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  React.useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => setActive((f) => (f + 1) % features.length), 4200);
    return () => window.clearInterval(timer);
  }, [features.length, reduceMotion]);

  const advance = () => setActive((f) => (f + 1) % features.length);

  const transitionStyle = reduceMotion ? "none" : "transform 0.95s cubic-bezier(0.23,1,0.32,1)";

  return (
    <div style={{ width: "calc(605px * var(--orbit-scale, 1))", height: "calc(605px * var(--orbit-scale, 1))" }} className="relative">
      <div
        role="button"
        tabIndex={0}
        aria-label="Cycle through Plansphere's stages"
        onClick={advance}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            advance();
          }
        }}
        className="group absolute left-0 top-0 origin-top-left cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-text"
        style={{ width: 605, height: 605, transform: "scale(var(--orbit-scale, 1))" }}
      >
        {/* back + main circle */}
        <div className="absolute rounded-full bg-neutral-800" style={{ width: 520, height: 520, top: 45, left: 20 }} aria-hidden />
        <div
          className="absolute overflow-hidden rounded-full bg-text"
          style={{ width: 420, height: 420, top: 105, left: 71, boxShadow: "30px 25px 0 var(--color-accent-fill)", transform: `rotate(${active * 90}deg)`, transition: transitionStyle }}
          aria-hidden
        >
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at 55% 45%, rgba(255,255,255,.22), transparent 45%)" }}
          />
        </div>

        {/* counter-rotating inner layer — a generated pattern, not a borrowed photo */}
        <div
          className="absolute overflow-hidden rounded-full"
          style={{ width: 300, height: 300, top: 165, left: 131, transform: `rotate(${active * -90}deg)`, transition: transitionStyle }}
          aria-hidden
        >
          <OrbitTexture />
        </div>

        {/* rings */}
        <div className="absolute rounded-full border border-divider" style={{ width: 700, height: 240, top: 186, left: -50, transform: "rotate(-32deg)" }} aria-hidden />
        <div className="absolute rounded-full border border-divider" style={{ width: 540, height: 820, top: -103, left: 25, transform: "rotate(28deg)" }} aria-hidden />
        <div
          className="absolute rounded-full border border-[color:color-mix(in_srgb,var(--color-accent-fill)_55%,transparent)]"
          style={{ width: 760, height: 310, top: 160, left: -84, transform: "rotate(63deg)", animation: reduceMotion ? "none" : "hero-orbit-spin 18s linear infinite" }}
          aria-hidden
        />

        {/* crosshair + dots */}
        <div className="absolute rounded-full border border-text" style={{ width: 17, height: 17, top: 48, right: 88 }} aria-hidden>
          <span className="absolute bg-text" style={{ width: 28, height: 1, top: 7, left: -6 }} />
          <span className="absolute bg-text" style={{ width: 1, height: 28, left: 7, top: -6 }} />
        </div>
        <span className="absolute rounded-full bg-accent-fill" style={{ width: 8, height: 8, left: 102, top: 185 }} aria-hidden />
        <span className="absolute rounded-full bg-text ring-2 ring-accent-fill" style={{ width: 8, height: 8, right: 60, bottom: 141 }} aria-hidden />

        {/* micro labels */}
        <div className="absolute flex w-full items-center justify-between text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-600" style={{ top: 39 }} aria-hidden>
          <span>PS / 2026</span>
          <span>0{active + 1} — 03</span>
        </div>
        <div className="absolute text-[9px] font-bold uppercase leading-[1.35] tracking-[0.14em] text-neutral-600" style={{ bottom: 70, left: 60, width: "calc(100% - 120px)" }} aria-hidden>
          Everything in motion ↗
        </div>

        {/* feature cards — all three exist; only the active one is prominent */}
        {features.map((feature, index) => (
          <button
            key={feature.eyebrow}
            type="button"
            aria-label={`Show ${feature.title}`}
            onClick={(e) => {
              e.stopPropagation();
              setActive(index);
            }}
            className="absolute z-[7] flex w-[170px] cursor-pointer items-start gap-2 rounded-[3px] border p-2.5 text-left"
            style={{
              ...FEATURE_POSITION[index],
              background: "color-mix(in srgb, var(--color-text) 92%, transparent)",
              borderColor: index === active ? "var(--color-accent-fill)" : "color-mix(in srgb, var(--color-accent-fill) 30%, transparent)",
              boxShadow: index === active ? "8px 8px 0 color-mix(in srgb, var(--color-accent-fill) 28%, transparent)" : "none",
              opacity: index === active ? 1 : 0.14,
              transform: index === active ? "translateY(0) scale(1)" : "translateY(10px) scale(0.94)",
              transition: reduceMotion ? "none" : "opacity 0.5s ease, transform 0.7s cubic-bezier(0.23,1,0.32,1), border-color 0.4s ease",
              pointerEvents: "auto",
            }}
          >
            <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-accent-fill text-[12px] text-text">{feature.icon}</span>
            <span className="flex flex-col">
              <b className="text-[7px] font-normal tracking-[0.12em] text-neutral-700">{feature.eyebrow}</b>
              <strong className="mt-[3px] font-display text-[16px] font-medium tracking-[-0.05em] text-bg">{feature.title}</strong>
              <small className="mt-1 text-[8px] leading-[1.35] text-neutral-600">{feature.copy}</small>
            </span>
          </button>
        ))}

        {/* click-to-rotate hint */}
        <div
          className="absolute z-[8] flex items-center gap-[5px] text-[8px] uppercase tracking-[0.11em] text-neutral-600 opacity-70 transition-opacity"
          style={{ right: 83, bottom: 42 }}
          aria-hidden
        >
          <span>Click to rotate</span>
          <ArrowRight size={12} className="text-accent transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>

      <style>{`
        @keyframes hero-orbit-spin { to { transform: rotate(423deg); } }
      `}</style>
    </div>
  );
};

const FEATURE_POSITION: Record<number, React.CSSProperties> = {
  0: { left: -7, top: 126 },
  1: { right: -35, top: 225 },
  2: { right: -8, bottom: 96 },
};

/** A quiet generated texture standing in for the reference's photograph —
 *  concentric dots fading from the center, in the accent hue. Deterministic
 *  (no Math.random) so server and client markup match. */
const OrbitTexture = () => {
  // Rounded to 2dp: the raw floating-point results of Math.cos/sin/PI can
  // differ in their last bit between the server's and the browser's JS
  // engine, which serializes to a different string and trips a hydration
  // mismatch even though the seed and formula are identical. Rounding
  // collapses both to the same printed value.
  const round = (n: number) => Math.round(n * 100) / 100;
  const dots: Array<{ x: number; y: number; r: number; o: number }> = [];
  let v = 11;
  const rnd = () => ((v = (v * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 60; i += 1) {
    const angle = rnd() * Math.PI * 2;
    const radius = rnd() * 150;
    dots.push({ x: round(150 + Math.cos(angle) * radius), y: round(150 + Math.sin(angle) * radius), r: round(1 + rnd() * 2.4), o: round(0.15 + rnd() * 0.5) });
  }
  return (
    <svg viewBox="0 0 300 300" className="h-full w-full" aria-hidden focusable="false">
      <rect width="300" height="300" fill="var(--color-text)" />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="var(--color-accent-fill)" opacity={d.o} />
      ))}
    </svg>
  );
};
