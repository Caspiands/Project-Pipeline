# Build prompt: CDS Pipeline Board (production system)

Paste everything below the line into Cursor (Agent mode) with this folder open as the workspace.

---

## 1. Your role and the goal

You are a senior full-stack engineer building a production web app for **Caspian Digital Solutions (CDS)**, a Malaysian digital marketing and technology agency. The app is the **CDS Pipeline Board**: one shared, live record of every sales opportunity in the company, from first lead to paid invoice, with the views the leadership team uses to run a fortnightly pipeline review.

It exists because of a specific failure. At the 1 October 2026 Q4 planning meeting, nobody could show a consolidated pipeline. Quotes sat in a sheet with no status, LOAs and pending contracts were known only through verbal updates, a 200-company prospect list from the SSM convention was never shared, and delivery could not plan resources. The board fixes that by being the one place everything gets logged. **Logging a row must take under a minute**, and every view is computed from what is logged.

Build it as a real multi-user system on **Supabase**. Access is email + password **plus a second step: a 6-digit one-time code emailed to the user**. No data is readable until both steps pass.

## 2. What is already in this folder (treat as the source of truth)

| Path | What it is | How to use it |
|---|---|---|
| `cds-pipeline-board.html` | Working single-file prototype: every screen, the sign-in and code flow, all calculations, and a demo mode. Already wired to Supabase through a backend adapter. | **Design and behaviour reference.** Match its layout, wording, colour tokens, typography and every calculation. Port its logic; do not reinvent it. |
| `supabase/migrations/20261002000000_init.sql` | Full schema: tables, enums, triggers, Row Level Security, realtime. Tested on Postgres 16. | Use as-is as the first migration. Add new migrations for any change; never edit this one after it is applied. |
| `supabase/seed.sql` | Starting data from the 1 Oct meeting (10 opportunities, people, target, commitments, first review). | Run once after the migration. |
| `supabase/functions/mfa-send`, `mfa-verify`, `admin-invite`, `_shared/common.ts` | Deno Edge Functions for the emailed code and for invites. Type-checked. | Deploy as-is; extend only if a requirement below needs it. |
| `supabase/functions/.env.example` | Secrets the functions need. | Copy to `.env` (never commit it). |

Read all of these fully before writing code.

## 3. Tech stack

- **Frontend:** React 18 + TypeScript + Vite. React Router for tabs (`/overview`, `/pipeline`, `/review`, `/prospects`, `/targets`, `/team`, plus `/sign-in`, `/verify`, `/reset`, `/set-password`).
- **Data:** `@supabase/supabase-js` v2, TanStack Query for fetching and caching, Supabase Realtime to invalidate queries on change.
- **Forms and validation:** react-hook-form + zod. Validate in the browser and rely on database constraints as the final check.
- **Styling:** CSS variables copied exactly from the prototype's `:root` and dark-mode blocks (light and dark both required). Tailwind is fine if it is configured to use those variables. Fonts: Archivo (headings), IBM Plex Sans (body), IBM Plex Mono (numbers).
- **Charts:** hand-drawn SVG components, as in the prototype (no chart library needed). Size them to their container with a `ResizeObserver` so text never scales.
- **Tests:** Vitest for logic, Playwright for end-to-end flows, pgTAP or plain SQL scripts for database policies.
- **Hosting:** Vercel (static build). Supabase project in the **Singapore** region.
- **Language and locale:** British English copy. Currency RM. Dates as `7 Oct 2026` (`en-GB`). Time zone Asia/Kuala_Lumpur for all "today" and "overdue" calculations.

## 4. Sign-in and the emailed code (MFA)

Supabase's built-in MFA supports authenticator apps and SMS, not email codes, so the second step is custom. The database and Edge Functions for it are already written. Implement the client exactly as follows.

### Flow

1. **Sign in** (`/sign-in`): email + password via `supabase.auth.signInWithPassword`. On wrong credentials show "That email and password do not match." Never reveal whether the email exists.
2. **Code** (`/verify`): immediately call the `mfa-send` function (once per session; remember in `sessionStorage` that it was sent so a reload does not resend). Show "We sent a 6-digit code to ad•••@caspiands.com. It expires in 10 minutes." One input, `inputmode="numeric"`, `autocomplete="one-time-code"`, auto-submits at 6 digits. Call `mfa-verify` with `{ code }`.
3. **Resend**: disabled for 60 seconds after each send, with a visible countdown. Show server messages as they come (rate limits return 429 with `retry_after`).
4. **Open the board** only when `rpc('my_mfa_status')` returns `verified: true`. Store nothing about verification in the browser; always ask the database.
5. **Session end**: verification lasts `MFA_SESSION_HOURS` (default 12). Schedule a timer for `expires_at`; when it passes, send the user back to `/verify` (not to sign-in) and show "Your verified session has ended. Enter a new code."
6. **Sign out** clears the session and returns to sign-in.
7. **Forgot password** (`/reset`): `resetPasswordForEmail` with `redirectTo` = the app's `/set-password`. Always show the same neutral message.
8. **Set password** (`/set-password`): reached from invite and recovery emails (`type=invite` or `type=recovery` in the URL, or the `PASSWORD_RECOVERY` auth event). Minimum 10 characters, typed twice. After saving, continue to the code step.
9. **Deactivated users**: if `my_mfa_status` returns no role, sign them out with "Your access is switched off or not set up yet. Contact the board admin."

