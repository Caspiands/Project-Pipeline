-- Security checklist: a login whose access has been switched off (profiles.is_active = false)
-- reads nothing, even though its password still works and its session passed the emailed code.
-- The one exception is its own profile row, which is what tells the app to show
-- "Your access is switched off" and sign the person out.
begin;
\ir _shared/setup.psql
select plan(8);

select pg_temp.login(4);  -- 'deactivated': verified session, but is_active = false

select is((select public.my_mfa_status() ->> 'role'), null, 'deactivated: my_mfa_status() reports no role, so the app signs them out');
select is((select (public.my_mfa_status() ->> 'verified')::boolean), true, 'deactivated: the session itself is still verified (the role check is what blocks them)');

select is(pg_temp.visible_counts(),
          'profiles=1 people=0 settings=0 commitments=0 opportunities=0 stage_history=0 prospects=0 reviews=0 audit_log=0',
          'deactivated: every table is empty to them apart from their own profile row');
select is((select id from public.profiles), '00000000-0000-4000-8000-000000000004'::uuid, 'deactivated: the visible profile row is their own');

select throws_ok($$insert into public.opportunities (account, item) values ('Deactivated Co', 'Should fail')$$,
                 '42501', null, 'deactivated: cannot add an opportunity');
select throws_ok($$insert into public.prospects (company) values ('Deactivated Co')$$,
                 '42501', null, 'deactivated: cannot add a prospect');
select is(pg_temp.rows_changed($$update public.opportunities set value = 1$$),
          0::bigint, 'deactivated: an update touches no rows');
select is(pg_temp.rows_changed($$update public.profiles set is_active = true where id = '00000000-0000-4000-8000-000000000004'$$),
          0::bigint, 'deactivated: cannot switch their own access back on');

select * from finish();
rollback;
