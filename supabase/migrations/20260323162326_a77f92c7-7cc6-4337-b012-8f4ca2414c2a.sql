
-- Add approval_status to business_cards
ALTER TABLE public.business_cards ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';

-- Add approval_status to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';

-- Add approval_status to ad_campaigns (for admin review before going live)
ALTER TABLE public.ad_campaigns ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';

-- Add is_flagged to reviews for moderation
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false;

-- Support tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can create and view own tickets
CREATE POLICY "Users can insert own tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete tickets" ON public.support_tickets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Categories table for admin management
CREATE TABLE IF NOT EXISTS public.platform_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '📁',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories" ON public.platform_categories FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert categories" ON public.platform_categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update categories" ON public.platform_categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete categories" ON public.platform_categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed categories from existing data
INSERT INTO public.platform_categories (name, emoji, sort_order) VALUES
  ('Travel', '✈️', 1), ('Technology', '💻', 2), ('Shopping', '🛒', 3),
  ('Rentals', '🔑', 4), ('Lifestyle', '💄', 5), ('Health', '⚕️', 6),
  ('Education', '🎓', 7), ('Construction', '🔨', 8), ('Automotive', '🚗', 9),
  ('Business', '💼', 10), ('Services', '🔧', 11), ('Real Estate', '🏡', 12),
  ('AC & Appliances', '❄️', 13), ('Agriculture', '🌾', 14),
  ('Apparel & Fashion', '👗', 15), ('Food & Dining', '🍽️', 16),
  ('Events', '🎉', 17), ('Legal', '⚖️', 18)
ON CONFLICT DO NOTHING;

-- Admin needs to view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin needs to view all bookings
CREATE POLICY "Admins can view all bookings" ON public.bookings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin needs to view all vouchers (including inactive)
CREATE POLICY "Admins can view all vouchers" ON public.vouchers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update any voucher" ON public.vouchers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin needs to view/update all events
CREATE POLICY "Admins can update any event" ON public.events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin needs to view/update all ad campaigns
CREATE POLICY "Admins can view all ad campaigns" ON public.ad_campaigns FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update any ad campaign" ON public.ad_campaigns FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin needs to view/update all reviews
CREATE POLICY "Admins can update any review" ON public.reviews FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete any review" ON public.reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin needs to view all subscriptions
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update any business card (for moderation)
CREATE POLICY "Admins can update any card" ON public.business_cards FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin can insert notifications for any user (broadcasting)
CREATE POLICY "Admins can insert notifications for anyone" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can view all notifications
CREATE POLICY "Admins can view all notifications" ON public.notifications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all conversations and messages
CREATE POLICY "Admins can view all conversations" ON public.conversations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all messages" ON public.messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all claimed vouchers
CREATE POLICY "Admins can view all claimed vouchers" ON public.claimed_vouchers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all card analytics
CREATE POLICY "Admins can view all analytics" ON public.card_analytics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
