
-- Business Follows table
CREATE TABLE public.business_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_card_id UUID NOT NULL REFERENCES public.business_cards(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, business_card_id)
);

ALTER TABLE public.business_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follow counts" ON public.business_follows
  FOR SELECT TO public USING (true);

CREATE POLICY "Users can follow businesses" ON public.business_follows
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow businesses" ON public.business_follows
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Business Staff table
CREATE TABLE public.business_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_card_id UUID NOT NULL REFERENCES public.business_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'staff',
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage staff" ON public.business_staff
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.business_cards WHERE id = business_staff.business_card_id AND user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.business_cards WHERE id = business_staff.business_card_id AND user_id = auth.uid())
  );

CREATE POLICY "Staff can view own record" ON public.business_staff
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Business Reports table
CREATE TABLE public.business_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit reports" ON public.business_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own reports" ON public.business_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reports" ON public.business_reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports" ON public.business_reports
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Disputes table
CREATE TABLE public.disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dispute_type TEXT NOT NULL DEFAULT 'booking',
  reference_id TEXT NOT NULL,
  business_id TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit disputes" ON public.disputes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own disputes" ON public.disputes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all disputes" ON public.disputes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update disputes" ON public.disputes
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Push Campaigns table
CREATE TABLE public.push_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_card_id UUID NOT NULL REFERENCES public.business_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'followers',
  sent_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.push_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage campaigns" ON public.push_campaigns
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Enable realtime for follows
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_follows;
