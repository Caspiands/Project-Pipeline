-- admin_manage_login: only a verified admin may call it.
begin;
\ir _shared/setup.psql
select plan(6);

select pg_temp.anon();
select throws_ok(
  $$select public.admin_manage_login(
    'anon@policy-test.local', 'longpassword1', 'viewer'::public.app_role,
    '30000000-0000-4000-8000-000000000001'::uuid, null)$$,
  '42501', null, 'anon: cannot manage logins');

select pg_temp.login(3);  -- viewer
select throws_ok(
  $$select public.admin_manage_login(
    'viewer@policy-test.local', 'longpassword1', 'viewer'::public.app_role,
    '30000000-0000-4000-8000-000000000001'::uuid, null)$$,
  '42501', null, 'viewer: cannot manage logins');

select pg_temp.login(2);  -- editor
select throws_ok(
  $$select public.admin_manage_login(
    'editor@policy-test.local', 'longpassword1', 'editor'::public.app_role,
    '30000000-0000-4000-8000-000000000001'::uuid, null)$$,
  '42501', null, 'editor: cannot manage logins');

select pg_temp.login(1);  -- admin
select lives_ok(
  $$select public.admin_manage_login(
    'owner-login@policy-test.local', 'longpassword1', 'viewer'::public.app_role,
    '30000000-0000-4000-8000-000000000001'::uuid, null)$$,
  'admin: can create a login for a deal owner');
select isnt(
  (select profile_id from public.people where id = '30000000-0000-4000-8000-000000000001'),
  null::uuid,
  'admin: the deal owner is linked to a login');
select is(
  (select p.email from public.profiles p
   join public.people pe on pe.profile_id = p.id
   where pe.id = '30000000-0000-4000-8000-000000000001'),
  'owner-login@policy-test.local',
  'admin: the new login email is on the profile');

select * from finish();
rollback;
