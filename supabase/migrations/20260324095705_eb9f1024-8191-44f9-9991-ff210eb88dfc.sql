
-- Loyalty points table
CREATE TABLE public.loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_points_user_id_unique UNIQUE (user_id)
);

-- Points transactions log
CREATE TABLE public.points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'earn',
  source TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add read_at to messages for read receipts
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL;

-- Enable RLS
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own points" ON public.loyalty_points FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users read own transactions" ON public.points_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System insert points" ON public.loyalty_points FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "System update points" ON public.loyalty_points FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System insert transactions" ON public.points_transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Function to award points
CREATE OR REPLACE FUNCTION public.award_loyalty_points(
  p_user_id UUID, p_points INTEGER, p_source TEXT, p_description TEXT DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.loyalty_points (user_id, points, lifetime_points)
  VALUES (p_user_id, p_points, p_points)
  ON CONFLICT (user_id) DO UPDATE
  SET points = loyalty_points.points + p_points,
      lifetime_points = loyalty_points.lifetime_points + p_points,
      updated_at = now();

  INSERT INTO public.points_transactions (user_id, points, type, source, description)
  VALUES (p_user_id, p_points, 'earn', p_source, p_description);

  INSERT INTO public.notifications (user_id, title, description, emoji, type)
  VALUES (p_user_id, '🎉 Points Earned!', 'You earned ' || p_points || ' points for ' || p_source, '⭐', 'reward');
END;
$$;

-- Trigger: award points on booking
CREATE OR REPLACE FUNCTION public.handle_booking_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.award_loyalty_points(NEW.user_id, 50, 'booking', 'Booked ' || NEW.business_name);
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_booking_points AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.handle_booking_points();

-- Trigger: award points on review
CREATE OR REPLACE FUNCTION public.handle_review_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.award_loyalty_points(NEW.user_id, 25, 'review', 'Left a review');
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_review_points AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.handle_review_points();

-- Trigger: award points on referral completion
CREATE OR REPLACE FUNCTION public.handle_referral_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM public.award_loyalty_points(NEW.referrer_id, 100, 'referral', 'Successful referral');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_referral_points AFTER UPDATE ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.handle_referral_points();

-- Function to redeem points
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
  p_user_id UUID, p_points INTEGER, p_description TEXT DEFAULT 'Voucher redemption'
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE current_points INTEGER;
BEGIN
  SELECT points INTO current_points FROM public.loyalty_points WHERE user_id = p_user_id;
  IF current_points IS NULL OR current_points < p_points THEN RETURN false; END IF;
  UPDATE public.loyalty_points SET points = points - p_points, updated_at = now() WHERE user_id = p_user_id;
  INSERT INTO public.points_transactions (user_id, points, type, source, description)
  VALUES (p_user_id, -p_points, 'redeem', 'voucher_redemption', p_description);
  INSERT INTO public.notifications (user_id, title, description, emoji, type)
  VALUES (p_user_id, '🎁 Points Redeemed!', 'You redeemed ' || p_points || ' points: ' || p_description, '🎁', 'reward');
  RETURN true;
END;
$$;
