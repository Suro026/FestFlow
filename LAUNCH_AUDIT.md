# Plansphere Launch Audit

Verified directly against the repository at
`C:\Users\user\Downloads\FestFlow-main\FestFlow-main`. No code was changed
to produce this report; every claim below cites the file that backs it.

Update (2026-09-28, later same day): item #1 below (CSP not enforced) has
since been fixed — see "security: enforce production CSP". The rest of this
audit reflects the state at the time it was first run and is otherwise
unchanged.

## Summary

- Total checklist items: 26
- Completed: 18 (was 17 — CSP enforcement landed after this audit was written)
- Remaining: 8
- Launch readiness: 69%

---

## Completed (Verified)

| Item | Status | Evidence |
|---|---|---|
| Privacy Policy page | Done | `src/app/privacy/page.tsx` |
| Terms & Conditions page | Done | `src/app/terms/page.tsx` |
| Cookie consent banner | Done | `src/components/consent.tsx` - real accept/reject banner (`ConsentBanner`), `role="dialog"`, persists to `localStorage`, reopenable from the footer (`ConsentSettingsLink`, wired in `src/components/shell/public-nav.tsx`) |
| HTTPS enforcement | Done | `next.config.ts` - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`; CSP's `upgrade-insecure-requests`; permanent `www.plansphere.in` -> `plansphere.in` redirect |
| **CSP headers enforced** | Done | `next.config.ts` - `Content-Security-Policy` (previously Report-Only; switched in "security: enforce production CSP") |
| Social preview image | Done | `src/app/opengraph-image.tsx` (site-wide) and `src/app/f/[festSlug]/opengraph-image.tsx` (per-fest) |
| robots.txt | Done | `src/app/robots.ts` - explicit allow/disallow lists, points at the sitemap |
| sitemap.xml | Done | `src/app/sitemap.ts` - static pages plus every published fest and its public events, generated dynamically, `revalidate = 3600` |
| Canonical URLs | Done (on pages that have metadata) | `src/app/f/[festSlug]/page.tsx` - `alternates: { canonical: absoluteUrl(...) }`; same pattern in `src/app/for-colleges/page.tsx`, `src/app/layout.tsx` |
| Favicon | Done | `public/icon.svg`, `public/favicon.ico`, `public/apple-icon.png`, `public/icon-32.png`, `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, all wired in `src/app/layout.tsx` |
| Mobile responsiveness | Done | `src/app/layout.tsx` sets `viewport: { width: "device-width", initialScale: 1, viewportFit: "cover" }`; responsive Tailwind (`sm:`/`lg:`) classes are used throughout every page in `src/app` |
| Lazy loading | Done | `src/components/ui/primitives.tsx` - `Artwork` renders every image with `loading="lazy" decoding="async"`; `src/components/scanner/camera.tsx` dynamically `import()`s `html5-qrcode` only when the camera actually starts, not on page load |
| Loading states | Done | Route-level `loading.tsx` for `/`, `/explore`, `/f/[festSlug]`, `/f/[festSlug]/e/[eventSlug]`, `/verify/[number]`, `/t/[ticketCode]`, `/live/[eventId]`; every data-fetching client page additionally uses its own `Skeleton` component (e.g. `src/app/admin/[festSlug]/certificates/page.tsx`) |
| Frontend secrets removed | Done | Client bundle only ever references `NEXT_PUBLIC_*` Firebase config (`src/data/firebase/client.ts`); `SUPABASE_SERVICE_ROLE_KEY` / `FIREBASE_SERVICE_ACCOUNT` are read only in `src/server/**`; the one client-visible mention of either name is literal help text in `src/app/admin/health/page.tsx`, not a value; `npm run scan:secrets` runs in CI (`.github/workflows/ci.yml`) |
| Form validation | Done | Every model has a Zod schema under `src/core/models/*.ts`; every privileged route validates its body through `readBody()` in `src/server/api.ts`, which turns a Zod failure into a 400; client forms use `zodResolver` (e.g. `src/app/register-event/page.tsx`) |
| Spam protection / rate limiting | Done | `src/server/rate-limit.ts` - a per-route policy table (auth, public, authenticated tiers) enforced by `handler()` in `src/server/api.ts`; Firebase App Check with monitor/enforce modes in `src/server/app-check.ts` |
| RBAC verification | Done | `src/core/permissions.ts` (role -> permission matrix, ownership-scoped capabilities); covered by `tests/unit/permissions.test.ts` and multiple emulator test suites under `tests/emulator/` |
| Custom 404 page | Done | `src/app/not-found.tsx` - branded page, `robots: { index: false }` |