### Server rules already enforced (do not weaken)

- Codes are 6 digits from a cryptographic random source, stored only as a SHA-256 hash with a secret pepper, bound to the user **and** the login session (`session_id` from the JWT).
- A code expires after 10 minutes, works once, and allows 5 wrong tries.
- At most 5 codes per user per 15 minutes; 60 seconds between resends.
- Only the newest code for a session is valid.
- Every Row Level Security policy requires `is_mfa_verified()`, so a stolen password alone exposes nothing.
- `mfa_challenges` and `mfa_verified_sessions` are invisible to clients.

## 5. Roles and permissions

Public sign-up is **off**. New logins only come from an admin invite.

| Action | Viewer | Editor | Admin |
|---|:-:|:-:|:-:|
| See all tabs except Team & access | ✓ | ✓ | ✓ |
| Add and edit opportunities and prospects, import prospects, move a prospect to the pipeline | | ✓ | ✓ |
| Delete an opportunity (soft delete: sets `deleted_at`) | | ✓ | ✓ |
| Mark a review done | | ✓ | ✓ |
| Change target, finance figure, commitments | | | ✓ |
| Invite people, change roles, switch access off, manage deal owners | | | ✓ |
| Read the audit log | | | ✓ |

Hide controls the user cannot use; the database still refuses them if called. At least one active admin must always exist (enforced by a trigger; show its message).

## 6. Data model (summary of the migration)

- **profiles**: one per login (role, active flag). Created by trigger when an auth user is created.
- **people**: deal owners. May exist without a login; linked to a profile by email.
- **settings**: single row: target year, annual target (RM), finance-reported revenue to date, as-of date.
- **commitments**: committed revenue per person per year.
- **opportunities**: account, item, segment (Tech / Agency / Mixed), owner, stage, value (RM, nullable when not known), revenue year, quote no. and date, LOA date, expected invoice month (stored as the first day of the month), expected delivery start, optional probability, next step / owner / date, link, notes. `stage_since`, `created_*` and `updated_*` are set by triggers; the client never sends them.
- **stage_history**: every stage change, written by trigger.
- **prospects**: companies with contact details and a colour status (white = not contacted, orange = needs work, yellow = interested but budget limited, green = ready to meet), optionally linked to the opportunity they became.
- **reviews**: one row per completed pipeline review. The latest one is the baseline for the Review tab.
- **audit_log**: every insert, update and delete on the main tables, with before and after values.

Stages, in order: Lead → Proposal → Quote sent → Verbal yes → LOA/PO → Invoiced → Paid, plus Lost. "Open" = Lead to LOA/PO. "Won" = Invoiced or Paid. "Verbal yes" exists on purpose: it shows deals that rest on a verbal promise without an LOA.

## 7. Screens and what each must do

Match the prototype screen for screen. Everything below must work with the filters in the top bar (segment, owner, revenue year, search) unless stated otherwise. The owner filter includes "Unassigned".

### Overview
1. **Target block** (company-wide, ignores filters): booked (finance figure), gap to target, LOA/PO in hand, gap after LOA/PO, all open pipeline for the target year. A stacked bar of booked + LOA + verbal yes + quote sent + lead/proposal, with the target as a marked line. The finance figure is **not** added to invoiced rows; say so in the copy.
2. **Six tiles**: open pipeline (with count of rows with no value), LOA/PO in hand, verbal yes without LOA, invoiced not paid, next steps overdue, open rows with no next-step date.
3. **By stage**: value and count per stage, bars in one hue getting darker by stage order; lost shown as a line of text.
4. **Expected invoices**: next six months by expected invoice month, split into target-year revenue (solid) and later-year work invoiced early (light). Show how many rows have no invoice month.
5. **By owner**: committed number, on board for the target year, LOA/won for the target year, open deals, open value, overdue next steps, open rows with no next step.

### Pipeline
Sortable table of every opportunity (all columns in the prototype), "show lost" toggle, stage filter, footer total. Clicking a row opens the side drawer form. The drawer shows created / updated by whom and the stage history. Days in stage = today minus `stage_since`; show "—" when unknown.

