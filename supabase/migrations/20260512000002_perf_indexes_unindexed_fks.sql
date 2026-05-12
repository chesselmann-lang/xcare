-- =====================================================================
-- perf: add indexes for unindexed foreign keys (Supabase advisor 2026-05-12)
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_anbieter_galerie_anbieter_id
  ON public.anbieter_galerie (anbieter_id);

CREATE INDEX IF NOT EXISTS idx_anbieter_mitglieder_profile_id
  ON public.anbieter_mitglieder (profile_id);

CREATE INDEX IF NOT EXISTS idx_anbieter_team_profile_id
  ON public.anbieter_team (profile_id);

CREATE INDEX IF NOT EXISTS idx_anbieter_zuletzt_angesehen_anbieter_id
  ON public.anbieter_zuletzt_angesehen (anbieter_id);

CREATE INDEX IF NOT EXISTS idx_anfrage_dokumente_anfrage_id
  ON public.anfrage_dokumente (anfrage_id);
CREATE INDEX IF NOT EXISTS idx_anfrage_dokumente_familie_id
  ON public.anfrage_dokumente (familie_id);

CREATE INDEX IF NOT EXISTS idx_anfrage_notizen_anbieter_id
  ON public.anfrage_notizen (anbieter_id);

CREATE INDEX IF NOT EXISTS idx_anfragen_leistung_id
  ON public.anfragen (leistung_id);

CREATE INDEX IF NOT EXISTS idx_anfragen_historie_anfrage_id
  ON public.anfragen_historie (anfrage_id);
CREATE INDEX IF NOT EXISTS idx_anfragen_historie_geaendert_von
  ON public.anfragen_historie (geaendert_von);

CREATE INDEX IF NOT EXISTS idx_anfragen_statusverlauf_geaendert_von
  ON public.anfragen_statusverlauf (geaendert_von);

CREATE INDEX IF NOT EXISTS idx_beschwerden_erstellt_von
  ON public.beschwerden (erstellt_von);
CREATE INDEX IF NOT EXISTS idx_beschwerden_familie_profile_id
  ON public.beschwerden (familie_profile_id);

CREATE INDEX IF NOT EXISTS idx_care_worker_anfragen_anbieter_id
  ON public.care_worker_anfragen (anbieter_id);
CREATE INDEX IF NOT EXISTS idx_care_worker_anfragen_care_worker_id
  ON public.care_worker_anfragen (care_worker_id);
CREATE INDEX IF NOT EXISTS idx_care_worker_anfragen_familie_id
  ON public.care_worker_anfragen (familie_id);

CREATE INDEX IF NOT EXISTS idx_compliance_checks_erstellt_von
  ON public.compliance_checks (erstellt_von);

CREATE INDEX IF NOT EXISTS idx_dsgvo_loeschanfragen_profil_id
  ON public.dsgvo_loeschanfragen (profil_id);

CREATE INDEX IF NOT EXISTS idx_familie_anbieter_notizen_anbieter_id
  ON public.familie_anbieter_notizen (anbieter_id);

CREATE INDEX IF NOT EXISTS idx_familie_pinnwand_erstellt_von
  ON public.familie_pinnwand (erstellt_von);

CREATE INDEX IF NOT EXISTS idx_favoriten_anbieter_id
  ON public.favoriten (anbieter_id);

CREATE INDEX IF NOT EXISTS idx_gespeicherte_suchen_profile_id
  ON public.gespeicherte_suchen (profile_id);

CREATE INDEX IF NOT EXISTS idx_haushalte_erstellt_von
  ON public.haushalte (erstellt_von);

CREATE INDEX IF NOT EXISTS idx_medikamentenplaene_anbieter_id
  ON public.medikamentenplaene (anbieter_id);
CREATE INDEX IF NOT EXISTS idx_medikamentenplaene_erstellt_von
  ON public.medikamentenplaene (erstellt_von);

CREATE INDEX IF NOT EXISTS idx_merkliste_anbieter_id
  ON public.merkliste (anbieter_id);

CREATE INDEX IF NOT EXISTS idx_nachrichten_vorlagen_anbieter_id
  ON public.nachrichten_vorlagen (anbieter_id);

CREATE INDEX IF NOT EXISTS idx_notfallplaene_anbieter_id
  ON public.notfallplaene (anbieter_id);

CREATE INDEX IF NOT EXISTS idx_pflegeaufgaben_ziel_id
  ON public.pflegeaufgaben (ziel_id);

CREATE INDEX IF NOT EXISTS idx_pflegedokumentation_erstellt_von
  ON public.pflegedokumentation (erstellt_von);

CREATE INDEX IF NOT EXISTS idx_pflegegrad_einschaetzungen_anbieter_id
  ON public.pflegegrad_einschaetzungen (anbieter_id);
CREATE INDEX IF NOT EXISTS idx_pflegegrad_einschaetzungen_erstellt_von
  ON public.pflegegrad_einschaetzungen (erstellt_von);

CREATE INDEX IF NOT EXISTS idx_pflegetagebuch_erstellt_von
  ON public.pflegetagebuch (erstellt_von);

CREATE INDEX IF NOT EXISTS idx_pflegetermine_anbieter_id
  ON public.pflegetermine (anbieter_id);

CREATE INDEX IF NOT EXISTS idx_qualitaetspruefungen_erstellt_von
  ON public.qualitaetspruefungen (erstellt_von);

CREATE INDEX IF NOT EXISTS idx_schichten_erstellt_von
  ON public.schichten (erstellt_von);

CREATE INDEX IF NOT EXISTS idx_traeger_massenpruefungen_traeger_id
  ON public.traeger_massenpruefungen (traeger_id);

CREATE INDEX IF NOT EXISTS idx_uebergabeprotokolle_care_worker_bis
  ON public.uebergabeprotokolle (care_worker_bis);
CREATE INDEX IF NOT EXISTS idx_uebergabeprotokolle_care_worker_von
  ON public.uebergabeprotokolle (care_worker_von);
CREATE INDEX IF NOT EXISTS idx_uebergabeprotokolle_schicht_bis_id
  ON public.uebergabeprotokolle (schicht_bis_id);
CREATE INDEX IF NOT EXISTS idx_uebergabeprotokolle_schicht_von_id
  ON public.uebergabeprotokolle (schicht_von_id);

CREATE INDEX IF NOT EXISTS idx_vollmachten_bevollmaechtigter_id
  ON public.vollmachten (bevollmaechtigter_id);
CREATE INDEX IF NOT EXISTS idx_vollmachten_vollmachtgeber_id
  ON public.vollmachten (vollmachtgeber_id);

CREATE INDEX IF NOT EXISTS idx_wiedervorlagen_anfrage_id
  ON public.wiedervorlagen (anfrage_id);

CREATE INDEX IF NOT EXISTS idx_wochenplaene_familie_profile_id
  ON public.wochenplaene (familie_profile_id);

CREATE INDEX IF NOT EXISTS idx_wohlbefinden_erstellt_von
  ON public.wohlbefinden (erstellt_von);

CREATE INDEX IF NOT EXISTS idx_wundversorgung_care_worker_id
  ON public.wundversorgung (care_worker_id);

CREATE INDEX IF NOT EXISTS idx_wundversorgungen_anbieter_id
  ON public.wundversorgungen (anbieter_id);
CREATE INDEX IF NOT EXISTS idx_wundversorgungen_dokumentiert_von
  ON public.wundversorgungen (dokumentiert_von);

CREATE INDEX IF NOT EXISTS idx_zahlungen_log_stundennachweis_id
  ON public.zahlungen_log (stundennachweis_id);
