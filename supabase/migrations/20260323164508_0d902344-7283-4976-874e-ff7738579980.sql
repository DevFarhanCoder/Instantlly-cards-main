
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS business_reply text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS business_reply_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;
