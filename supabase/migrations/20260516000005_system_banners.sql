-- S291: System Banner Tabelle für Admin-Wartungsankündigungen
create table if not exists system_banners (
  id          uuid primary key default gen_random_uuid(),
  typ         text not null check (typ in ('info', 'warning', 'error', 'success')) default 'info',
  titel       text,
  nachricht   text not null,
  aktiv       boolean not null default false,
  zielgruppe  text not null check (zielgruppe in ('alle', 'anbieter', 'familie', 'admin')) default 'alle',
  gueltig_bis timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Only admins can manage banners
alter table system_banners enable row level security;

create policy "Admins manage banners" on system_banners
  for all using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Anyone authenticated can read active banners
create policy "Read active banners" on system_banners
  for select using (aktiv = true);

-- updated_at trigger
create trigger system_banners_updated_at
  before update on system_banners
  for each row execute function update_updated_at_column();
