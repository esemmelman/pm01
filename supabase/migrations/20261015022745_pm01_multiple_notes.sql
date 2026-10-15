create table public.pm01_multiple_notes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.pm01_items(id) on delete cascade,
  title text not null default 'New note' check (length(title) between 1 and 200),
  content_html text not null default '',
  created_at timestamptz not null default now()
);
create index pm01_multiple_notes_item_id_idx on public.pm01_multiple_notes(item_id);
alter table public.pm01_multiple_notes enable row level security;
create policy "Public planner notes" on public.pm01_multiple_notes for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on public.pm01_multiple_notes to anon, authenticated;
