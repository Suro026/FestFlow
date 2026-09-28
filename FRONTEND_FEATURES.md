# Plansphere — Frontend Feature Inventory

Generated from the actual `src/app` route tree and this session's work. Every
item marked Built has a real route/component behind it today.

## 1. Public / Marketing

| Feature | Route |
|---|---|
| Landing page | `/` |
| Explore fests | `/explore` |
| Fest page | `/f/[festSlug]` |
| Event page | `/f/[festSlug]/e/[eventSlug]` |
| For colleges | `/for-colleges` |
| Register event wizard | `/register-event` |
| Live listing | `/live` |
| Live event dashboard | `/live/[eventId]` |
| Verify | `/verify`, `/verify/[number]` |
| Ticket lookup | `/t/[ticketCode]` |
| Terms / Privacy | `/terms`, `/privacy` |

## 2. Auth & Onboarding

| Feature | Route |
|---|---|
| Sign in | `/sign-in` |
| Create account | `/create-account` |
| Forgot / change password | `/forgot-password`, `/change-password` |
| Set password | `/set-password` |
| Complete profile | `/complete-profile` |
| Verify email | `/verify-email` |
| Auth action handler | `/auth/action` |

## 3. Student

| Feature | Route |
|---|---|
| My registrations | `/my-registrations` |
| Registration confirmation | `/registered/[registrationId]` |
| My events | `/my-events` |
| My teams | `/teams` |
| My pass | `/my-pass` |
| My certificates | `/certificates` |
| Notifications | `/notifications` |
| Profile | `/profile` |

## 4. Event Head / Admin (`/admin/[festSlug]/...`)

| Feature | Route |
|---|---|
| Overview | `.../overview` |
| Settings | `.../settings` |
| Events list | `.../events` |
| New event wizard | `.../events/new` |
| Event settings | `.../events/[eventSlug]/settings` |
| Event registrations | `.../events/[eventSlug]/registrations` |
| Event results | `.../events/[eventSlug]/results` |
| Event analytics | `.../events/[eventSlug]/analytics` |
| Event live console | `.../events/[eventSlug]/live` |
| Fest-wide registrations | `.../registrations` |
| Fest-wide analytics | `.../analytics` |
| Gate | `.../gate` |
| Volunteers | `.../volunteers` |
| Staff (Event Head can invite co-admins for own fest) | `.../staff` |
| Arenas | `.../arenas` |
| Live console | `.../console` |
| Certificate Center (4-stage pipeline) | `.../certificates` |
| Fest picker | `/admin`, `/admin/fests` |
| Admin profile | `/admin/profile` |

## 5. Volunteer

| Feature | Route |
|---|---|
| Home | `/volunteer` |
| Fest-scoped home | `/volunteer/[festSlug]` |
| Shift detail | `/volunteer/[festSlug]/shifts/[shiftId]` |
| Team | `/volunteer/[festSlug]/team` |
| Scanner | `/scan`, `/volunteer/scan`, `/volunteer/[festSlug]/scan` |
| Live scoring console | `/volunteer/live`, `/volunteer/[festSlug]/live` |
| Profile | `/volunteer/profile` |

## 6. Platform / Super Admin

| Feature | Route |
|---|---|
| Platform home | `/admin/platform` |
| All fests | `/admin/platform/fests` |
| All admins | `/admin/platform/admins` |
| Certificate release centre | `/admin/platform/certificates` |
| Platform analytics | `/admin/platform/analytics` |
| Platform audit | `/admin/platform/audit` |
| Platform profile | `/admin/platform/profile` |
| Reports | `/admin/reports` |
| Super analytics/audit | `/super/analytics`, `/super/audit` |
| Health dashboard | `/admin/health` |

## 7. Cross-cutting systems

- RBAC: Platform Super Admin -> Admin (event-scoped, incl. self-service owners) -> Volunteer -> Student
- Self-service event registration -> instant admin ownership of that fest
- QR ticketing (issue, scan, offline sync)
- Live Event Engine (brackets, per-sport scoring, live push updates)
- Certificate generation, PDF render, public verification
- Certificate storage (Supabase Storage)
- Email delivery (Resend) with delivery log + retry
- In-app notifications
- Audit log
- Rate limiting on privileged routes
- App Check / bot protection
- Sentry error monitoring

## Known gaps / recommended next work

1. Full landing-page visual redesign (six-step diagram, role-hierarchy graphic
   as live UI) - only hero/cards/roles copy on `/` shipped in code so far.
2. Certificate-template upload on `/register-event`'s flow is super-admin
   only today (certificate:publish permission + certificateTemplate upload
   policy) - giving an Event Head their own template needs an RBAC decision.
3. Root bundle size: `src/components/providers.tsx` eagerly loads the full
   Firebase Auth + Firestore client SDK on every route via
   createRepositories() - fixing it means making useRepositories() lazy
   across ~100+ call sites.
4. Open product questions: fest-ownership transfer flow, orphaned-fest
   handling on account deletion, whether self-registered fests need any
   verification before public listing.

Generated 2026-09-28 from the live route tree at src/app/**/page.tsx plus
this session's implementation history.
