
-- 1. Add photo_urls to reviews
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}';

-- 2. Create review-photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('review-photos', 'review-photos', true) ON CONFLICT DO NOTHING;

-- Storage policies for review-photos
CREATE POLICY "Anyone can view review photos" ON storage.objects FOR SELECT USING (bucket_id = 'review-photos');
CREATE POLICY "Authenticated users can upload review photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'review-photos');
CREATE POLICY "Users can delete own review photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'review-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Add is_verified to business_cards
ALTER TABLE public.business_cards ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- 4. Create business_locations table for multi-location support
CREATE TABLE IF NOT EXISTS public.business_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_card_id uuid NOT NULL REFERENCES public.business_cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  branch_name text NOT NULL,
  address text,
  phone text,
  latitude double precision,
  longitude double precision,
  business_hours text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view locations" ON public.business_locations FOR SELECT USING (true);
CREATE POLICY "Owners can insert locations" ON public.business_locations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update locations" ON public.business_locations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners can delete locations" ON public.business_locations FOR DELETE TO authenticated USING (auth.uid() = user_id);
