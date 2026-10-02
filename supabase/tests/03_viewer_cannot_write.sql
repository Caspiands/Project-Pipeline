-- Security checklist: a verified viewer can read the board but cannot change anything.
-- Inserts are refused outright; updates and deletes simply find no rows they are allowed to touch.
begin;
\ir _shared/setup.psql
select plan(17);

select pg_temp.login(3);  -- 'viewer': verified session, role viewer

-- Positive control: the viewer really is signed in and verified.
select is((select (public.my_mfa_status() ->> 'verified')::boolean), true, 'viewer: session is verified');
select cmp_ok((select count(*) from public.opportunities), '>', 0::bigint, 'viewer: can read opportunities');
select cmp_ok((select count(*) from public.people),        '>', 0::bigint, 'viewer: can read people');
select is((select count(*) from public.settings),          1::bigint,      'viewer: can read settings');
select cmp_ok((select count(*) from public.profiles),      '>', 1::bigint, 'viewer: can see the team, not just their own profile');
select is((select count(*) from public.audit_log),         0::bigint,      'viewer: cannot read the audit log');

-- Writes.
select throws_ok($$insert into public.opportunities (account, item) values ('Viewer Co', 'Should fail')$$,
                 '42501', null, 'viewer: cannot add an opportunity');
select throws_ok($$insert into public.prospects (company) values ('Viewer Co')$$,
                 '42501', null, 'viewer: cannot add a prospect');
select throws_ok($$insert into public.reviews default values$$,
                 '42501', null, 'viewer: cannot mark a review done');
select throws_ok($$insert into public.people (name) values ('Viewer added owner')$$,
                 '42501', null, 'viewer: cannot add a deal owner');
select throws_ok($$insert into public.commitments (person_id, year, amount) values ('30000000-0000-4000-8000-000000000001', 2027, 5)$$,
                 '42501', null, 'viewer: cannot add a commitment');

select is(pg_temp.rows_changed($$update public.opportunities set value = 999 where id = '20000000-0000-4000-8000-000000000001'$$),
          0::bigint, 'viewer: updating an opportunity changes no rows');
select is(pg_temp.rows_changed($$update public.opportunities set deleted_at = now() where id = '20000000-0000-4000-8000-000000000001'$$),
          0::bigint, 'viewer: cannot soft-delete an opportunity');
select is(pg_temp.rows_changed($$update public.prospects set status = 'green'$$),
          0::bigint, 'viewer: updating a prospect changes no rows');
select is(pg_temp.rows_changed($$update public.settings set annual_target = 1 where id = 1$$),
          0::bigint, 'viewer: updating settings changes no rows');
select is(pg_temp.rows_changed($$update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000003'$$),
          0::bigint, 'viewer: cannot promote themselves');

-- Behind the policies, nothing moved.
select pg_temp.logout();
select is((select value from public.opportunities where id = '20000000-0000-4000-8000-000000000001'), 1000::numeric,
          'viewer: the opportunity value is unchanged');

select * from finish();
rollback;
