-- =====================================================================
-- Starting data from the Q4 Pipeline and Accountability meeting, 1 Oct 2026.
-- Run after the migration. Values marked "to confirm" in notes need checking.
-- Replace the placeholder emails so people link to their logins automatically.
-- =====================================================================

insert into public.people (name, email) values
  ('Matthew',   null),
  ('Bharg',     'admin@caspiands.com'),
  ('Hafsham',   null),
  ('Engsim',    null),
  ('Phoebe',    null),
  ('Priscilla', null)
on conflict (name) do nothing;

-- Link owners to any logins that already exist.
update public.people pe set profile_id = pr.id
from public.profiles pr
where pe.profile_id is null and pe.email is not null and lower(pe.email) = lower(pr.email);

insert into public.settings (id, target_year, annual_target, finance_revenue, finance_as_of)
values (1, 2026, 7000000, 4500000, '2026-10-01')
on conflict (id) do update set target_year = excluded.target_year, annual_target = excluded.annual_target,
  finance_revenue = excluded.finance_revenue, finance_as_of = excluded.finance_as_of;

insert into public.commitments (person_id, year, amount)
select id, 2026, 2700000 from public.people where name = 'Hafsham'
on conflict (person_id, year) do update set amount = excluded.amount;

-- Opportunities. stage_since is left empty because the real stage dates were not recorded.
with p as (select name, id from public.people)
insert into public.opportunities
  (account, item, segment, owner_id, stage, value, revenue_year, quote_no, quote_date, next_step, next_owner_id, next_date, notes, stage_since)
values
  ('BBSG', 'Q4 quotations, Singapore-related', 'Mixed', (select id from p where name='Hafsham'), 'Quote sent', 262000, 2026, null, null,
   'Mark approved quotes in the quotation sheet', (select id from p where name='Hafsham'), '2026-10-07',
   'Q4 projection stated at the 1 Oct meeting. Part already invoiced in September; split out the invoiced part. Segment to confirm.', null),
  ('AIC', 'Q4 work', 'Agency', (select id from p where name='Hafsham'), 'Invoiced', 150000, 2026, null, null,
   null, null, null, 'About RM150K, part invoiced in September (1 Oct meeting). Confirm paid vs unpaid.', null),
  ('AIC', '2027 programme', 'Agency', (select id from p where name='Hafsham'), 'Verbal yes', null, 2027, null, null,
   'Get the 2027 budget figure from Alvina', (select id from p where name='Hafsham'), '2026-10-16',
   'Alvina confirmed AIC is going ahead for 2027; budget not given yet (1 Oct meeting).', null),
  ('BBM', 'Final-quarter quotation', 'Agency', (select id from p where name='Engsim'), 'Invoiced', 243000, 2026, null, null,
   'Mark the quotation approved in the quotation sheet', (select id from p where name='Engsim'), '2026-10-07',
   'Invoiced, not all paid yet (1 Oct meeting).', null),
  ('BBM', '2027 programme', 'Agency', (select id from p where name='Engsim'), 'Verbal yes', 1000000, 2027, null, null,
   null, null, null, 'Stated at the 1 Oct meeting as RM1m to 2m confirmed for 2027; low end entered. Check whether an LOA exists and when it will be invoiced.', null),
  ('Gas Malaysia', 'HSEQ Digital Suite', 'Tech', (select id from p where name='Bharg'), 'Quote sent', 216000, 2027, null, null,
   'Chase client for the contract wording', (select id from p where name='Bharg'), '2026-10-09',
   'Waiting on client wording since Q2. Likely runs into 2027 (1 Oct meeting).', null),
  ('Gas Malaysia', 'OMS', 'Tech', (select id from p where name='Bharg'), 'Quote sent', 150000, 2027, null, null,
   'Chase client for the contract wording', (select id from p where name='Bharg'), '2026-10-09',
   'Waiting on client wording since Q2 (1 Oct meeting).', null),
  ('AKPK', 'Live chat analyser dashboard', 'Tech', (select id from p where name='Bharg'), 'LOA/PO', 68000, 2027, 'Q-932, Q-933, Q-934', '2026-08-07',
   'Add LOA date and expected invoice month', (select id from p where name='Bharg'), '2026-10-09',
   'Quotes sent 7 Aug; LOA received but it was missing from the pipeline (1 Oct meeting). Delivery expected Q1 2027.', null),
  ('BBA', '2027 work (Q1 start)', 'Tech', null, 'Proposal', null, 2027, null, null,
   'Confirm owner and whether Q1 is going ahead', null, '2026-10-16', 'Described as uncertain at the 1 Oct meeting.', null),
  ('To confirm', 'Three quotations under CR-1508', 'Mixed', null, 'Quote sent', null, 2026, 'CR-1508', null,
   'Identify account, owner and value', null, '2026-10-07', 'Pending LOA, per the 1 Oct meeting. Account not named in the transcript.', null);

-- The seed should not pretend these stages started today: clear the trigger's stage_since and LOA date.
update public.opportunities set stage_since = null where created_by is null;
update public.opportunities set loa_date = null where account = 'AKPK' and created_by is null;

-- Treat the 1 Oct meeting as the first review.
insert into public.reviews (reviewed_at, notes) values ('2026-10-01 18:00:00+08', 'Q4 Pipeline Growth and Accountability Planning meeting');
