-- Security checklist: a verified editor can add and change opportunities and prospects, but cannot
-- change the company target, commitments, deal owners, roles or access, and cannot read the audit log.
begin;
\ir _shared/setup.psql
select plan(18);

select pg_temp.login(2);  -- 'editor': verified session, role editor

-- Positive controls: what an editor is for.
select lives_ok($$insert into public.opportunities (id, account, item, stage, value, revenue_year)
                  values ('20000000-0000-4000-8000-000000000002', 'Editor Co', 'Editor added this', 'Lead', 5000, 2026)$$,
                'editor: can add an opportunity');
select is((select created_by from public.opportunities where id = '20000000-0000-4000-8000-000000000002'),
          '00000000-0000-4000-8000-000000000002'::uuid, 'editor: created_by is stamped by the database, not the client');
select is((select stage_since from public.opportunities where id = '20000000-0000-4000-8000-000000000002'),
          current_date, 'editor: stage_since is set by the database on creation');
select lives_ok($$update public.opportunities set stage = 'Quote sent' where id = '20000000-0000-4000-8000-000000000002'$$,
                'editor: can move an opportunity to another stage');
select is((select count(*) from public.stage_history where opportunity_id = '20000000-0000-4000-8000-000000000002'),
          2::bigint, 'editor: the stage change was written to stage_history by the trigger');
select is((select from_stage || ' → ' || to_stage from public.stage_history where opportunity_id = '20000000-0000-4000-8000-000000000002' order by id desc limit 1),
          'Lead → Quote sent', 'editor: history records from → to');
select lives_ok($$update public.opportunities set deleted_at = now() where id = '20000000-0000-4000-8000-000000000002'$$,
                'editor: can soft-delete an opportunity');
-- A delete the policy filters out is not an error; it simply deletes nothing.
select is(pg_temp.rows_changed($$delete from public.opportunities where id = '20000000-0000-4000-8000-000000000002'$$),
          0::bigint, 'editor: cannot hard-delete an opportunity (only admins can)');
select lives_ok($$insert into public.prospects (company) values ('Editor prospect')$$, 'editor: can add a prospect');
select lives_ok($$insert into public.reviews default values$$, 'editor: can mark a review done');

-- Settings, commitments, people, roles: admin only.
select is(pg_temp.rows_changed($$update public.settings set annual_target = 1, finance_revenue = 1 where id = 1$$),
          0::bigint, 'editor: cannot change the company target or finance figure');
select throws_ok($$insert into public.commitments (person_id, year, amount) values ('30000000-0000-4000-8000-000000000001', 2027, 5)$$,
                 '42501', null, 'editor: cannot add a commitment');
select is(pg_temp.rows_changed($$update public.commitments set amount = 1$$),
          0::bigint, 'editor: cannot change a commitment');
select throws_ok($$insert into public.people (name) values ('Editor added owner')$$,
                 '42501', null, 'editor: cannot add a deal owner');
select is(pg_temp.rows_changed($$update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000002'$$),
          0::bigint, 'editor: cannot promote themselves to admin');
select is(pg_temp.rows_changed($$update public.profiles set role = 'viewer' where id = '00000000-0000-4000-8000-000000000001'$$),
          0::bigint, 'editor: cannot demote the admin');
select is(pg_temp.rows_changed($$update public.profiles set is_active = false where id = '00000000-0000-4000-8000-000000000003'$$),
          0::bigint, 'editor: cannot switch off someone''s access');
select is((select count(*) from public.audit_log), 0::bigint, 'editor: cannot read the audit log');

select * from finish();
rollback;
