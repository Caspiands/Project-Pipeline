-- Optional second revenue year on an invoice line (even split for reporting).

alter table public.opportunity_invoices
  add column revenue_year_2 int check (revenue_year_2 is null or (revenue_year_2 between 2020 and 2100));

create index opportunity_invoices_year2_idx on public.opportunity_invoices (revenue_year_2)
  where revenue_year_2 is not null;
