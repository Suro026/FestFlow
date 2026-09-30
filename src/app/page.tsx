import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowDown, ArrowRight, ArrowUpRight, Gear, QrCode, Trophy } from "@phosphor-icons/react/dist/ssr";
import { PublicFooter, PublicNav } from "@/components/shell/public-nav";
import { HeroField } from "@/components/ui/primitives";
import HomeStats, { HomeStatsFallback } from "./_home-stats";

/** The event lifecycle, in the order it actually happens. */
const LIFECYCLE = [
  { kick: "Before", title: "Register & Configure", body: "Create your event, branding, competitions, schedules and registration forms.", icon: Gear },
  { kick: "During", title: "Run Live Operations", body: "QR gate entry, volunteer management, offline scanning and live scoring.", icon: QrCode },
  { kick: "After", title: "Results & Certificates", body: "Publish results and automatically generate verified certificates.", icon: Trophy },
] as const;

/** Who does what, top to bottom — authority flows one way. */
const ROLES = [
  { role: "Event Head", does: "Creates the event and becomes Event Super Admin." },
  { role: "Super Admin", does: "Creates Admin accounts for the event." },
  { role: "Admin", does: "Manages registrations, volunteers, results and certificates." },
  { role: "Volunteer", does: "Handles QR entry, meals and live arenas." },
  { role: "Student", does: "Explores, registers and downloads certificates." },
] as const;

export const metadata: Metadata = {
  title: "Plansphere — Create. Host. Run Every Event.",
};

// Public data; a minute of staleness is fine and keeps Firestore reads low.
export const revalidate = 60;

/** A muted tone that reads correctly against the dark (ink) sections below —
 *  the shared `text-neutral-*` utilities are tuned for text on the *bone*
 *  page background and go the wrong direction inside an inverted section,
 *  so these sections mix directly against `--color-bg` instead. */
const onDark = {
  body: "text-bg",
  mutedStrong: "text-[color:color-mix(in_srgb,var(--color-bg)_82%,transparent)]",
  muted: "text-[color:color-mix(in_srgb,var(--color-bg)_58%,transparent)]",
  divider: "border-[color:color-mix(in_srgb,var(--color-bg)_16%,transparent)]",
  cardBg: "bg-[color:color-mix(in_srgb,var(--color-bg)_6%,var(--color-text))]",
};

/**
 * The landing page. Composition follows the Plansphere reference
 * (github.com/Xioonnox/plansphere): a bone hero, alternating full-bleed
 * ink/bone/mint chapters, sharp hairline cards, tight display type. Every
 * word of copy, every route and every number is Plansphere's own — the
 * reference supplied the visual language, not the content.
 *
 * This component has no `await` of its own on purpose: it used to fetch
 * `fests` at the top before returning any JSX, which meant the *entire*
 * page — hero, H1 and all — sat behind that one Firestore call. A real
 * Lighthouse trace confirmed the H1 as the LCP element with LCP dominated
 * by render delay, not image or font load — exactly what a blocked render
 * looks like. The stat band and "Happening now" cards are the only part
 * that actually needs Firestore; they're isolated in `HomeStats` behind
 * their own `<Suspense>` below, so the hero renders immediately as plain
 * HTML instead of waiting on that boundary.
 */
