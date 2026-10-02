-- Server rules from section 4: verification is bound to the login session and runs out after
-- MFA_SESSION_HOURS. A verified session on one device does not unlock another device, and an
-- expired verification reads nothing until a new code is entered.
begin;
\ir _shared/setup.psql
select plan(6);

-- Viewer (user 3) is verified on session 3, but this request comes from session 5 on the same account.
select pg_temp.login(3, 5);
select is((select (public.my_mfa_status() ->> 'verified')::boolean), false, 'other device: the session is not verified');
select is((select count(*) from public.opportunities), 0::bigint, 'other device: sees no opportunities');
select is((select count(*) from public.profiles), 1::bigint, 'other device: sees only their own profile');

-- Editor (user 6) was verified, but the verification ran out a minute ago.
select pg_temp.login(6);
select is((select (public.my_mfa_status() ->> 'verified')::boolean), false, 'expired: the session is no longer verified');
select is((select count(*) from public.opportunities), 0::bigint, 'expired: sees no opportunities');
select throws_ok($$insert into public.opportunities (account, item) values ('Expired Co', 'Should fail')$$,
                 '42501', null, 'expired: cannot write even though the role is editor');

select * from finish();
rollback;
