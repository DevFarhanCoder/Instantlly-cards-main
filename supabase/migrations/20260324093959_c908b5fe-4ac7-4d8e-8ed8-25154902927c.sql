
CREATE OR REPLACE FUNCTION public.auto_pause_expired_ads()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected integer;
BEGIN
  WITH updated AS (
    UPDATE public.ad_campaigns
    SET status = 'completed', updated_at = now()
    WHERE status = 'active'
      AND (
        (end_date IS NOT NULL AND end_date < CURRENT_DATE)
        OR (total_budget IS NOT NULL AND spent >= total_budget)
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO affected FROM updated;
  RETURN affected;
END;
$$;
