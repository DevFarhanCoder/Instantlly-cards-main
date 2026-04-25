-- Add admin-uploaded event fields to the events table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS sr_no INTEGER,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS days INTEGER,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS source_website TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_by_admin BOOLEAN NOT NULL DEFAULT false;

-- When admin uploads, set date = start_date (existing field used by app)
-- The app reads `date` for ordering, start_date holds the same value

-- Allow admin backend (service role / postgres superuser) to insert events
-- RLS is bypassed for postgres role, but add a policy for service role too
CREATE POLICY "Service role can insert events"
  ON public.events FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update events"
  ON public.events FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role can delete events"
  ON public.events FOR DELETE
  TO service_role
  USING (true);

-- Index for fast admin-uploaded event queries
CREATE INDEX IF NOT EXISTS idx_events_uploaded_by_admin ON public.events(uploaded_by_admin);
CREATE INDEX IF NOT EXISTS idx_events_city ON public.events(city);
CREATE INDEX IF NOT EXISTS idx_events_state ON public.events(state);
