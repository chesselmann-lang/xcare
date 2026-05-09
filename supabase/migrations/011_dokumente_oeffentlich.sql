-- Sprint 107: Dokumente können öffentlich auf Anbieter-Profil gezeigt werden
ALTER TABLE anbieter_dokumente
  ADD COLUMN IF NOT EXISTS oeffentlich boolean NOT NULL DEFAULT false;

-- Public can read documents marked as oeffentlich
CREATE POLICY "dokumente_public_read" ON anbieter_dokumente
  FOR SELECT USING (oeffentlich = true);
