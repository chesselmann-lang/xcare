-- =====================================================================
-- perf: fix auth_rls_initplan — wrap auth.uid() in (select auth.uid())
-- Prevents per-row re-evaluation of the auth JWT on high-traffic tables.
-- =====================================================================

-- profiles
DROP POLICY IF EXISTS "Eigenes Profil lesen" ON public.profiles;
CREATE POLICY "Eigenes Profil lesen" ON public.profiles
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Eigenes Profil aktualisieren" ON public.profiles;
CREATE POLICY "Eigenes Profil aktualisieren" ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- anbieter
DROP POLICY IF EXISTS "Eigenen Anbieter verwalten" ON public.anbieter;
CREATE POLICY "Eigenen Anbieter verwalten" ON public.anbieter
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (select auth.uid())
    )
  );

-- leistungen
DROP POLICY IF EXISTS "Eigene Leistungen verwalten" ON public.leistungen;
CREATE POLICY "Eigene Leistungen verwalten" ON public.leistungen
  FOR ALL USING (
    anbieter_id IN (
      SELECT a.id FROM public.anbieter a
      JOIN public.profiles p ON (a.profile_id = p.id)
      WHERE p.user_id = (select auth.uid())
    )
  );

-- anfragen
DROP POLICY IF EXISTS "Familie sieht eigene Anfragen" ON public.anfragen;
CREATE POLICY "Familie sieht eigene Anfragen" ON public.anfragen
  FOR SELECT USING (
    familie_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Anbieter sieht eigene Anfragen" ON public.anfragen;
CREATE POLICY "Anbieter sieht eigene Anfragen" ON public.anfragen
  FOR SELECT USING (
    anbieter_id IN (
      SELECT a.id FROM public.anbieter a
      JOIN public.profiles p ON (a.profile_id = p.id)
      WHERE p.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Familie erstellt Anfragen" ON public.anfragen;
CREATE POLICY "Familie erstellt Anfragen" ON public.anfragen
  FOR INSERT WITH CHECK (
    familie_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Anbieter aktualisiert Anfragen-Status" ON public.anfragen;
CREATE POLICY "Anbieter aktualisiert Anfragen-Status" ON public.anfragen
  FOR UPDATE USING (
    anbieter_id IN (
      SELECT a.id FROM public.anbieter a
      JOIN public.profiles p ON (a.profile_id = p.id)
      WHERE p.user_id = (select auth.uid())
    )
  );

-- bewertungen
DROP POLICY IF EXISTS "Anbieter kann auf eigene Bewertungen antworten" ON public.bewertungen;
CREATE POLICY "Anbieter kann auf eigene Bewertungen antworten" ON public.bewertungen
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.anbieter a
      JOIN public.profiles p ON (p.id = a.profile_id)
      WHERE a.id = bewertungen.anbieter_id
        AND p.user_id = (select auth.uid())
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "bewertungen_insert_familie" ON public.bewertungen;
CREATE POLICY "bewertungen_insert_familie" ON public.bewertungen
  FOR INSERT WITH CHECK (
    (select auth.uid()) = (
      SELECT user_id FROM public.profiles
      WHERE id = bewertungen.familie_id
    )
  );

DROP POLICY IF EXISTS "bewertungen_update_familie" ON public.bewertungen;
CREATE POLICY "bewertungen_update_familie" ON public.bewertungen
  FOR UPDATE USING (
    (select auth.uid()) = (
      SELECT user_id FROM public.profiles
      WHERE id = bewertungen.familie_id
    )
  );

DROP POLICY IF EXISTS "bewertungen_delete_familie" ON public.bewertungen;
CREATE POLICY "bewertungen_delete_familie" ON public.bewertungen
  FOR DELETE USING (
    (select auth.uid()) = (
      SELECT user_id FROM public.profiles
      WHERE id = bewertungen.familie_id
    )
  );

-- favoriten
DROP POLICY IF EXISTS "Familie verwaltet Favoriten" ON public.favoriten;
CREATE POLICY "Familie verwaltet Favoriten" ON public.favoriten
  FOR ALL USING (
    familie_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (select auth.uid())
    )
  );

-- nachrichten
DROP POLICY IF EXISTS "nachrichten_select" ON public.nachrichten;
CREATE POLICY "nachrichten_select" ON public.nachrichten
  FOR SELECT USING (
    (select auth.uid()) IN (
      SELECT p.user_id
      FROM public.profiles p
      JOIN public.anfragen a ON (
        a.familie_id = p.id
        OR a.anbieter_id IN (
          SELECT ab.id FROM public.anbieter ab WHERE ab.profile_id = p.id
        )
      )
      WHERE a.id = nachrichten.anfrage_id
    )
  );

DROP POLICY IF EXISTS "nachrichten_insert" ON public.nachrichten;
CREATE POLICY "nachrichten_insert" ON public.nachrichten
  FOR INSERT WITH CHECK (
    (select auth.uid()) = (
      SELECT user_id FROM public.profiles WHERE id = nachrichten.sender_id
    )
    AND
    (select auth.uid()) IN (
      SELECT p.user_id
      FROM public.profiles p
      JOIN public.anfragen a ON (
        a.familie_id = p.id
        OR a.anbieter_id IN (
          SELECT ab.id FROM public.anbieter ab WHERE ab.profile_id = p.id
        )
      )
      WHERE a.id = nachrichten.anfrage_id
    )
  );

DROP POLICY IF EXISTS "nachrichten_update_gelesen" ON public.nachrichten;
CREATE POLICY "nachrichten_update_gelesen" ON public.nachrichten
  FOR UPDATE USING (
    (select auth.uid()) <> (
      SELECT user_id FROM public.profiles WHERE id = nachrichten.sender_id
    )
    AND
    (select auth.uid()) IN (
      SELECT p.user_id
      FROM public.profiles p
      JOIN public.anfragen a ON (
        a.familie_id = p.id
        OR a.anbieter_id IN (
          SELECT ab.id FROM public.anbieter ab WHERE ab.profile_id = p.id
        )
      )
      WHERE a.id = nachrichten.anfrage_id
    )
  )
  WITH CHECK (gelesen = true);

-- benachrichtigungen
DROP POLICY IF EXISTS "benachrichtigungen_select" ON public.benachrichtigungen;
CREATE POLICY "benachrichtigungen_select" ON public.benachrichtigungen
  FOR SELECT USING (
    (select auth.uid()) = (
      SELECT user_id FROM public.profiles
      WHERE id = benachrichtigungen.profile_id
    )
  );

DROP POLICY IF EXISTS "benachrichtigungen_update_gelesen" ON public.benachrichtigungen;
CREATE POLICY "benachrichtigungen_update_gelesen" ON public.benachrichtigungen
  FOR UPDATE USING (
    (select auth.uid()) = (
      SELECT user_id FROM public.profiles
      WHERE id = benachrichtigungen.profile_id
    )
  );

-- anfrage_notizen
DROP POLICY IF EXISTS "notizen_anbieter_only" ON public.anfrage_notizen;
CREATE POLICY "notizen_anbieter_only" ON public.anfrage_notizen
  FOR ALL USING (
    (select auth.uid()) = (
      SELECT p.user_id
      FROM public.profiles p
      JOIN public.anbieter a ON (a.profile_id = p.id)
      WHERE a.id = anfrage_notizen.anbieter_id
    )
  );

-- anbieter_mitglieder
DROP POLICY IF EXISTS "mitglieder_select" ON public.anbieter_mitglieder;
CREATE POLICY "mitglieder_select" ON public.anbieter_mitglieder
  FOR SELECT USING (
    (select auth.uid()) = (
      SELECT p.user_id
      FROM public.profiles p
      JOIN public.anbieter a ON (a.profile_id = p.id)
      WHERE a.id = anbieter_mitglieder.anbieter_id
    )
    OR
    (select auth.uid()) = (
      SELECT user_id FROM public.profiles
      WHERE id = anbieter_mitglieder.profile_id
    )
  );

-- notification_preferences
DROP POLICY IF EXISTS "prefs_own" ON public.notification_preferences;
CREATE POLICY "prefs_own" ON public.notification_preferences
  FOR ALL USING (
    (select auth.uid()) = (
      SELECT user_id FROM public.profiles
      WHERE id = notification_preferences.profile_id
    )
  );

-- wiedervorlagen
DROP POLICY IF EXISTS "Eigene Wiedervorlagen" ON public.wiedervorlagen;
CREATE POLICY "Eigene Wiedervorlagen" ON public.wiedervorlagen
  FOR ALL TO authenticated
  USING (
    anbieter_id IN (
      SELECT a.id FROM public.anbieter a
      JOIN public.profiles p ON (a.profile_id = p.id)
      WHERE p.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    anbieter_id IN (
      SELECT a.id FROM public.anbieter a
      JOIN public.profiles p ON (a.profile_id = p.id)
      WHERE p.user_id = (select auth.uid())
    )
  );

-- familie_anbieter_notizen
DROP POLICY IF EXISTS "Eigene Familie-Anbieter-Notizen" ON public.familie_anbieter_notizen;
CREATE POLICY "Eigene Familie-Anbieter-Notizen" ON public.familie_anbieter_notizen
  FOR ALL TO authenticated
  USING (
    familie_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    familie_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (select auth.uid())
    )
  );

-- anbieter_dokumente
DROP POLICY IF EXISTS "dokumente_manage_own" ON public.anbieter_dokumente;
CREATE POLICY "dokumente_manage_own" ON public.anbieter_dokumente
  FOR ALL USING (
    anbieter_id IN (
      SELECT a.id FROM public.anbieter a
      JOIN public.profiles p ON (p.id = a.profile_id)
      WHERE p.user_id = (select auth.uid())
    )
  );

-- anfragen_historie
DROP POLICY IF EXISTS "familie_view_own_anfragen_historie" ON public.anfragen_historie;
CREATE POLICY "familie_view_own_anfragen_historie" ON public.anfragen_historie
  FOR SELECT USING (
    anfrage_id IN (
      SELECT id FROM public.anfragen
      WHERE familie_id IN (
        SELECT id FROM public.profiles
        WHERE user_id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "anbieter_view_own_anfragen_historie" ON public.anfragen_historie;
CREATE POLICY "anbieter_view_own_anfragen_historie" ON public.anfragen_historie
  FOR SELECT USING (
    anfrage_id IN (
      SELECT id FROM public.anfragen
      WHERE anbieter_id IN (
        SELECT id FROM public.anbieter
        WHERE profile_id IN (
          SELECT id FROM public.profiles
          WHERE user_id = (select auth.uid())
        )
      )
    )
  );