## Remaining

### 1. `/register-event` and `/live` have no page-specific metadata
- Priority: High
- Why it's incomplete: Both are `"use client"` page components
  (`src/app/register-event/page.tsx`, `src/app/live/page.tsx`) with no
  sibling `layout.tsx`. A client component cannot export `metadata` in the
  App Router, so both fall back to the root layout's generic title,
  description and OG image (`src/app/layout.tsx`) instead of their own.
  Every other client-component page in the app already has this fixed with
  a small `layout.tsx` (e.g. `src/app/(auth)/sign-in/layout.tsx`) - these
  two are the outliers, and `/register-event` is the site's primary
  conversion page.
- Exact files: new `src/app/register-event/layout.tsx`, new
  `src/app/live/layout.tsx` (both trivial, following the existing
  `src/app/(auth)/sign-in/layout.tsx` pattern)
- Estimated time: 30-45 minutes.

### 2. Page speed: the ~450 kB "First Load JS" floor on every route
- Priority: High
- Why it's incomplete: `src/components/providers.tsx`'s `Providers`
  component calls `createRepositories()` unconditionally at the root
  layout, eagerly loading the full Firebase Auth + Firestore client SDK on
  every route - confirmed by production build output: `/terms` (158 B of
  its own code) still ships ~448 kB First Load JS, the same floor as every
  other route. This was identified and deliberately deferred in an earlier
  performance pass this session because fixing it means making
  `useRepositories()` lazy/async across roughly 100+ call sites - too large
  a blast radius to do safely without its own dedicated, separately-tested
  change.
- Exact files: `src/components/providers.tsx` (the `Providers` component's
  `createRepositories()` call), and by extension every consumer of
  `useRepositories()`/`useAuth()`
- Estimated time: 1-2 days, plus a full regression pass across the app
  (this is the single largest lever in the codebase for bundle size).

### 3. No Lighthouse run has actually been performed
- Priority: Medium
- Why it's incomplete: The underlying practices that Lighthouse rewards are
  in place (Server Components on public pages, code-split QR scanner,
  route-level loading states, HSTS, lazy-loaded images, an enforced CSP),
  but no live Lighthouse audit has been run against a deployed instance in
  this environment - there is no browser automation or network conditions
  available here to produce a real score, so "90+" is unverified either
  way.
- Exact files: none - this needs a deployed preview and either Chrome
  DevTools, `npx lighthouse`, or Lighthouse CI, not a code change.
- Estimated time: 1-2 hours to run and triage findings.

### 4. Image optimization happens at upload time, not at serve time
- Priority: Medium
- Why it's incomplete: Uploaded images are already compressed, stripped of
  EXIF, and bounded in dimension server-side via `sharp`
  (`src/server/storage/image.ts`). `next/image`'s automatic format
  negotiation and responsive `srcset` are deliberately not used for
  rendering, though - `src/components/ui/primitives.tsx`'s `Artwork`
  component documents why in its own comment: it renders any `https://` URL
  an admin pasted (`httpsUrlSchema` plus `ImageUploadField`'s `allowUrl`
  fallback), and `next/image` requires every remote hostname to be
  allow-listed in `next.config.ts`'s `images.remotePatterns` - the only way
  to satisfy that for an arbitrary pasted URL is a wildcard hostname
  pattern, which turns the image optimizer into an open proxy for whatever
  URL is pasted. This was investigated and reverted for that reason during
  an earlier pass this session.
- Exact files: `src/components/ui/primitives.tsx` (`Artwork`),
  `next.config.ts` (`images.remotePatterns`)