### Review
Header with the last review date and a "Mark review done now" button (editors and admins). Six lists: overdue next steps (oldest first, days overdue), moved stage since the review (from → to, when, by whom, from `stage_history`), added since the review, open and not updated since the review, starting in the next 60 days, verbal yes or LOA with no start date. Each item opens the drawer. Link to the CDS Tech Projects Board: `https://claude.ai/artifact/WM8QSCNFVFuy5P88C7D5Bv`.

### Prospects
Status bar and counts, table sorted green → yellow → orange → white, inline status change, add one, **paste from spreadsheet** (tab or comma separated; headers detected by name; status words mapped to colours; batch insert), and "Move to pipeline", which opens a prefilled new-opportunity drawer and links the prospect on save.

### Targets
Admins edit target year, annual target, finance revenue and as-of date, and each active person's commitment for the target year. Others see the values read-only.

### Team & access (admins only)
Logins table (role dropdown, active toggle), invite form (calls `admin-invite`), deal owners table (show-in-owner-lists toggle) and add-owner form.

### Also build (not in the prototype)
- **Audit log page** for admins: newest first, filter by table and person, expandable before/after view.
- **Export to CSV** of the filtered pipeline table, generated in the browser.
- **Idle timeout**: sign out after 30 minutes without activity, with a 60-second warning.

## 8. Rules that must not drift

- No AI scores, health ratings, red/amber/green or weighted forecasts anywhere. Show raw numbers and let people sort and filter. Probability is an optional typed field and never changes a total.
- Values are RM, shown as `RM 262K` / `RM 1.50m` in summaries and `262,000` in tables.
- A row's revenue year decides which year's target it counts towards, not its invoice date.
- Values left blank stay blank (null), never zero.
- "Overdue" = open row whose next-step date is before today in Kuala Lumpur time.
- All copy is plain, direct British English. Reuse the prototype's wording.

## 9. Security checklist (must all pass before go-live)

- The service-role key exists only in Edge Function secrets, never in the frontend, the repo or Vercel env vars exposed to the client.
- RLS is on for every table; write SQL tests proving: anon reads nothing; a signed-in but unverified session reads nothing except its own profile; a viewer cannot write; an editor cannot change settings or roles; a deactivated user reads nothing.
- Supabase Auth settings: sign-ups disabled; email confirmations on; minimum password length 10; leaked-password protection on; Site URL and redirect URLs limited to the production and preview domains; custom SMTP configured (the built-in sender is rate-limited).
- CORS on the functions limited to the app domains (`ALLOWED_ORIGIN`).
- Invites limited to `ALLOWED_EMAIL_DOMAINS`.
- Every user-entered string is rendered as text, never as HTML. Links must start with `https://`.
- Security headers on Vercel: Content-Security-Policy (self, Supabase URL, Google Fonts), `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- `purge_mfa_rows()` scheduled daily with pg_cron.

## 10. Build order

Work in this order and stop after each phase to show me what changed and how to check it.

1. **Project setup**: Vite + React + TS app, Supabase client, environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), routing, design tokens, fonts, light/dark themes.
2. **Database**: apply the migration and seed to a local Supabase (`supabase start`), write the RLS tests, generate TypeScript types (`supabase gen types typescript`).
3. **Auth + emailed code**: all auth screens and the route guard. Locally, have `mfa-send` log the code to the function console when `RESEND_API_KEY` is unset and `MFA_DEV_LOG_CODES=true` (local only; never in production), or use a Resend test key. Playwright test: sign in → wrong code → right code → board → reload stays in → sign out.
4. **Pipeline tab and drawer**: create, edit, soft delete, stage change writes history.
5. **Overview** with all five blocks and the filters.
6. **Review tab** and "Mark review done".
7. **Prospects** including paste import and move to pipeline.
8. **Targets** and **Team & access** (invite end to end).
9. **Audit log, CSV export, idle timeout.**
10. **Hardening and deploy**: security checklist, headers, Vercel project, production Supabase, run seed, invite the team.

## 11. Definition of done

- Every screen in the prototype exists with the same numbers for the same data (check against demo mode in `cds-pipeline-board.html`).
- Two browsers signed in as different users see each other's changes within 2 seconds.
- Works at 400 px width with no sideways scrolling of the page (tables scroll inside their box).
- Keyboard-only use works: tab order, visible focus, Enter opens a row, Escape closes the drawer.
- All tests pass in CI (GitHub Actions: lint, typecheck, Vitest, Playwright against local Supabase).
- A `README` in the repo explains setup, environment variables, deploy and how to add an admin.

## 12. Out of scope for now (do not build unless asked)

Authenticator-app MFA, Jira or finance-system integrations, email notifications for overdue steps, file attachments, multi-currency.

## 13. How to work with me

I am not a developer. When you need a decision, give me two or three options in plain language with your recommendation first. When you finish a phase, tell me in a few lines what I can now click and see. Do not change the database rules, the code flow or the calculations without asking.
