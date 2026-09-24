# Plansphere

Multi-fest campus event platform — registrations, QR tickets, gate and meal
scanning, results and publicly verifiable certificates. Web today, Expo app
next, sharing the same Firestore collections and the same `src/core`.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Firebase Auth + Firestore + Storage · Zod · react-query.

## Layout

```
src/
  core/          Platform-agnostic: Zod models, repository interfaces,
                 business rules (certificate eligibility, registration checks).
                 No imports from next, react or firebase — reused by Expo as-is.
  data/          Firestore implementations of the repositories + the auth service.
                 The only code that knows Firebase exists.
  server/        Admin SDK, route authorisation, email service. Server only.
  app/           Routes. Public pages render on the server through the same
                 repositories; privileged writes go through app/api.
  components/    UI. The "Nocturne" design system lives in app/globals.css.
firestore.rules  The real access-control boundary. Roles come from Auth custom
                 claims; every collection is denied unless opened deliberately.
```

## Run locally

```bash
npm ci
cp .env.example .env.local        # then fill in the Firebase web config
npm run dev                       # http://localhost:3000
```

Useful scripts:

| Script | What it does |
|---|---|
| `npm run verify:admin` | Checks `FIREBASE_SERVICE_ACCOUNT` parses and can reach Auth + Firestore |
| `npm run grant-super-admin -- you@college.edu` | Seeds the first super admin (staff accounts are invite-only) |
| `npm run seed:demo` | Writes demo fests/events so the pages have something to show |
| `npm run firebase:deploy` | Deploys `firestore.rules`, `storage.rules` and indexes via the service account — no `firebase login` needed |
| `npm audit` | Dependency advisories; `package.json` `overrides` pin `uuid`/`postcss` to patched lines inside `firebase-admin`/`next` (see `docs/SECURITY-ENV.md`) |
| `npm run scan:secrets` | Fails on any secret-shaped string in tracked files (also a CI step); `-- --history` scans every commit. See `docs/SECURITY-ENV.md` |
| `npm run verify:infra` | Confirms the composite indexes are live, the Storage bucket exists, and the Storage rules admit/refuse the right uploads; prints one-click console links for anything missing |
| `npm test` | Unit and component tests (Vitest + Testing Library, jsdom) |
| `npm run test:emulator` | Rules, repository and API-transaction tests against the Firebase emulators (needs Java 21) |
| `npm run build` | Production build; also what Vercel runs |

CI (`.github/workflows/ci.yml`) runs typecheck → lint → unit tests → emulator
tests → `next build` on every pull request and push to `main`. Make the
`ci` check required in GitHub → Settings → Branches → `main` so nothing
merges red.

## Deploy (Vercel)

The repository root is the Next.js project. Vercel detects Next.js from
`package.json`; `vercel.json` pins it in case the project was previously
configured for another framework.

**Project settings**

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Root Directory | `./` (repository root) |
| Build Command | `next build` (default) |
| Output Directory | *leave default* — **not** `dist` |
| Node.js Version | 20.x or later |

**Environment variables** (Project → Settings → Environment Variables, for
Production *and* Preview). Copy the names from `.env.example`.

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Public web config — Firebase console → Project settings → Your apps |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | optional |
| `NEXT_PUBLIC_APP_URL` | `https://plansphere.in` — used in emailed links |
| `FIREBASE_SERVICE_ACCOUNT` | **Secret.** Base64 of the service-account JSON. Bypasses all rules; never `NEXT_PUBLIC_` |
| `EMAIL_PROVIDER` | `resend` in production; `console` logs instead of sending (every send is still recorded in `emailLog`) |
| `RESEND_API_KEY` | **Secret.** From resend.com → API Keys, after verifying the `plansphere.in` domain (DKIM + SPF + DMARC records) |
| `EMAIL_FROM` | Defaults to `Plansphere <noreply@plansphere.in>` |
| `CRON_SECRET` | **Secret.** Any long random string; Vercel Cron presents it to `/api/cron/event-reminders` (daily 09:00 IST) |
| `NEXT_PUBLIC_SENTRY_DSN` | Enables Sentry (browser + server + edge). `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` additionally upload source maps at build |
| `NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY` | Enables Firebase App Check on the client; `APP_CHECK_ENFORCE=true` makes the API refuse calls without a valid token |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Shared rate-limit store; without them limits are per serverless instance |
| `RATE_LIMIT_OVERRIDES` | JSON per-bucket overrides for the rate-limit policy (`{"auth.login":{"limit":10}}`); `RATE_LIMIT_DISABLED=1` switches limiting off in an incident |

`GET /api/health` (JSON) and `/admin/health` (super admins) report every check
above, plus environment validation and which of these features are on.

The build does not fail when the Firebase variables are missing — pages render
empty and the build log prints one `[plansphere] Firebase web config is missing`
line — but the site will not work until they are set. After adding variables,
trigger a redeploy; `NEXT_PUBLIC_*` values are inlined at build time.

**Firebase console, once**

1. Authentication → Settings → Authorized domains: add `plansphere.in`.
2. Authentication → Templates → Customize action URL: `https://plansphere.in/auth/action`.
3. Storage → Get started (creates the bucket), then `npm run firebase:deploy -- --rules`.
4. For the composite indexes used by the paginated admin tables, either grant
   the service account the *Cloud Datastore Index Admin* role in Google Cloud
   IAM and run `npm run firebase:deploy -- --indexes`, or run
   `npm run verify:infra` and click the six console links it prints. Public
   and student pages need no composite indexes.
5. `npm run verify:infra` until it reports 0 failed; `GET /api/health` on the
   deployed site reports the same checks from inside Vercel.

## Security model, in one paragraph

Roles (`student` → `organizer` → `admin` → `super_admin`) are custom claims on
the Auth token, granted only by `POST /api/admin/staff` (super admin only).
Firestore rules trust the claim, never the profile document. Clients read
directly and write only what the rules allow; anything that must be atomic
or privileged — registration with capacity, results, certificates, staff —
goes through `app/api`, where `requireRole` verifies the token with
revocation checking and re-reads the account's `disabled` flag on every call.
