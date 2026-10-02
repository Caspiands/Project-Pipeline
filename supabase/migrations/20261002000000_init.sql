-- =====================================================================
-- CDS Pipeline Board: database schema, security rules and automation
-- Target: Supabase (Postgres 15+). Run once on a fresh project.
--
-- What this file creates
--   1. Types (stages, segments, roles, prospect colours)
--   2. Tables (profiles, people, settings, commitments, opportunities,
--      stage_history, prospects, reviews, audit_log, and two private MFA tables)
--   3. Helper functions used by the security rules (MFA check, roles)
--   4. Triggers (new-user profile, timestamps, stage tracking, audit log)
--   5. Row Level Security policies: nothing is readable until the user has
--      signed in with a password AND passed the emailed one-time code
--   6. Realtime publication for live updates
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Types
-- ---------------------------------------------------------------------
create type public.app_role        as enum ('admin', 'editor', 'viewer');
create type public.segment         as enum ('Tech', 'Agency', 'Mixed');
create type public.opp_stage       as enum ('Lead', 'Proposal', 'Quote sent', 'Verbal yes', 'LOA/PO', 'Invoiced', 'Paid', 'Lost');
create type public.prospect_status as enum ('white', 'orange', 'yellow', 'green');

-- ---------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------

-- One row per login. Created automatically when a user is invited / signs up.
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        public.app_role not null default 'viewer',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- People who can own opportunities. Not everyone who owns a deal needs a login,
-- so owners live here and are optionally linked to a profile.
create table public.people (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  email       text,
  profile_id  uuid unique references public.profiles(id) on delete set null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index people_email_key on public.people (lower(email)) where email is not null;

-- Single-row company settings.
create table public.settings (
  id               smallint primary key default 1 check (id = 1),
  target_year      int not null default 2026 check (target_year between 2020 and 2100),
  annual_target    numeric(14,2) not null default 0 check (annual_target >= 0),
  finance_revenue  numeric(14,2) not null default 0 check (finance_revenue >= 0),
  finance_as_of    date,
  updated_at       timestamptz not null default now(),
  updated_by       uuid references public.profiles(id) on delete set null
);

-- Each person's committed revenue for a year.
create table public.commitments (
  person_id  uuid not null references public.people(id) on delete cascade,
  year       int  not null check (year between 2020 and 2100),
  amount     numeric(14,2) not null check (amount >= 0),
  updated_at timestamptz not null default now(),
  primary key (person_id, year)
);

-- The pipeline record: one row per opportunity.
create table public.opportunities (
  id             uuid primary key default gen_random_uuid(),
  account        text not null check (length(trim(account)) > 0),
  item           text not null check (length(trim(item)) > 0),
  segment        public.segment not null default 'Tech',
  owner_id       uuid references public.people(id) on delete set null,   -- null = Unassigned
  stage          public.opp_stage not null default 'Lead',
  value          numeric(14,2) check (value is null or value >= 0),      -- RM; null = not known yet
  revenue_year   int not null default 2026 check (revenue_year between 2020 and 2100),
  quote_no       text,
  quote_date     date,
  loa_date       date,
  invoice_month  date check (invoice_month is null or extract(day from invoice_month) = 1), -- first day of the month
  start_date     date,
  probability    int check (probability is null or probability between 0 and 100),
  next_step      text,
  next_owner_id  uuid references public.people(id) on delete set null,
  next_date      date,
  link           text,
  notes          text,
  stage_since    date,                                                    -- set by trigger on every stage change
  deleted_at     timestamptz,                                             -- soft delete
  created_at     timestamptz not null default now(),
  created_by     uuid references public.profiles(id) on delete set null,
  updated_at     timestamptz not null default now(),
  updated_by     uuid references public.profiles(id) on delete set null
);
create index opportunities_stage_idx   on public.opportunities (stage) where deleted_at is null;
create index opportunities_owner_idx   on public.opportunities (owner_id) where deleted_at is null;
create index opportunities_year_idx    on public.opportunities (revenue_year) where deleted_at is null;
create index opportunities_next_idx    on public.opportunities (next_date) where deleted_at is null;

-- Every stage change, written by trigger (clients cannot write here).
create table public.stage_history (
  id              bigint generated always as identity primary key,
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  from_stage      public.opp_stage,             -- null on creation
  to_stage        public.opp_stage not null,
  changed_at      timestamptz not null default now(),
  changed_by      uuid references public.profiles(id) on delete set null
);
create index stage_history_opp_idx  on public.stage_history (opportunity_id, changed_at desc);
create index stage_history_time_idx on public.stage_history (changed_at desc);

-- Companies we can contact but have no opportunity for yet (e.g. SSM convention list).
create table public.prospects (
  id              uuid primary key default gen_random_uuid(),
  company         text not null check (length(trim(company)) > 0),
  contact_name    text,
  designation     text,
  phone           text,
  email           text,
  status          public.prospect_status not null default 'white',
  owner_id        uuid references public.people(id) on delete set null,
  source          text,
  notes           text,
  opportunity_id  uuid references public.opportunities(id) on delete set null,  -- set when moved to pipeline
  created_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id) on delete set null,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.profiles(id) on delete set null
);
create index prospects_status_idx on public.prospects (status);

