-- ============================================
-- Migration: Dokumenten-Tresor (Phase 2C)
-- Stand: 2026-05-11
-- ============================================

CREATE TABLE IF NOT EXISTS dokumente (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  haushalt_id     uuid REFERENCES haushalte(id) ON DELETE CASCADE,
  profil_id       uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  name            text NOT NULL,
  kategorie       text NOT NULL CHECK (kategorie IN ('ausweis','bescheid','vollmacht','gesundheit','versicherung','steuer','immobilie','sonstiges')),
  storage_path    text NOT NULL,        -- Supabase Storage Pfad (verschlüsselt gespeichert)
  verschluesselt  boolean DEFAULT true, -- immer true für Client-Side-Encryption
  mime_type       text,
  groesse_bytes   bigint,
  ocr_text        text,                 -- OCR-Ergebnis (Klartext, nach Entschlüsselung im Browser)
  geteilt_mit     uuid[],              -- profile IDs die Zugriff haben
  ablaufdatum     date,                 -- z.B. Reisepass läuft ab
  notizen         text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE dokumente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dokumente_eigene" ON dokumente
  FOR ALL USING (profil_id = auth.uid());

CREATE POLICY "dokumente_geteilt" ON dokumente
  FOR SELECT USING (auth.uid() = ANY(geteilt_mit));

CREATE POLICY "dokumente_haushalt_admin" ON dokumente
  FOR SELECT USING (
    haushalt_id IN (
      SELECT haushalt_id FROM profiles WHERE user_id = auth.uid()
    )
    AND profil_id IN (
      SELECT hm.profile_id FROM haushaltsmitglieder hm
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE hm.haushalt_id = (SELECT haushalt_id FROM profiles WHERE user_id = auth.uid())
      AND hm.kann_dokumente_sehen = true
    )
  );

CREATE POLICY "admin_all_dokumente" ON dokumente
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_dokumente_profil ON dokumente(profil_id);
CREATE INDEX IF NOT EXISTS idx_dokumente_haushalt ON dokumente(haushalt_id);
