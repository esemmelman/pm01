alter table public.pm01_date_items drop constraint pm01_date_items_entry_date_check;
alter table public.pm01_date_items add constraint pm01_date_items_entry_date_check check (entry_date between date '2026-10-01' and date '2027-12-31');