-- One row each time the team completes a pipeline review.
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  reviewed_at  timestamptz not null default now(),
  reviewed_by  uuid references public.profiles(id) on delete set null,
  notes        text
);
create index reviews_time_idx on public.reviews (reviewed_at desc);

-- Who changed what, when. Written by trigger; admins can read it.
create table public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  row_id      text,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data    jsonb,
  new_data    jsonb,
  actor       uuid,
  at          timestamptz not null default now()
);
create index audit_log_time_idx on public.audit_log (at desc);

-- PRIVATE: emailed one-time codes. Only Edge Functions (service role) touch these.
create table public.mfa_challenges (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  session_id   uuid not null,
  code_hash    text not null,
  attempts     int not null default 0,
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index mfa_challenges_lookup_idx on public.mfa_challenges (user_id, session_id, created_at desc);

-- PRIVATE: login sessions that have passed the emailed code.
create table public.mfa_verified_sessions (
  session_id   uuid primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  verified_at  timestamptz not null default now(),
  expires_at   timestamptz not null
);
create index mfa_verified_user_idx on public.mfa_verified_sessions (user_id);

-- ---------------------------------------------------------------------
-- 3. Helper functions for the security rules
-- ---------------------------------------------------------------------

-- The id of the login session behind the current request (from the JWT).
create or replace function public.current_session_id()
returns uuid language sql stable set search_path = '' as $$
  select nullif(auth.jwt() ->> 'session_id', '')::uuid
$$;

-- True when this session has passed the emailed one-time code and it has not expired.
create or replace function public.is_mfa_verified()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.mfa_verified_sessions v
    where v.session_id = public.current_session_id()
      and v.user_id = auth.uid()
      and v.expires_at > now()
  )
$$;

-- The caller's role, or null if they have no active profile.
create or replace function public.app_current_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active
$$;

create or replace function public.can_read()
returns boolean language sql stable set search_path = '' as $$
  select public.is_mfa_verified() and public.app_current_role() is not null
$$;

create or replace function public.can_write()
returns boolean language sql stable set search_path = '' as $$
  select public.is_mfa_verified() and public.app_current_role() in ('admin', 'editor')
$$;

create or replace function public.is_admin()
returns boolean language sql stable set search_path = '' as $$
  select public.is_mfa_verified() and public.app_current_role() = 'admin'
$$;

-- Lets the app ask "has this session passed the code?" without exposing the MFA tables.
create or replace function public.my_mfa_status()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'verified', public.is_mfa_verified(),
    'role', public.app_current_role(),
    'expires_at', (select v.expires_at from public.mfa_verified_sessions v
                   where v.session_id = public.current_session_id() and v.user_id = auth.uid())
  )
