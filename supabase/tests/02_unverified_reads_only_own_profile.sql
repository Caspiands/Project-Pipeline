-- Security checklist: a login that has typed the right password but not yet the emailed code
-- can read nothing except its own profile row. A stolen password alone exposes no data.
begin;
\ir _shared/setup.psql
select plan(16);

select pg_temp.login(5);  -- 'unverified': signed in, no verified session

select is((select count(*) from public.profiles), 1::bigint, 'unverified: sees exactly one profile row');
select is((select id from public.profiles), '00000000-0000-4000-8000-000000000005'::uuid, 'unverified: that row is their own');

select is((select count(*) from public.people),         0::bigint, 'unverified: sees no people');
select is((select count(*) from public.settings),       0::bigint, 'unverified: sees no settings');
select is((select count(*) from public.commitments),    0::bigint, 'unverified: sees no commitments');
select is((select count(*) from public.opportunities),  0::bigint, 'unverified: sees no opportunities');
select is((select count(*) from public.stage_history),  0::bigint, 'unverified: sees no stage history');
select is((select count(*) from public.prospects),      0::bigint, 'unverified: sees no prospects');
select is((select count(*) from public.reviews),        0::bigint, 'unverified: sees no reviews');
select is((select count(*) from public.audit_log),      0::bigint, 'unverified: sees no audit log');

select throws_ok('select * from public.mfa_challenges',        '42501', null, 'unverified: MFA challenges are invisible to clients');
select throws_ok('select * from public.mfa_verified_sessions', '42501', null, 'unverified: MFA verified sessions are invisible to clients');

select throws_ok($$insert into public.opportunities (account, item) values ('Unverified Co', 'Should fail')$$,
                 '42501', null, 'unverified: cannot insert an opportunity');
select is(pg_temp.rows_changed($$update public.opportunities set value = 1$$),
          0::bigint, 'unverified: an update touches no rows');

select is((select (public.my_mfa_status() ->> 'verified')::boolean), false, 'unverified: my_mfa_status() says not verified');
select is((select public.my_mfa_status() ->> 'role'), 'viewer', 'unverified: my_mfa_status() still reports the role so the app can show the code step');

select * from finish();
rollback;
