
-- Referral tracking table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reward_amount numeric NOT NULL DEFAULT 50,
  reward_redeemed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (as referrer)
CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id);

-- Users can view referrals where they are the referred
CREATE POLICY "Users can view as referred" ON public.referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referred_id);

-- System/authenticated can insert referrals
CREATE POLICY "Authenticated can insert referrals" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referred_id);

-- Admins can view all
CREATE POLICY "Admins can view all referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Admins can update referrals
CREATE POLICY "Admins can update referrals" ON public.referrals
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Trigger: when admin updates support_tickets.admin_notes, insert a notification
CREATE OR REPLACE FUNCTION public.notify_ticket_reply()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes AND NEW.admin_notes IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, description, emoji, type)
    VALUES (
      NEW.user_id,
      'Support Reply: ' || LEFT(NEW.subject, 40),
      LEFT(NEW.admin_notes, 200),
      '🎫',
      'support'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ticket_reply
  AFTER UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_reply();
