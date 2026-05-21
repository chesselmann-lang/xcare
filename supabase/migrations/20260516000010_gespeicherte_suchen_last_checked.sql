-- S325: Add last_checked_at to gespeicherte_suchen for saved-search notification tracking
alter table gespeicherte_suchen
  add column if not exists last_checked_at timestamptz;

-- Index for efficiently querying suchen that need checking
create index if not exists idx_gespeicherte_suchen_last_checked
  on gespeicherte_suchen (last_checked_at nulls first);
