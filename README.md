# CDS Pipeline Board

One shared, live record of every sales opportunity at Caspian Digital Solutions, from first lead to paid invoice, with the views the leadership team uses to run the fortnightly pipeline review.

Built as a multi-user web app on **Supabase** (database, logins, live updates) with a **React** front end. Access is email + password plus a 6-digit code emailed to the user; the database releases no data until both steps pass.

**Status: phases 1 to 3 of 10 are done** (project set-up, the database, and sign-in with the emailed code). The board's tabs are placeholders until phases 4 to 9. See `CURSOR_PROMPT.md` for the full specification and build order.

## What is in this repository

| Path | What it is |
|---|---|
| `src/` | The React app (Vite + TypeScript). Routes, app shell, design tokens, theme toggle, sign-in screens and the route guard (`src/lib/auth/`). |
| `e2e/` | End-to-end tests (Playwright) that run the real sign-in flow against the local stack. |
| `scripts/` | Local-development helpers: write `.env.local`, create test logins. |
| `src/lib/database.types.ts` | TypeScript types generated from the database schema. Do not edit by hand; run `npm run db:types`. |
| `supabase/migrations/20261002000000_init.sql` | The database: tables, security rules, automatic history and audit trail. Never edit after it has been applied; add a new migration instead. |
| `supabase/seed.sql` | Starting data from the 1 Oct 2026 meeting. |
| `supabase/functions/` | Three Edge Functions: `mfa-send` (emails the code), `mfa-verify` (checks it), `admin-invite` (invites a colleague). `.env.development` holds the local-only settings that make `mfa-send` print codes instead of emailing them. |
| `supabase/tests/` | Database security tests (pgTAP). Prove that signed-out visitors, unverified sessions, viewers, editors and deactivated users can only do what the rules allow. |
| `supabase/config.toml` | Local Supabase settings (sign-ups off, 10-character passwords, email confirmation on). |
| `cds-pipeline-board.html` | The single-file prototype. Design and behaviour reference for every screen; opens in demo mode. |
| `CURSOR_PROMPT.md` | The full build specification. |
| `SETUP_GUIDE.md` | The original plain-language guide to creating the Supabase project, deploying the functions and inviting the first admin. |
| `.github/workflows/ci.yml` | Checks run on every push and pull request. |

## Running it locally

You need **Node.js 22** and **Docker** (for the local Supabase stack).

```bash
npm install
npx supabase start          # starts Postgres, Auth, the API and the functions runtime; applies the migration and seed
npm run db:env              # writes .env.local with the local URL and anon key
npm run db:users            # creates the test logins listed below
npm run functions:serve     # in a second terminal: serves the Edge Functions and prints sign-in codes
npm run dev                 # http://127.0.0.1:5917
```

(`npm run db:env` does what `cp .env.example .env.local` plus pasting the anon key would do.) Supabase Studio (a database browser) is at http://127.0.0.1:54323 and auth emails such as password resets land in Mailpit at http://127.0.0.1:54324.

The dev server runs on port **5917** on purpose, so it does not clash with other tools. Open it as `127.0.0.1:5917`, not `localhost`, because the functions only accept that origin locally.

### Signing in locally