- Estimated time: 4-8 hours if pursued - e.g. restricting `next/image` to
  the known Supabase/Firebase hostnames and falling back to the current
  `<img>` path only for arbitrary pasted URLs.

### 5. No automated broken-link check has been run
- Priority: Medium
- Why it's incomplete: Spot checks of the primary navigation and CTA paths
  (home, for-colleges, register-event, explore) found no issues, but a full
  crawl of every internal link across roughly 70 routes was not performed -
  that requires actually rendering and following links, not static
  analysis.
- Exact files: none identified as broken; recommend adding a link checker
  (e.g. `lychee`, or a Playwright crawl) as a CI step or one-off pre-launch
  run.
- Estimated time: 2-3 hours to set up and run once.

### 6. Accessibility: contrast has never been programmatically checked
- Priority: Medium
- Why it's incomplete: ARIA attributes are used extensively (110
  occurrences across 60 files - dialogs, the consent banner, form fields
  all carry roles/labels), images carry `alt` props, and there's a
  skip-to-content link (`src/app/layout.tsx`). Colour contrast against the
  dark "Nocturne" theme's CSS custom properties has not been checked with
  any tool - that requires rendering the app and running something like
  `axe-core` or Lighthouse's accessibility audit, which static code review
  can't substitute for.
- Exact files: none identified as failing; recommend an `axe-core` or
  Lighthouse accessibility pass against the deployed app.
- Estimated time: 2-4 hours to audit and fix whatever it finds.

### 7. Minor CTA wording inconsistency
- Priority: Low
- Why it's incomplete: The homepage, `/for-colleges`, and `/register-event`
  consistently use "Register Your Event" / "Explore Events" as the
  primary/secondary CTA pair. `src/app/not-found.tsx` still uses the older
  "Browse fests" / "Home" wording on the 404 page.
- Exact files: `src/app/not-found.tsx`
- Estimated time: 5 minutes.

### 8. Meta title & description / OG-Twitter metadata: same root cause as #1
- Priority: High (tracked with #1 - same fix, same files)
- Why it's incomplete: This is the general form of item #1: every public
  page except `/register-event` and `/live` has explicit `metadata` or
  `generateMetadata` (verified 10 files: `src/app/page.tsx`,
  `src/app/for-colleges/page.tsx`, `src/app/privacy/page.tsx`,
  `src/app/terms/page.tsx`, `src/app/verify/page.tsx`,
  `src/app/verify/[number]/page.tsx`, `src/app/explore/page.tsx`,
  `src/app/f/[festSlug]/page.tsx`, `src/app/f/[festSlug]/e/[eventSlug]/page.tsx`,
  `src/app/t/[ticketCode]/page.tsx` - the last four generate OG/Twitter tags
  dynamically). The two gap pages fall back to the root's generic OG image
  and title.
- Exact files: same as #1.
- Estimated time: included in #1's estimate (one `layout.tsx` per page
  covers both the plain metadata and the OG/Twitter tags).

---

## Final roadmap (highest to lowest priority)

1. ~~Enforce CSP~~ - done (see "security: enforce production CSP").
2. Give `/register-event` and `/live` real metadata (#1 / #8) - High, and
   the cheapest high-priority fix on the list (~30-45 min).
3. Address the root-layout bundle-size floor (#2) - High impact on every
   single page's load time, but the largest, riskiest piece of work here;
   scope it as its own tracked project with full regression testing.
4. Run Lighthouse against a deployed preview (#3) - Medium; do this after
   #2 and #3 above so the numbers reflect the fixed state, not the current
   one.
5. Run an automated link check (#5) - Medium, cheap to set up, worth doing
   before announcing launch.
6. Run an accessibility contrast/axe pass (#6) - Medium.
7. Decide on `next/image` for the known-hostname case (#4) - Medium, lower
   urgency since the current approach already compresses/strips uploads;
   this is about serve-time format negotiation, not correctness.
8. Fix the 404 page's CTA wording (#7) - Low, do it opportunistically
   alongside any other pass through `not-found.tsx`.
