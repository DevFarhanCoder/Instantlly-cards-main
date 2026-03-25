
-- Business photo gallery
CREATE TABLE public.business_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_card_id UUID NOT NULL REFERENCES public.business_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view business photos" ON public.business_photos
  FOR SELECT TO public USING (true);

CREATE POLICY "Owners can manage photos" ON public.business_photos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update photos" ON public.business_photos
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete photos" ON public.business_photos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Service pricing
CREATE TABLE public.service_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_card_id UUID NOT NULL REFERENCES public.business_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  service_name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  duration TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view service pricing" ON public.service_pricing
  FOR SELECT TO public USING (true);

CREATE POLICY "Owners can insert pricing" ON public.service_pricing
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update pricing" ON public.service_pricing
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete pricing" ON public.service_pricing
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Analytics events tracking
CREATE TABLE public.card_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_card_id UUID NOT NULL REFERENCES public.business_cards(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'view', 'phone_click', 'message_click', 'direction_click', 'website_click', 'share'
  visitor_id TEXT, -- anonymous session id
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.card_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone can insert analytics (tracking)
CREATE POLICY "Anyone can insert analytics" ON public.card_analytics
  FOR INSERT TO public WITH CHECK (true);

-- Business owners can view their own analytics
CREATE POLICY "Owners can view own analytics" ON public.card_analytics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_cards
      WHERE business_cards.id = card_analytics.business_card_id
      AND business_cards.user_id = auth.uid()
    )
  );

-- Business hours structured (day-wise)
CREATE TABLE public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_card_id UUID NOT NULL REFERENCES public.business_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday..6=Saturday
  open_time TEXT NOT NULL DEFAULT '09:00',
  close_time TEXT NOT NULL DEFAULT '18:00',
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view business hours" ON public.business_hours
  FOR SELECT TO public USING (true);

CREATE POLICY "Owners can manage hours" ON public.business_hours
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update hours" ON public.business_hours
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete hours" ON public.business_hours
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for business gallery photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-photos', 'business-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for business-photos bucket
CREATE POLICY "Anyone can view business photos storage" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'business-photos');

CREATE POLICY "Authenticated users can upload business photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'business-photos');

CREATE POLICY "Users can delete own business photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'business-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
