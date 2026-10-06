-- Multiple deal owners per opportunity (junction table). opportunities.owner_id stays in sync
-- as the first owner name in A–Z order for legacy callers.

create table public.opportunity_owners (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  person_id      uuid not null references public.people(id) on delete cascade,
  primary key (opportunity_id, person_id)
);

create index opportunity_owners_person_idx on public.opportunity_owners (person_id);

insert into public.opportunity_owners (opportunity_id, person_id)
select id, owner_id from public.opportunities where owner_id is not null
on conflict do nothing;

create or replace function public.sync_opportunity_owner_id()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  oid uuid;
  pid uuid;
begin
  oid := coalesce(new.opportunity_id, old.opportunity_id);
  select oo.person_id into pid
  from public.opportunity_owners oo
  join public.people p on p.id = oo.person_id
  where oo.opportunity_id = oid
  order by lower(p.name)
  limit 1;
  update public.opportunities set owner_id = pid where id = oid;
  return coalesce(new, old);
end $$;

create trigger opportunity_owners_sync_owner_id
  after insert or update or delete on public.opportunity_owners
  for each row execute function public.sync_opportunity_owner_id();

alter table public.opportunity_owners enable row level security;

create policy opportunity_owners_read on public.opportunity_owners
  for select to authenticated using (
    public.can_read()
    and exists (
      select 1 from public.opportunities o
      where o.id = opportunity_id and o.deleted_at is null
    )
  );

create policy opportunity_owners_write on public.opportunity_owners
  for all to authenticated using (public.can_write()) with check (public.can_write());

create trigger audit_opportunity_owners
  after insert or update or delete on public.opportunity_owners
  for each row execute function public.audit_row();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.opportunity_owners;
  end if;
end $$;
