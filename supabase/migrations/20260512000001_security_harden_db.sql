-- =====================================================================
-- security: harden DB-level security (Supabase advisor findings 2026-05-12)
-- 1. Enable RLS on ki_audit_log partition tables
-- 2. Convert SECURITY DEFINER views → SECURITY INVOKER
-- 3. Fix mutable search_path on app functions
-- 4. Revoke anon EXECUTE on handle_new_user trigger function
-- 5. Add RLS policies to anbieter_team (had RLS but zero policies)
-- =====================================================================

-- -----------------------------------------------------------------------
-- 1. Enable RLS on ki_audit_log partition tables
--    Parent ki_audit_log already has RLS + policies; partitions inherit
--    those policies once RLS is enabled on each child.
-- -----------------------------------------------------------------------
ALTER TABLE public.ki_audit_log_2026_05 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ki_audit_log_2026_06 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ki_audit_log_2026_07 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ki_audit_log_2026_08 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ki_audit_log_2026_09 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ki_audit_log_2026_10 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ki_audit_log_2026_11 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ki_audit_log_2026_12 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ki_audit_log_2027_01 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ki_audit_log_2027_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ki_audit_log_2027_03 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ki_audit_log_2027_04 ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------
-- 2. Convert SECURITY DEFINER views → SECURITY INVOKER (Postgres 15+)
--    These views previously ran as the view owner, bypassing RLS on the
--    underlying tables. With security_invoker = true they run in the
--    querying user's security context, so RLS is enforced correctly.
-- -----------------------------------------------------------------------
ALTER VIEW public.anbieter_zahlungs_uebersicht  SET (security_invoker = true);
ALTER VIEW public.ki_audit_stats                SET (security_invoker = true);
ALTER VIEW public.mdk_compliance_uebersicht     SET (security_invoker = true);
ALTER VIEW public.schicht_konflikte             SET (security_invoker = true);
ALTER VIEW public.schichten_wochenuebersicht    SET (security_invoker = true);
ALTER VIEW public.vitalwert_verlauf             SET (security_invoker = true);
ALTER VIEW public.wohlbefinden_verlauf          SET (security_invoker = true);
ALTER VIEW public.zertifikat_ablaufwarnungen    SET (security_invoker = true);

-- -----------------------------------------------------------------------
-- 3. Fix mutable search_path on app functions
--    SECURITY DEFINER functions get search_path = '' (empty) to prevent
--    search_path injection attacks. Non-SECURITY DEFINER triggers and
--    helpers get search_path = public for explicitness.
-- -----------------------------------------------------------------------

-- SECURITY DEFINER: empty search_path (body already uses schema-qualified refs)
ALTER FUNCTION public.handle_new_user()
  SET search_path = '';

-- SECURITY DEFINER geo search: pin to public (has unqualified refs + PostGIS)
ALTER FUNCTION public.suche_care_workers_geo(
  double precision, double precision, double precision,
  text, text, integer, text, boolean, integer, integer
) SET search_path = public;

-- Non-SECURITY DEFINER app functions: pin to public for safety
ALTER FUNCTION public.anbieter_im_umkreis(double precision, double precision, double precision)
  SET search_path = public;

ALTER FUNCTION public.match_leistungen(vector, double precision, integer)
  SET search_path = public;

ALTER FUNCTION public.check_anspruchs_profile_limit()
  SET search_path = public;

ALTER FUNCTION public.create_ki_audit_partition(date)
  SET search_path = public;

ALTER FUNCTION public.set_updated_at()
  SET search_path = public;

ALTER FUNCTION public.update_anbieter_search_vector()
  SET search_path = public;

ALTER FUNCTION public.update_anspruchs_profile_updated_at()
  SET search_path = public;

ALTER FUNCTION public.update_care_workers_updated_at()
  SET search_path = public;

ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public;

ALTER FUNCTION public.update_white_label_updated_at()
  SET search_path = public;

-- -----------------------------------------------------------------------
-- 4. Revoke anon EXECUTE on handle_new_user
--    This is a SECURITY DEFINER trigger function — it should only fire
--    via the trigger on auth.users, never be callable through the API.
--    Revoking from anon does not affect trigger execution.
-- -----------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

-- -----------------------------------------------------------------------
-- 5. Add RLS policies to anbieter_team
--    RLS was enabled but zero policies existed → all row access blocked.
--    Adds two policies:
--    a) Authenticated users can read their own membership entry
--    b) Anbieter owner can fully manage (CRUD) their team
-- -----------------------------------------------------------------------
CREATE POLICY "anbieter_team_mitglied_lesen"
  ON public.anbieter_team
  FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "anbieter_team_besitzer_verwalten"
  ON public.anbieter_team
  FOR ALL
  TO authenticated
  USING (
    anbieter_id IN (
      SELECT a.id
      FROM public.anbieter a
      JOIN public.profiles p ON p.id = a.profile_id
      WHERE p.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    anbieter_id IN (
      SELECT a.id
      FROM public.anbieter a
      JOIN public.profiles p ON p.id = a.profile_id
      WHERE p.user_id = (SELECT auth.uid())
    )
  );
