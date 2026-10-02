# CDS Pipeline Board: setup guide

This folder has everything needed to run the CDS Pipeline Board as a real system: sign-in with an emailed code, a shared database, and the board itself.

## What is in the folder

| File | What it does |
|---|---|
| `cds-pipeline-board.html` | The whole board in one file. Opens in **demo mode** until you add your Supabase details (any email and password work; the code is `000000`). |
| `CURSOR_PROMPT.md` | The prompt to give Cursor so it builds the full production app from this folder. |
| `supabase/migrations/…_init.sql` | Creates the database: tables, security rules, automatic history and audit trail. |
| `supabase/seed.sql` | Loads the starting data from the 1 Oct 2026 meeting. |
| `supabase/functions/` | Three small server programs: send the code, check the code, invite a colleague. |
| `supabase/functions/.env.example` | The secret settings those programs need. |

## How sign-in works

1. The person types their work email and password.
2. The system emails them a 6-digit code (valid 10 minutes, works once, 5 tries).
3. They type the code. Only then does the database release any data.
4. The check lasts 12 hours, then they enter a new code. Signing in on a new device always needs a new code.

Nobody can sign themselves up. An admin invites each person from the **Team & access** tab, and they set their own password from the invite email.

## Setting it up (about an hour, once)

You can hand steps 1–6 to a developer or to Cursor. They are written so you can also follow them yourself.

**1. Create the Supabase project**
Sign up at supabase.com, create a project called `cds-pipeline`, region **Southeast Asia (Singapore)**. Save the database password somewhere safe.

**2. Set up sign-in rules** (Supabase dashboard → Authentication)
- Sign In / Providers → Email: keep **Email** on, turn **Allow new users to sign up** off, keep **Confirm email** on, set minimum password length to 10.
- URL Configuration: set **Site URL** to the address where the board will live (for example `https://pipeline.caspiands.com`) and add the same address under **Redirect URLs**.
- Emails → SMTP settings: connect your own email sender (Resend works for this too). Supabase's built-in sender only allows a few emails an hour, which is not enough for invites and password resets.

**3. Create the database**
Supabase dashboard → SQL Editor → New query. Paste the whole of `supabase/migrations/…_init.sql`, run it. Then do the same with `supabase/seed.sql`. Before running the seed, replace the blank emails for Matthew, Hafsham, Engsim, Phoebe and Priscilla with their work emails so they link to their logins automatically.

**4. Set up the code emails**
Create a Resend account (resend.com), add and verify the `caspiands.com` domain (Resend shows the DNS records to add), and create an API key.

**5. Deploy the three server programs**
On a computer with the Supabase command-line tool installed:
```
supabase login
supabase link --project-ref YOUR-PROJECT-REF
cp supabase/functions/.env.example supabase/functions/.env     # then fill in the values
supabase secrets set --env-file supabase/functions/.env
supabase functions deploy mfa-send
supabase functions deploy mfa-verify
supabase functions deploy admin-invite
```
Create the `MFA_PEPPER` value with `openssl rand -hex 32`.

**6. Make yourself the first admin**
Supabase dashboard → Authentication → Users → **Invite user** → `admin@caspiands.com`. Then in the SQL Editor run:
```
update public.profiles set role = 'admin' where email = 'admin@caspiands.com';
```

**7. Point the board at the database**
Open `cds-pipeline-board.html` in a text editor. Near the bottom, in `CONFIG`, replace `SUPABASE_URL` and `SUPABASE_ANON_KEY` with the values from Supabase → Project Settings → API (use the **anon / public** key, never the service-role key). Put the file on any web host at the Site URL from step 2, or use it as the reference for Cursor.

**8. First sign-in**
Open the invite email, set your password, then sign in and enter the emailed code. Go to **Team & access** and invite the team, choosing Editor for people who update deals and Viewer for people who only look.

## Building the full app with Cursor

Open this folder in Cursor, start an Agent chat, and paste everything from `CURSOR_PROMPT.md` below the line. Cursor builds the app phase by phase and stops after each one for you to check. The single HTML file stays as the reference for how every screen should look and calculate.

## Things to know

- **The anon key is meant to be public.** It only identifies the project; the security rules decide what anyone can see. The **service-role key** bypasses every rule and must only ever go into the server-program secrets.
- **Password resets go to the same email as the codes.** Someone with full control of a person's mailbox could reset their password and receive the code. For stronger protection later, add authenticator-app codes (Google Authenticator, Microsoft Authenticator), which Supabase supports natively.
- **The finance figure is entered by hand** under Targets and is not added to invoiced rows. Update it after each month-end.
- **Nothing is ever fully deleted by editors.** Deleting a deal hides it and keeps it in the audit trail; only admins can remove it permanently from the database.
- **Seed data needs checking**: BBM 2027 is entered at the low end (RM1m) of the RM1m–2m stated; AIC 2027, BBA and CR-1508 have no value; BBA and CR-1508 have no owner; PMB and SWT were left out because their stage was not stated.

## Glossary

| Term | Plain meaning |
|---|---|
| **Supabase** | A hosted database service with built-in logins. It stores the board's data and checks who is allowed to see it. |
| **Database migration** | A file of instructions that builds or changes the database structure. Run once, in order. |
| **Seed** | Starting data loaded into a new database. |
| **Row Level Security (RLS)** | Rules inside the database that decide, row by row, who can read or change data. They apply even if someone bypasses the web page. |
| **MFA (multi-factor authentication)** | Signing in needs two separate proofs: something you know (password) and something you have (access to your email for the code). |
| **OTP (one-time password)** | The 6-digit code. Works once and expires after 10 minutes. |
| **Session** | One signed-in browser. Each new session needs its own code. |
| **Edge Function** | A small program that runs on Supabase's servers, used here for the jobs a web page must not do itself (sending codes, inviting users). |
| **Anon key / service-role key** | Two Supabase keys. The anon key is safe in the web page. The service-role key has full power and stays on the server. |
| **Resend** | An email-sending service used to deliver the codes and system emails. |
| **Realtime** | Changes made by one person appear on everyone else's open board within a second or two. |
| **Soft delete** | Hiding a record instead of erasing it, so it can be recovered and audited. |
| **Audit log** | An automatic record of who changed what and when, with before and after values. |
| **Cursor** | An AI-assisted code editor that can build the full app from the prompt in this folder. |
| **Vercel** | A hosting service that puts the finished app on a web address. |