export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicNav />

      <main id="main" className="flex flex-1 flex-col">
        {/* ─────────────────────────── Hero ─────────────────────────── */}
        <section className="relative overflow-hidden bg-bg" style={{ minHeight: 470 }}>
          <HeroField className="absolute inset-0 h-full w-full" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(100deg, var(--color-bg) 8%, color-mix(in srgb, var(--color-bg) 72%, transparent) 46%, transparent 88%)",
            }}
          />

          <div
            className="absolute left-1/2 top-[68px] hidden h-px w-[calc(100%-36px)] max-w-[1180px] -translate-x-1/2 bg-divider sm:block"
            aria-hidden
          />

          {/*
            The text column and the decorative art are grid siblings, not
            independently-absolute-positioned elements — at the previous
            attempt the art was positioned relative to the full-bleed
            section rather than the (narrower, capped) text column, so it
            overlapped the H1 at any viewport between ~640-1400px. A grid
            makes the overlap structurally impossible: each column gets its
            own track, and the art's column simply doesn't exist below `lg`.
          */}
          <div className="relative mx-auto w-full max-w-[1180px] px-[18px] pb-16 pt-10 sm:px-6 sm:pt-[92px] lg:px-10 xl:grid xl:grid-cols-[1fr_auto] xl:items-center xl:gap-10">
            <div className="max-w-[620px] lg:max-w-[720px]">
              <div className="mb-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-600 sm:hidden">
                Built for Colleges · Conferences · Sports · Festivals
              </div>
              <div className="mb-7 hidden items-center justify-between text-[9.5px] font-semibold uppercase tracking-[0.18em] text-neutral-600 sm:flex">
                <span>Plansphere / Platform</span>
                <span>Built for Colleges · Conferences · Sports · Festivals</span>
              </div>

              <h1 className="mb-5 text-[44px] leading-[0.9] tracking-[-0.045em] min-[431px]:text-[54px] sm:text-[76px] sm:leading-[0.85] sm:tracking-[-0.055em] lg:text-[88px]">
                Create. Host.
                <br />
                Run Every <em className="text-accent not-italic sm:text-emphasis">Event.</em>
              </h1>
              <p className="mb-[26px] max-w-[520px] text-[16px] text-neutral-400 sm:text-[17px]">
                Any Event Head can create an event in minutes, become its Super Admin, build their admin team, and manage
                registrations, QR entry, live operations, results and certificates from one platform.
              </p>
              <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
                <Link href="/register-event" className="btn btn-fill btn-lg gap-2">
                  Register Your Event <ArrowUpRight size={16} weight="bold" />
                </Link>
                <Link href="/explore" className="btn btn-secondary btn-lg">
                  Explore Events
                </Link>
              </div>
            </div>

            {/* Decorative orbit artwork — static CSS/SVG, no mousemove
                tracking, no animation loop. A grid column of its own at
                `xl`+ only: at `lg` (1024-1279px) the text column alone
                already needs its full 720px to keep "Run Every Event." on
                one line at 88px — the already-verified 2-line desktop
                composition — so there isn't reliable extra room for a side
                panel until xl. Hidden entirely below that rather than
                risking overlap or overflow. */}
            <div className="hidden xl:block" aria-hidden>
              <div className="relative h-[280px] w-[260px]">
                <div className="absolute inset-[9%] rounded-full bg-neutral-800/50" />
                <div className="absolute inset-[16%] rounded-full bg-text shadow-[var(--shadow-offset-lg)]" />
                <div
                  className="absolute inset-[2%] rounded-full border border-divider"
                  style={{ transform: "rotate(-28deg) scaleY(0.42)" }}
                />
                <div
                  className="absolute inset-[-6%] rounded-full border border-divider"
                  style={{ transform: "rotate(24deg) scaleY(0.56)" }}
                />
                <span className="absolute left-[10%] top-[64%] h-[6px] w-[6px] rounded-full bg-accent-fill" />
                <span className="absolute bottom-[14%] right-[8%] h-[6px] w-[6px] rounded-full bg-text ring-2 ring-accent-fill" />
                <div className="absolute -left-6 top-[34%] w-[150px] border border-[color:color-mix(in_srgb,var(--color-accent-fill)_35%,transparent)] bg-text p-2.5 text-bg shadow-[var(--shadow-offset-sm)]">
                  <div className="text-[7px] font-semibold uppercase tracking-[0.14em] text-accent-fill">
                    01 / Configure
                  </div>
                  <div className="mt-1 font-display text-[13px] leading-tight tracking-[-0.02em]">
                    {LIFECYCLE[0].title}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Link
            href="#lifecycle"
            className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-neutral-600 no-underline transition-colors duration-150 hover:text-accent sm:flex"
          >
            <span>Scroll</span>
            <ArrowDown size={13} />
          </Link>
        </section>

        {/* ───────────────────── Statement band (ink) ───────────────────── */}
        <section className={`bg-text ${onDark.body}`}>
          <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-8 px-[18px] py-[var(--section-marketing-mobile)] sm:px-6 lg:grid-cols-[0.8fr_1.4fr_0.8fr] lg:gap-11 lg:px-10 lg:py-[var(--section-marketing-desktop)]">
            <span className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${onDark.muted}`}>
              [ platform ]
            </span>
            <h2 className="text-[36px] leading-[0.95] tracking-[-0.03em] sm:text-[52px] sm:leading-[0.92] sm:tracking-[-0.04em]">
              {SITE_TAGLINE_HEADLINE}
            </h2>
            <p className={`max-w-[280px] text-[13px] leading-[1.65] ${onDark.mutedStrong}`}>{SITE_TAGLINE_SUPPORT}</p>
          </div>
        </section>

        {/* ───────────────────── Who does what (ink) ───────────────────── */}
        <section className={`bg-text ${onDark.body}`}>
          <div className="mx-auto w-full max-w-[1180px] px-[18px] py-[var(--section-marketing-mobile)] sm:px-6 lg:px-10 lg:py-[var(--section-marketing-desktop)]">
            <div className="mb-10 flex flex-col gap-5 lg:mb-14 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className={`mb-3 block text-[10px] font-semibold uppercase tracking-[0.16em] ${onDark.muted}`}>
                  Who does what
                </span>
                <h2 className="max-w-[520px] text-[34px] leading-[0.94] tracking-[-0.03em] sm:text-[46px] sm:leading-[0.9] sm:tracking-[-0.035em]">
                  Authority flows <span className={onDark.mutedStrong}>one way.</span>
                </h2>
              </div>
              <p className={`max-w-[260px] text-[12px] leading-[1.55] ${onDark.mutedStrong}`}>
                From the person who registered the event, down to the student who shows up. Nothing skips a step.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ROLES.map((r, i) => (
                <div
                  key={r.role}
                  className={`flex min-h-[168px] flex-col justify-between border p-5 transition-colors duration-200 hover:border-accent-fill ${onDark.divider} ${onDark.cardBg}`}
                >
                  <div className={`flex items-center justify-between text-[10px] uppercase tracking-[0.12em] ${onDark.muted}`}>
                    <span className="text-accent-fill">0{i + 1}</span>
                    <span>Role</span>
                  </div>
                  <div>
                    <h3 className="mb-1.5 font-display text-[21px] tracking-[-0.02em]">{r.role}</h3>
                    <p className={`text-[12px] leading-[1.5] ${onDark.mutedStrong}`}>{r.does}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────── The lifecycle (bone) ───────────────────── */}
        <section id="lifecycle" className="bg-bg">
          <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-10 px-[18px] py-[var(--section-marketing-mobile)] sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-10 lg:py-[var(--section-marketing-desktop)]">
            <div>
              <span className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-600">
                [ the lifecycle ]
              </span>
              <h2 className="text-[36px] leading-[0.92] tracking-[-0.03em] sm:text-[46px] sm:leading-[0.88] sm:tracking-[-0.035em]">
                From <em className="text-emphasis text-accent">registration</em>
                <br />
                to certificate.
              </h2>
              <p className="mt-5 max-w-[320px] text-[13px] leading-[1.65] text-neutral-500">
                One connected path through the whole event, for the Event Head who runs it and the student who shows up.
              </p>
            </div>

            <div className="border-t border-divider">
              {LIFECYCLE.map((c, i) => {
                const Icon = c.icon;
                return (
                  <div
                    key={c.kick}
                    className="grid grid-cols-[28px_40px_1fr_18px] items-center gap-3 border-b border-divider py-6 transition-[padding-left,color] duration-200 hover:pl-2.5 hover:text-accent sm:grid-cols-[32px_44px_1fr_20px] sm:gap-4"
                  >
                    <span className="font-display text-[11px] text-neutral-600">0{i + 1}</span>
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-divider text-neutral-600">
                      <Icon size={17} />
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <strong className="font-display text-[16px] font-medium tracking-[-0.02em] text-text sm:text-[18px]">
                        {c.title}
                      </strong>
                      <small className="text-[11px] leading-[1.4] text-neutral-500">{c.body}</small>
                    </span>
                    <ArrowRight className="justify-self-end text-neutral-600" size={15} />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ───────────── Real platform numbers + Happening now ───────────── */}
        <Suspense fallback={<HomeStatsFallback />}>
          <HomeStats />
        </Suspense>

        {/* ───────────────────── Closing CTA (mint) ───────────────────── */}
        <section className="bg-grid-lines bg-accent-fill text-text">
          <div className="mx-auto flex w-full max-w-[860px] flex-col items-center gap-6 px-[18px] py-[var(--section-marketing-mobile)] text-center sm:px-6 lg:py-[var(--section-marketing-desktop)]">
            <p className="text-[30px] leading-[0.98] tracking-[-0.03em] sm:text-[44px] sm:leading-[0.94] sm:tracking-[-0.035em]">
              Register your event. <em className="text-emphasis">Run it your way.</em>
            </p>
            <span className="text-[10px] uppercase tracking-[0.14em] text-neutral-300">
              No approval queue — you're its admin the moment you finish
            </span>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
              <Link href="/register-event" className="btn btn-primary btn-lg gap-2">
                Register Your Event <ArrowUpRight size={16} weight="bold" />
              </Link>
              <Link href="/explore" className="btn btn-secondary btn-lg">
                Explore Events
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

const SITE_TAGLINE_HEADLINE = (
  <>
    Every fest. <em className="text-emphasis text-accent-fill">One pass.</em>
  </>
);

const SITE_TAGLINE_SUPPORT =
  "Register once, show a QR at the gate, and keep every ticket, meal slot and certificate in one place.";
