-- Deal + invoice lines: commercial fields stay on opportunities; amount, year, month, stage per invoice.

create table public.opportunity_invoices (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  amount          numeric(14,2) check (amount is null or amount >= 0),
  revenue_year    int not null check (revenue_year between 2020 and 2100),
  invoice_month   date check (invoice_month is null or extract(day from invoice_month) = 1),
  stage           public.opp_stage not null default 'Lead',
  stage_since     date,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index opportunity_invoices_opp_idx on public.opportunity_invoices (opportunity_id);
create index opportunity_invoices_year_idx on public.opportunity_invoices (revenue_year);
create index opportunity_invoices_stage_idx on public.opportunity_invoices (stage);
create index opportunity_invoices_month_idx on public.opportunity_invoices (invoice_month);

-- One invoice row per existing opportunity row (merge script may consolidate deals afterward).
insert into public.opportunity_invoices (
  opportunity_id, amount, revenue_year, invoice_month, stage, stage_since, sort_order, created_at, updated_at
)
select
  id, value, revenue_year, invoice_month, stage, stage_since, 0, created_at, updated_at
from public.opportunities
where deleted_at is null;

-- Stage tracking moves to invoices.
drop trigger if exists opportunity_log_stage on public.opportunities;
drop trigger if exists opportunity_before_write on public.opportunities;

create or replace function public.invoice_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.stage_since := coalesce(new.stage_since, current_date);
  elsif new.stage is distinct from old.stage then
    new.stage_since := current_date;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger invoice_before_write
  before insert or update on public.opportunity_invoices
  for each row execute function public.invoice_before_write();

create or replace function public.invoice_log_stage()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.stage_history (opportunity_id, from_stage, to_stage, changed_by)
    values (new.opportunity_id, null, new.stage, auth.uid());
  elsif new.stage is distinct from old.stage then
    insert into public.stage_history (opportunity_id, from_stage, to_stage, changed_by)
    values (new.opportunity_id, old.stage, new.stage, auth.uid());
  end if;
  return null;
end $$;

create trigger invoice_log_stage
  after insert or update of stage on public.opportunity_invoices
  for each row execute function public.invoice_log_stage();

-- LOA date on the deal when any invoice hits LOA/PO.
create or replace function public.opportunity_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := auth.uid();
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  if new.loa_date is null and exists (
    select 1 from public.opportunity_invoices i
    where i.opportunity_id = new.id and i.stage = 'LOA/PO'
  ) then
    new.loa_date := current_date;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

create trigger opportunity_before_write
  before insert or update on public.opportunities
  for each row execute function public.opportunity_before_write();

alter table public.opportunities
  drop column if exists stage,
  drop column if exists value,
  drop column if exists revenue_year,
  drop column if exists invoice_month,
  drop column if exists stage_since;

drop index if exists public.opportunities_stage_idx;
drop index if exists public.opportunities_year_idx;

alter table public.opportunity_invoices enable row level security;

create policy opportunity_invoices_read on public.opportunity_invoices
  for select to authenticated using (
    public.can_read()
    and exists (
      select 1 from public.opportunities o
      where o.id = opportunity_id and o.deleted_at is null
    )
  );

create policy opportunity_invoices_write on public.opportunity_invoices
  for all to authenticated using (public.can_write()) with check (public.can_write());

create trigger audit_opportunity_invoices
  after insert or update or delete on public.opportunity_invoices
  for each row execute function public.audit_row();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.opportunity_invoices;
  end if;
end $$;