$$;

-- ---------------------------------------------------------------------
-- 4. Triggers
-- ---------------------------------------------------------------------

-- New auth user -> profile row; link to a matching person by email.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  update public.people set profile_id = new.id
  where profile_id is null and email is not null and lower(email) = lower(new.email);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at / updated_by honest.
create or replace function public.touch_row()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_table_name in ('opportunities', 'prospects', 'settings') then
    new.updated_by := auth.uid();
  end if;
  return new;
end $$;

create trigger touch_profiles      before update on public.profiles      for each row execute function public.touch_row();
create trigger touch_settings      before update on public.settings      for each row execute function public.touch_row();
create trigger touch_commitments   before update on public.commitments   for each row execute function public.touch_row();
create trigger touch_prospects     before update on public.prospects     for each row execute function public.touch_row();

-- Opportunities: stamp creator, track stage changes, auto-fill LOA date.
create or replace function public.opportunity_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_at  := now();
    new.created_by  := auth.uid();
    new.stage_since := coalesce(new.stage_since, current_date);
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    if new.stage is distinct from old.stage then
      new.stage_since := current_date;
    end if;
  end if;
  if new.stage = 'LOA/PO' and new.loa_date is null and (tg_op = 'INSERT' or old.stage is distinct from 'LOA/PO') then
    new.loa_date := current_date;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

create trigger opportunity_before_write
  before insert or update on public.opportunities
  for each row execute function public.opportunity_before_write();

create or replace function public.opportunity_log_stage()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.stage_history (opportunity_id, from_stage, to_stage, changed_by)
    values (new.id, null, new.stage, auth.uid());
  elsif new.stage is distinct from old.stage then
    insert into public.stage_history (opportunity_id, from_stage, to_stage, changed_by)
    values (new.id, old.stage, new.stage, auth.uid());
  end if;
  return null;
end $$;

create trigger opportunity_log_stage
  after insert or update of stage on public.opportunities
  for each row execute function public.opportunity_log_stage();

-- Prospects: stamp creator.
create or replace function public.prospect_before_insert()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.created_at := now();
  new.created_by := auth.uid();
  new.updated_by := auth.uid();
  return new;
end $$;

create trigger prospect_before_insert
  before insert on public.prospects
  for each row execute function public.prospect_before_insert();

-- Reviews: stamp reviewer.
create or replace function public.review_before_insert()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.reviewed_by := auth.uid();
  new.reviewed_at := coalesce(new.reviewed_at, now());
  return new;
end $$;

create trigger review_before_insert
  before insert on public.reviews
  for each row execute function public.review_before_insert();

-- Never leave the company without an active admin.
create or replace function public.protect_last_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'admin' and old.is_active
     and (new.role <> 'admin' or not new.is_active)
     and (select count(*) from public.profiles where role = 'admin' and is_active and id <> old.id) = 0 then
    raise exception 'At least one active admin is required';
  end if;
  return new;
end $$;

create trigger protect_last_admin
  before update on public.profiles
  for each row execute function public.protect_last_admin();

-- Generic audit trail.
create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rid text;
begin
  if tg_op = 'DELETE' then
    rid := coalesce(to_jsonb(old) ->> 'id', to_jsonb(old) ->> 'person_id');
    insert into public.audit_log (table_name, row_id, action, old_data, new_data, actor)
    values (tg_table_name, rid, tg_op, to_jsonb(old), null, auth.uid());
    return old;
  end if;
  rid := coalesce(to_jsonb(new) ->> 'id', to_jsonb(new) ->> 'person_id');
  insert into public.audit_log (table_name, row_id, action, old_data, new_data, actor)
  values (tg_table_name, rid, tg_op, case when tg_op = 'UPDATE' then to_jsonb(old) end, to_jsonb(new), auth.uid());
  return new;
end $$;