| Login | Role | Password |
|---|---|---|
| `admin@caspiands.com` | admin (linked to the seed's "Bharg" owner) | `pipeline-local-2026` |
| `editor@caspiands.com` | editor | `pipeline-local-2026` |
| `viewer@caspiands.com` | viewer | `pipeline-local-2026` |
| `off@caspiands.com` | editor, access switched off | `pipeline-local-2026` |

After the password, the app asks for a 6-digit code. Locally nothing is emailed: with `RESEND_API_KEY` unset and `MFA_DEV_LOG_CODES=true` (both set in `supabase/functions/.env.development`), `mfa-send` prints the code in the terminal running `npm run functions:serve`:

```
[dev] sign-in code for admin@caspiands.com: 123456
```

`npm run functions:logs` shows the recent codes if that terminal is not to hand. Codes expire after 10 minutes, allow 5 wrong tries, and at most 5 can be requested per person per 15 minutes; a verified session lasts 12 hours. `MFA_DEV_LOG_CODES` must never be set in production.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the app for development. |
| `npm run build` | Typecheck and build the production bundle into `dist/`. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | TypeScript, no output. |
| `npm test` | Unit tests (Vitest). |
| `npm run test:e2e` | End-to-end tests (Playwright) against the running local stack; needs `functions:serve` running. First time: `npx playwright install chromium`. |
| `npm run format` / `format:check` | Prettier on `src/`. |
| `npm run db:start` / `db:stop` | Start or stop the local Supabase stack. |
| `npm run db:reset` | Wipe the local database and re-apply the migration and seed. |
| `npm run db:test` | Run the database security tests (see below). |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` from the local database. |
| `npm run db:env` | Write `.env.local` from the running local stack. |
| `npm run db:users` | Create (or re-apply) the local test logins. |
| `npm run functions:serve` | Serve the Edge Functions locally with `supabase/functions/.env.development`. |
| `npm run functions:logs` | Print recent sign-in codes from the functions log. |

### Database security tests

```bash
npm run db:test
```

This runs every file in `supabase/tests/` against the local stack with `supabase test db`. Each file is one scenario and rolls itself back, so the data is left as it was:

| File | Proves |
|---|---|
| `01_anon_reads_nothing` | A signed-out visitor cannot read or write any table. |
| `02_unverified_reads_only_own_profile` | A correct password with no emailed code reads nothing except the person's own profile row. |
| `03_viewer_cannot_write` | A viewer can read the board but every insert, update and delete is refused. |
| `04_editor_cannot_change_settings_or_roles` | An editor can add and change opportunities and prospects, but cannot touch the target, commitments, owners, roles or the audit log. |
| `05_deactivated_reads_nothing` | A login whose access is switched off reads nothing (apart from its own profile row) and cannot switch itself back on. |
| `06_session_binding_and_expiry` | Verification belongs to one login session and stops working when it expires. |
| `07_admin_controls` | Admins can do the things the others cannot, and the last active admin cannot be removed. |

Without Docker, the same files run with `psql` against any Postgres that has the migration applied and `pgtap` available:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres npm run db:test
```

## Environment variables

| Variable | Where | Meaning |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env.local` (dev), Vercel project settings (prod) | The Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | same | The **anon / public** key. Safe to ship to browsers: the database rules decide what it can see. |

Never put the **service-role** key anywhere in the front end, the repo or Vercel. It only belongs in the Edge Function secrets (`supabase/functions/.env`, copied from `supabase/functions/.env.example`, set with `supabase secrets set --env-file supabase/functions/.env`).

## Deploying

1. **Supabase project** in the Singapore region. Apply the migration and seed (`supabase link --project-ref …` then `supabase db push`, or paste the files into the SQL Editor). Set the Auth options listed in `CURSOR_PROMPT.md` section 9: sign-ups off, email confirmations on, minimum password length 10, leaked-password protection on, Site URL and redirect URLs limited to the app's domains, custom SMTP.
2. **Edge Functions**: fill `supabase/functions/.env`, set the secrets, then `supabase functions deploy mfa-send`, `mfa-verify` and `admin-invite`.
3. **Front end on Vercel**: import the repo, framework "Vite", build command `npm run build`, output `dist/`. Add the two `VITE_` variables. Security headers are added in a later phase.
4. **Scheduled clean-up**: with pg_cron enabled, `select cron.schedule('purge-mfa', '17 3 * * *', 'select public.purge_mfa_rows()');`.

`SETUP_GUIDE.md` walks through the same steps in more detail for a non-developer.

## Adding the first admin

Nobody can sign themselves up; every login starts as an invite.

1. Supabase dashboard → Authentication → Users → **Invite user** → the admin's work email. The database creates their profile automatically with the `viewer` role.
2. SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'admin@caspiands.com';
   ```
3. They open the invite email, set a password (10 characters or more), sign in and enter the emailed code. From **Team & access** they invite everyone else.

Locally, invite emails arrive in Mailpit (http://127.0.0.1:54324) rather than a real inbox.

## Conventions

- British English copy, currency RM, dates as `7 Oct 2026`, time zone Asia/Kuala_Lumpur for "today" and "overdue".
- Design tokens live in `src/styles/tokens.css` and are copied exactly from the prototype. Change the prototype first.
- Never edit an applied migration; add a new file under `supabase/migrations/`.
- Never store the service-role key in the front end.
