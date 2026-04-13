-- Add payment fields to event_registrations
ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS payment_order_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_signature TEXT,
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC,
  ADD COLUMN IF NOT EXISTS ticket_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Index for payment_id uniqueness checks
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_registrations_payment_id
  ON public.event_registrations(payment_id)
  WHERE payment_id IS NOT NULL;

-- Index for user-based lookups
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id
  ON public.event_registrations(user_id)
  WHERE user_id IS NOT NULL;
