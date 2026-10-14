create table public.pm01_date_items (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.pm01_items(id) on delete cascade,
  entry_date date not null check (entry_date between date '2026-10-01' and date '2027-06-30'),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  content_html text not null default '',
  created_at timestamptz not null default now()
);
create index pm01_date_items_item_date_idx on public.pm01_date_items (item_id, entry_date, created_at, id);
alter table public.pm01_date_items enable row level security;
revoke all on public.pm01_date_items from anon, authenticated;
grant select, insert, update, delete on public.pm01_date_items to anon, authenticated;
create policy pm01_date_items_read on public.pm01_date_items for select to anon, authenticated using (true);
create policy pm01_date_items_add on public.pm01_date_items for insert to anon, authenticated with check (true);
create policy pm01_date_items_edit on public.pm01_date_items for update to anon, authenticated using (true) with check (true);
create policy pm01_date_items_delete on public.pm01_date_items for delete to anon, authenticated using (true);