create trigger audit_opportunities after insert or update or delete on public.opportunities for each row execute function public.audit_row();
create trigger audit_prospects     after insert or update or delete on public.prospects     for each row execute function public.audit_row();
create trigger audit_settings      after insert or update or delete on public.settings      for each row execute function public.audit_row();
create trigger audit_commitments   after insert or update or delete on public.commitments   for each row execute function public.audit_row();
create trigger audit_people        after insert or update or delete on public.people        for each row execute function public.audit_row();
create trigger audit_profiles      after insert or update or delete on public.profiles      for each row execute function public.audit_row();

-- ---------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.people                enable row level security;
alter table public.settings              enable row level security;
alter table public.commitments           enable row level security;
alter table public.opportunities         enable row level security;
alter table public.stage_history         enable row level security;
alter table public.prospects             enable row level security;
alter table public.reviews               enable row level security;
alter table public.audit_log             enable row level security;
alter table public.mfa_challenges        enable row level security;  -- no policies: clients get nothing
alter table public.mfa_verified_sessions enable row level security;  -- no policies: clients get nothing

-- profiles: you can always read your own row; verified users read the team; admins manage.
create policy profiles_read_own    on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_read_team   on public.profiles for select to authenticated using (public.can_read());
create policy profiles_admin_write on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- people
create policy people_read   on public.people for select to authenticated using (public.can_read());
create policy people_insert on public.people for insert to authenticated with check (public.is_admin());
create policy people_update on public.people for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy people_delete on public.people for delete to authenticated using (public.is_admin());

-- settings: everyone verified reads, admins change.
create policy settings_read   on public.settings for select to authenticated using (public.can_read());
create policy settings_update on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- commitments
create policy commitments_read  on public.commitments for select to authenticated using (public.can_read());
create policy commitments_write on public.commitments for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- opportunities: editors and admins write; soft delete via deleted_at; only admins hard delete.
create policy opps_read   on public.opportunities for select to authenticated using (public.can_read());
create policy opps_insert on public.opportunities for insert to authenticated with check (public.can_write());
create policy opps_update on public.opportunities for update to authenticated using (public.can_write()) with check (public.can_write());
create policy opps_delete on public.opportunities for delete to authenticated using (public.is_admin());

-- stage_history: read only (trigger writes it).
create policy stage_history_read on public.stage_history for select to authenticated using (public.can_read());

-- prospects
create policy prospects_read   on public.prospects for select to authenticated using (public.can_read());
create policy prospects_insert on public.prospects for insert to authenticated with check (public.can_write());
create policy prospects_update on public.prospects for update to authenticated using (public.can_write()) with check (public.can_write());
create policy prospects_delete on public.prospects for delete to authenticated using (public.is_admin());

-- reviews
create policy reviews_read   on public.reviews for select to authenticated using (public.can_read());
create policy reviews_insert on public.reviews for insert to authenticated with check (public.can_write());

-- audit_log: admins only.
create policy audit_read on public.audit_log for select to authenticated using (public.is_admin());

-- Signed-out visitors get nothing at all.
revoke all on all tables in schema public from anon;
revoke all on public.mfa_challenges, public.mfa_verified_sessions from authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.my_mfa_status() to authenticated;

-- ---------------------------------------------------------------------
-- 6. Realtime (live updates in the browser; still filtered by RLS)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.opportunities, public.prospects, public.settings, public.commitments,
      public.people, public.reviews, public.stage_history, public.profiles;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 7. Housekeeping: remove old MFA rows (schedule with pg_cron if enabled)
-- ---------------------------------------------------------------------
create or replace function public.purge_mfa_rows()
returns void language sql security definer set search_path = '' as $$
  delete from public.mfa_challenges where created_at < now() - interval '1 day';
  delete from public.mfa_verified_sessions where expires_at < now() - interval '1 day';
$$;
revoke execute on function public.purge_mfa_rows() from public, anon, authenticated;
-- With pg_cron enabled (Database > Extensions):
--   select cron.schedule('purge-mfa', '17 3 * * *', 'select public.purge_mfa_rows()');
