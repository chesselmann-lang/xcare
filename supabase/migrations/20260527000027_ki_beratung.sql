-- F33: KI-Pflegeberatung 24/7 — Persistente Beratungs-Gespräche
-- ============================================================

-- Persistent KI consultation conversations
CREATE TABLE ki_beratungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  titel TEXT,
  thema TEXT CHECK (thema IN (
    'pflegegrad','ansprueche','anbieter','kosten','rechtliches',
    'medizinisch','organisation','dokumente','sonstiges'
  )),
  status TEXT CHECK (status IN ('aktiv','archiviert','eskaliert')) DEFAULT 'aktiv',
  nachrichten_count INT DEFAULT 0,
  letzte_nachricht_am TIMESTAMPTZ DEFAULT now(),
  eskaliert_an TEXT,
  erstellt_am TIMESTAMPTZ DEFAULT now()
);

-- Individual messages in consultations
CREATE TABLE ki_beratung_nachrichten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beratung_id UUID REFERENCES ki_beratungen(id) ON DELETE CASCADE,
  rolle TEXT CHECK (rolle IN ('user','assistant','tool')) NOT NULL,
  inhalt TEXT NOT NULL,
  tool_aufrufe JSONB,
  dokument_generiert JSONB,
  token_count INT,
  erstellt_am TIMESTAMPTZ DEFAULT now()
);

-- Scheduled follow-ups from consultations
CREATE TABLE ki_beratung_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  beratung_id UUID REFERENCES ki_beratungen(id),
  faellig_am DATE NOT NULL,
  aufgabe TEXT NOT NULL,
  erledigt BOOLEAN DEFAULT false,
  erstellt_am TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────────
CREATE INDEX idx_ki_beratungen_user_id ON ki_beratungen(user_id);
CREATE INDEX idx_ki_beratungen_user_status ON ki_beratungen(user_id, status);
CREATE INDEX idx_ki_beratung_nachrichten_beratung ON ki_beratung_nachrichten(beratung_id, erstellt_am);
CREATE INDEX idx_ki_beratung_followups_user ON ki_beratung_followups(user_id, erledigt, faellig_am);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE ki_beratungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE ki_beratung_nachrichten ENABLE ROW LEVEL SECURITY;
ALTER TABLE ki_beratung_followups ENABLE ROW LEVEL SECURITY;

-- ki_beratungen: user owns their own rows
CREATE POLICY "ki_beratungen_select" ON ki_beratungen
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "ki_beratungen_insert" ON ki_beratungen
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "ki_beratungen_update" ON ki_beratungen
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "ki_beratungen_delete" ON ki_beratungen
  FOR DELETE USING (user_id = auth.uid());

-- ki_beratung_nachrichten: accessible when parent beratung belongs to user
CREATE POLICY "ki_beratung_nachrichten_select" ON ki_beratung_nachrichten
  FOR SELECT USING (
    beratung_id IN (
      SELECT id FROM ki_beratungen WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ki_beratung_nachrichten_insert" ON ki_beratung_nachrichten
  FOR INSERT WITH CHECK (
    beratung_id IN (
      SELECT id FROM ki_beratungen WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ki_beratung_nachrichten_delete" ON ki_beratung_nachrichten
  FOR DELETE USING (
    beratung_id IN (
      SELECT id FROM ki_beratungen WHERE user_id = auth.uid()
    )
  );

-- ki_beratung_followups: user owns their own rows
CREATE POLICY "ki_beratung_followups_select" ON ki_beratung_followups
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "ki_beratung_followups_insert" ON ki_beratung_followups
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "ki_beratung_followups_update" ON ki_beratung_followups
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "ki_beratung_followups_delete" ON ki_beratung_followups
  FOR DELETE USING (user_id = auth.uid());
