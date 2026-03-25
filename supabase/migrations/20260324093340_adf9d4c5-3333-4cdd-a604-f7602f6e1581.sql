
ALTER TABLE public.business_cards
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS telegram text,
  ADD COLUMN IF NOT EXISTS service_mode text NOT NULL DEFAULT 'visit';
