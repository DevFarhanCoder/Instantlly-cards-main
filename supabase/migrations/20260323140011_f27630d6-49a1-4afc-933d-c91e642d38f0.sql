
-- 1. Vouchers table (businesses create vouchers)
CREATE TABLE public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_card_id uuid REFERENCES public.business_cards(id) ON DELETE CASCADE,
  title text NOT NULL,
  subtitle text,
  category text NOT NULL DEFAULT 'general',
  original_price numeric NOT NULL DEFAULT 0,
  discounted_price numeric NOT NULL DEFAULT 0,
  discount_label text,
  is_popular boolean DEFAULT false,
  expires_at timestamp with time zone,
  max_claims integer,
  terms text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active vouchers" ON public.vouchers
  FOR SELECT TO public USING (status = 'active');

CREATE POLICY "Users can view own vouchers" ON public.vouchers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vouchers" ON public.vouchers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vouchers" ON public.vouchers
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vouchers" ON public.vouchers
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. Claimed vouchers table (customers claim/redeem vouchers)
CREATE TABLE public.claimed_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  voucher_id uuid NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  purchased_at timestamp with time zone NOT NULL DEFAULT now(),
  redeemed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.claimed_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claimed vouchers" ON public.claimed_vouchers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own claimed vouchers" ON public.claimed_vouchers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own claimed vouchers" ON public.claimed_vouchers
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 3. Ad campaigns table
CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_card_id uuid REFERENCES public.business_cards(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  ad_type text NOT NULL DEFAULT 'banner',
  cta text DEFAULT 'Learn More',
  creative_url text,
  target_city text,
  target_age text DEFAULT '18-65',
  target_interests text,
  daily_budget numeric NOT NULL DEFAULT 100,
  duration_days integer NOT NULL DEFAULT 7,
  total_budget numeric GENERATED ALWAYS AS (daily_budget * duration_days) STORED,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  spent numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ad campaigns" ON public.ad_campaigns
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ad campaigns" ON public.ad_campaigns
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ad campaigns" ON public.ad_campaigns
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ad campaigns" ON public.ad_campaigns
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Add user_id to events so business owners can create events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS user_id uuid;

-- 5. Add RLS policies for events CRUD by authenticated users
CREATE POLICY "Authenticated users can insert events" ON public.events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON public.events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON public.events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. Add business_card_id to events for linking
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS business_card_id uuid REFERENCES public.business_cards(id) ON DELETE SET NULL;

-- 7. Enable realtime for vouchers and ad_campaigns
ALTER PUBLICATION supabase_realtime ADD TABLE public.vouchers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.claimed_vouchers;
