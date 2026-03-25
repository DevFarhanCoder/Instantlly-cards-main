
-- 1. Storage bucket for ad creatives
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-creatives', 'ad-creatives', true);

-- Storage RLS: anyone can view
CREATE POLICY "Anyone can view ad creatives" ON storage.objects FOR SELECT TO public USING (bucket_id = 'ad-creatives');

-- Storage RLS: authenticated users can upload
CREATE POLICY "Authenticated users can upload ad creatives" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ad-creatives');

-- Storage RLS: owners can delete their uploads
CREATE POLICY "Users can delete own ad creatives" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ad-creatives' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Add creative_urls array to ad_campaigns for A/B variants
ALTER TABLE public.ad_campaigns ADD COLUMN IF NOT EXISTS creative_urls text[] DEFAULT '{}';

-- 3. Create ad_variants table for A/B tracking
CREATE TABLE public.ad_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  creative_url text NOT NULL,
  label text NOT NULL DEFAULT 'A',
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_variants ENABLE ROW LEVEL SECURITY;

-- Ad variants RLS
CREATE POLICY "Anyone can view ad variants" ON public.ad_variants FOR SELECT TO public USING (true);

CREATE POLICY "Owners can insert ad variants" ON public.ad_variants FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.ad_campaigns WHERE id = campaign_id AND user_id = auth.uid()));

CREATE POLICY "Owners can update ad variants" ON public.ad_variants FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ad_campaigns WHERE id = campaign_id AND user_id = auth.uid()));

CREATE POLICY "Owners can delete ad variants" ON public.ad_variants FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ad_campaigns WHERE id = campaign_id AND user_id = auth.uid()));

-- 4. Public SELECT on active ad_campaigns for BannerAdSlot delivery
CREATE POLICY "Anyone can view active approved ads" ON public.ad_campaigns FOR SELECT TO public
  USING (status = 'active' AND approval_status = 'approved');

-- 5. RPC: record_ad_impression
CREATE OR REPLACE FUNCTION public.record_ad_impression(p_campaign_id uuid, p_variant_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ad_campaigns SET impressions = impressions + 1 WHERE id = p_campaign_id;
  IF p_variant_id IS NOT NULL THEN
    UPDATE public.ad_variants SET impressions = impressions + 1 WHERE id = p_variant_id;
  END IF;
  -- Budget pacing: auto-pause if spent >= total_budget
  UPDATE public.ad_campaigns SET status = 'completed'
    WHERE id = p_campaign_id AND total_budget IS NOT NULL AND spent >= total_budget;
  -- Auto-pause if end_date passed
  UPDATE public.ad_campaigns SET status = 'completed'
    WHERE id = p_campaign_id AND end_date IS NOT NULL AND end_date < CURRENT_DATE;
END;
$$;

-- 6. RPC: record_ad_click
CREATE OR REPLACE FUNCTION public.record_ad_click(p_campaign_id uuid, p_variant_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ad_campaigns SET clicks = clicks + 1 WHERE id = p_campaign_id;
  IF p_variant_id IS NOT NULL THEN
    UPDATE public.ad_variants SET clicks = clicks + 1 WHERE id = p_variant_id;
  END IF;
END;
$$;

-- 7. Trigger to auto-set total_budget on insert/update
CREATE OR REPLACE FUNCTION public.set_ad_total_budget()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.total_budget := NEW.daily_budget * NEW.duration_days;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ad_total_budget_trigger
  BEFORE INSERT OR UPDATE OF daily_budget, duration_days ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_ad_total_budget();
