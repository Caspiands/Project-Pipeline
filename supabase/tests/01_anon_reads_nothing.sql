-- Security checklist: a signed-out visitor (anon key, no session) can read nothing at all.
-- The migration revokes every table privilege from `anon`, so each select is a hard error,
-- not just an empty result.
begin;
\ir _shared/setup.psql
select plan(13);

select pg_temp.anon();

select throws_ok('select * from public.profiles',              '42501', null, 'anon: profiles are not readable');
select throws_ok('select * from public.people',                '42501', null, 'anon: people are not readable');
select throws_ok('select * from public.settings',              '42501', null, 'anon: settings are not readable');
select throws_ok('select * from public.commitments',           '42501', null, 'anon: commitments are not readable');
select throws_ok('select * from public.opportunities',         '42501', null, 'anon: opportunities are not readable');
select throws_ok('select * from public.stage_history',         '42501', null, 'anon: stage history is not readable');
select throws_ok('select * from public.prospects',             '42501', null, 'anon: prospects are not readable');
select throws_ok('select * from public.reviews',               '42501', null, 'anon: reviews are not readable');
select throws_ok('select * from public.audit_log',             '42501', null, 'anon: audit log is not readable');
select throws_ok('select * from public.mfa_challenges',        '42501', null, 'anon: MFA challenges are not readable');
select throws_ok('select * from public.mfa_verified_sessions', '42501', null, 'anon: MFA verified sessions are not readable');

select throws_ok($$insert into public.opportunities (account, item) values ('Anon Co', 'Should fail')$$,
                 '42501', null, 'anon: cannot insert an opportunity');
select throws_ok($$insert into public.prospects (company) values ('Anon Co')$$,
                 '42501', null, 'anon: cannot insert a prospect');

select * from finish();
rollback;
