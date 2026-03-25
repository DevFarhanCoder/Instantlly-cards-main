
CREATE OR REPLACE FUNCTION public.auto_pause_expired_ads()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected integer;
  rec record;
BEGIN
  FOR rec IN
    SELECT id, user_id, title,
      CASE
        WHEN total_budget IS NOT NULL AND spent >= total_budget THEN 'budget exhausted'
        ELSE 'end date reached'
      END AS reason
    FROM public.ad_campaigns
    WHERE status = 'active'
      AND (
        (end_date IS NOT NULL AND end_date < CURRENT_DATE)
        OR (total_budget IS NOT NULL AND spent >= total_budget)
      )
  LOOP
    UPDATE public.ad_campaigns SET status = 'completed', updated_at = now() WHERE id = rec.id;

    INSERT INTO public.notifications (user_id, title, description, emoji, type)
    VALUES (
      rec.user_id,
      '📢 Ad Campaign Paused',
      'Your campaign "' || LEFT(rec.title, 40) || '" was auto-paused: ' || rec.reason || '.',
      '⏸️',
      'ad'
    );
  END LOOP;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
