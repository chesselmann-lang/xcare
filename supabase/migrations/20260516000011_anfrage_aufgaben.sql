-- S328: Aufgaben-Checkliste in Anfragen-Detail
create table if not exists anfrage_aufgaben (
  id          uuid primary key default gen_random_uuid(),
  anfrage_id  uuid references anfragen(id) on delete cascade not null,
  anbieter_id uuid references anbieter(id) on delete cascade not null,
  titel       text not null check (char_length(titel) between 1 and 500),
  erledigt    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table anfrage_aufgaben enable row level security;

create policy "anbieter_own_aufgaben" on anfrage_aufgaben
  for all using (
    anbieter_id in (
      select id from anbieter where profile_id = (
        select id from profiles where user_id = auth.uid()
      )
    )
  );

create or replace function set_updated_at_anfrage_aufgaben()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger anfrage_aufgaben_updated_at
  before update on anfrage_aufgaben
  for each row execute procedure set_updated_at_anfrage_aufgaben();

create index if not exists idx_anfrage_aufgaben_anfrage
  on anfrage_aufgaben (anfrage_id, anbieter_id);
