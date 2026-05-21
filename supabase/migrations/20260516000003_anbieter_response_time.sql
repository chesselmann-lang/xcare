-- ─────────────────────────────────────────────────────────────────────────────
-- S300: avg_response_time_h column on anbieter + refresh function
-- ─────────────────────────────────────────────────────────────────────────────

-- Column: average hours between anfrage.created_at and first status change
ALTER TABLE public.anbieter
  ADD COLUMN IF NOT EXISTS avg_response_time_h numeric(6,2) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_anbieter_avg_response_time
  ON public.anbieter (avg_response_time_h)
  WHERE avg_response_time_h IS NOT NULL;

-- Function: recompute avg_response_time_h for a single anbieter
-- Called after each status change (e.g. from statusAendern server action).
CREATE OR REPLACE FUNCTION public.refresh_anbieter_response_time(p_anbieter_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg numeric(6,2);
BEGIN
  SELECT AVG(EXTRACT(EPOCH FROM (h.changed_at - a.created_at)) / 3600.0)
  INTO v_avg
  FROM anfragen a
  JOIN (
    -- First status change per anfrage (from 'offen' to anything else)
    SELECT DISTINCT ON (anfrage_id)
      anfrage_id,
      created_at AS changed_at
    FROM anfragen_status_history
    ORDER BY anfrage_id, created_at ASC
  ) h ON h.anfrage_id = a.id
  WHERE a.anbieter_id = p_anbieter_id
    AND h.changed_at > a.created_at
    AND EXTRACT(EPOCH FROM (h.changed_at - a.created_at)) / 3600.0 < 720 -- cap at 30 days
  ;

  UPDATE anbieter
  SET avg_response_time_h = v_avg,
      updated_at = now()
  WHERE id = p_anbieter_id;
END;
$$;

COMMENT ON COLUMN public.anbieter.avg_response_time_h IS
  'Average hours from anfrage creation to first status change. NULL = no data yet. Refreshed via refresh_anbieter_response_time().';
