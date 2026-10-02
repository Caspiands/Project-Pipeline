-- Positive controls for the admin role, and the "at least one active admin" rule.
-- These prove the earlier "cannot" tests fail for the right reason: the same actions succeed for an admin.
begin;
\ir _shared/setup.psql
select plan(12);

select pg_temp.login(1);  -- 'admin': verified session, role admin

select is((select public.my_mfa_status() ->> 'role'), 'admin', 'admin: my_mfa_status() reports the admin role');

select is(pg_temp.rows_changed($$update public.settings set annual_target = 7000000, finance_revenue = 4500000 where id = 1$$),
          1::bigint, 'admin: can change the company target and finance figure');
select is((select updated_by from public.settings where id = 1), '00000000-0000-4000-8000-000000000001'::uuid,
          'admin: settings.updated_by is stamped by the database');
select lives_ok($$insert into public.commitments (person_id, year, amount) values ('30000000-0000-4000-8000-000000000001', 2027, 250000)$$,
                'admin: can set a commitment');
select lives_ok($$insert into public.people (name) values ('Admin added owner')$$, 'admin: can add a deal owner');
select is(pg_temp.rows_changed($$update public.profiles set role = 'editor' where id = '00000000-0000-4000-8000-000000000003'$$),
          1::bigint, 'admin: can change someone''s role');
select is(pg_temp.rows_changed($$update public.profiles set is_active = false where id = '00000000-0000-4000-8000-000000000002'$$),
          1::bigint, 'admin: can switch someone''s access off');
select cmp_ok((select count(*) from public.audit_log), '>', 0::bigint, 'admin: can read the audit log');
select is((select count(*) from public.audit_log where table_name = 'settings' and action = 'UPDATE' and actor = '00000000-0000-4000-8000-000000000001'),
          1::bigint, 'admin: the settings change is in the audit log with the admin as actor');
select is(pg_temp.rows_changed($$delete from public.opportunities where id = '20000000-0000-4000-8000-000000000001'$$),
          1::bigint, 'admin: can hard-delete an opportunity');

-- The company must never be left without an active admin. The test admin is the only *test* admin,
-- so first make every other admin inactive behind the policies, then try to demote the last one.
select pg_temp.logout();
update public.profiles set is_active = false where role = 'admin' and id <> '00000000-0000-4000-8000-000000000001';
select pg_temp.login(1);
select throws_ok($$update public.profiles set role = 'viewer' where id = '00000000-0000-4000-8000-000000000001'$$,
                 'P0001', 'At least one active admin is required', 'last admin: cannot demote themselves');
select throws_ok($$update public.profiles set is_active = false where id = '00000000-0000-4000-8000-000000000001'$$,
                 'P0001', 'At least one active admin is required', 'last admin: cannot switch off their own access');

select * from finish();
rollback;
