
-- Create voucher transfer history table
CREATE TABLE public.voucher_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claimed_voucher_id uuid NOT NULL REFERENCES public.claimed_vouchers(id),
  voucher_id uuid NOT NULL REFERENCES public.vouchers(id),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  sender_phone text,
  recipient_phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voucher_transfers ENABLE ROW LEVEL SECURITY;

-- Users can see transfers they sent or received
CREATE POLICY "Users can view own transfers" ON public.voucher_transfers
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- System inserts via security definer function
CREATE POLICY "System can insert transfers" ON public.voucher_transfers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Drop old function and recreate with phone-based lookup + history logging
DROP FUNCTION IF EXISTS public.transfer_voucher(uuid, text);

CREATE OR REPLACE FUNCTION public.transfer_voucher(
  p_claimed_voucher_id uuid,
  p_recipient_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sender_id uuid;
  v_recipient_id uuid;
  v_voucher_status text;
  v_voucher_id uuid;
  v_voucher_title text;
  v_sender_name text;
  v_sender_phone text;
  v_clean_phone text;
BEGIN
  -- Clean phone: keep last 10 digits
  v_clean_phone := RIGHT(REGEXP_REPLACE(p_recipient_phone, '[^0-9]', '', 'g'), 10);

  IF length(v_clean_phone) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please enter a valid 10-digit phone number');
  END IF;

  -- Get the claimed voucher info
  SELECT cv.user_id, cv.status, cv.voucher_id, v.title
  INTO v_sender_id, v_voucher_status, v_voucher_id, v_voucher_title
  FROM public.claimed_vouchers cv
  LEFT JOIN public.vouchers v ON v.id = cv.voucher_id
  WHERE cv.id = p_claimed_voucher_id;

  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voucher not found');
  END IF;

  IF v_sender_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not own this voucher');
  END IF;

  IF v_voucher_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only active vouchers can be transferred');
  END IF;

  -- Find recipient by phone from profiles
  SELECT p.id INTO v_recipient_id
  FROM public.profiles p
  WHERE RIGHT(REGEXP_REPLACE(p.phone, '[^0-9]', '', 'g'), 10) = v_clean_phone;

  IF v_recipient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No user found with that phone number');
  END IF;

  IF v_recipient_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transfer to yourself');
  END IF;

  -- Get sender info
  SELECT COALESCE(full_name, 'Someone'), phone INTO v_sender_name, v_sender_phone
  FROM public.profiles WHERE id = v_sender_id;

  -- Transfer the voucher
  UPDATE public.claimed_vouchers
  SET user_id = v_recipient_id
  WHERE id = p_claimed_voucher_id;

  -- Log the transfer
  INSERT INTO public.voucher_transfers (claimed_voucher_id, voucher_id, sender_id, recipient_id, sender_phone, recipient_phone)
  VALUES (p_claimed_voucher_id, v_voucher_id, v_sender_id, v_recipient_id, v_sender_phone, p_recipient_phone);

  -- Notify recipient
  INSERT INTO public.notifications (user_id, title, description, emoji, type)
  VALUES (
    v_recipient_id,
    '🎁 Voucher Received!',
    v_sender_name || ' transferred a voucher to you: ' || COALESCE(v_voucher_title, 'Voucher'),
    '🎁',
    'voucher'
  );

  -- Notify sender
  INSERT INTO public.notifications (user_id, title, description, emoji, type)
  VALUES (
    v_sender_id,
    '📤 Voucher Transferred',
    'You transferred "' || COALESCE(v_voucher_title, 'Voucher') || '" to ' || p_recipient_phone,
    '📤',
    'voucher'
  );

  RETURN jsonb_build_object('success', true);
END;
$$;
