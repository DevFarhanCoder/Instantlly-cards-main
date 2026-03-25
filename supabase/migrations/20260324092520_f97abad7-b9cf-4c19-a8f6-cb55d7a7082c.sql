
-- Trigger: auto-upgrade subscription to 'premium' when a referrer reaches 5 completed referrals
CREATE OR REPLACE FUNCTION public.check_referral_plan_upgrade()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  completed_count integer;
BEGIN
  -- Only proceed if status changed to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Count completed referrals for this referrer
    SELECT COUNT(*) INTO completed_count
    FROM public.referrals
    WHERE referrer_id = NEW.referrer_id
      AND status = 'completed';

    -- If 5 or more completed referrals, upgrade their subscription
    IF completed_count >= 5 THEN
      -- Update existing subscription to premium
      UPDATE public.subscriptions
      SET plan = 'premium',
          status = 'active',
          updated_at = now(),
          expires_at = now() + interval '30 days'
      WHERE user_id = NEW.referrer_id
        AND plan IN ('free', 'basic');

      -- If no subscription exists, create one
      IF NOT FOUND THEN
        INSERT INTO public.subscriptions (user_id, plan, status, billing_cycle, started_at, expires_at)
        VALUES (NEW.referrer_id, 'premium', 'active', 'monthly', now(), now() + interval '30 days')
        ON CONFLICT DO NOTHING;
      END IF;

      -- Send notification to the referrer
      INSERT INTO public.notifications (user_id, title, description, emoji, type)
      VALUES (
        NEW.referrer_id,
        '🎉 Plan Upgraded to Premium!',
        'Congratulations! You referred 5 businesses and earned a free Premium plan upgrade for 30 days!',
        '👑',
        'reward'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_referral_completed
  AFTER UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.check_referral_plan_upgrade();
