
-- Table to store user's synced phone contacts
CREATE TABLE public.synced_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone_number text NOT NULL,
  contact_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, phone_number)
);

ALTER TABLE public.synced_contacts ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own synced contacts
CREATE POLICY "Users can view own synced contacts" ON public.synced_contacts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own synced contacts" ON public.synced_contacts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own synced contacts" ON public.synced_contacts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RPC function to find business cards matching synced contact phone numbers
CREATE OR REPLACE FUNCTION public.get_network_cards(p_user_id uuid)
RETURNS SETOF public.business_cards
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bc.*
  FROM public.business_cards bc
  INNER JOIN public.synced_contacts sc ON (
    -- Normalize: strip spaces, dashes, and compare last 10 digits
    RIGHT(REGEXP_REPLACE(bc.phone, '[^0-9]', '', 'g'), 10) =
    RIGHT(REGEXP_REPLACE(sc.phone_number, '[^0-9]', '', 'g'), 10)
  )
  WHERE sc.user_id = p_user_id
    AND bc.user_id != p_user_id
  ORDER BY bc.created_at DESC;
$$;
