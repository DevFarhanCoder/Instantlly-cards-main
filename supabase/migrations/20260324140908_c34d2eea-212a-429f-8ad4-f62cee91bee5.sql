
-- Create a security definer function to transfer a voucher to another user by email
CREATE OR REPLACE FUNCTION public.transfer_voucher(
  p_claimed_voucher_id uuid,
  p_recipient_email text
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
  v_voucher_title text;
  v_sender_name text;
BEGIN
  -- Get the claimed voucher info
  SELECT cv.user_id, cv.status, v.title
  INTO v_sender_id, v_voucher_status, v_voucher_title
  FROM public.claimed_vouchers cv
  LEFT JOIN public.vouchers v ON v.id = cv.voucher_id
  WHERE cv.id = p_claimed_voucher_id;

  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voucher not found');
  END IF;

  -- Verify the caller owns this voucher
  IF v_sender_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not own this voucher');
  END IF;

  -- Only active vouchers can be transferred
  IF v_voucher_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only active vouchers can be transferred');
  END IF;

  -- Find recipient by email from auth.users
  SELECT id INTO v_recipient_id
  FROM auth.users
  WHERE email = lower(trim(p_recipient_email));

  IF v_recipient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No user found with that email');
  END IF;

  IF v_recipient_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transfer to yourself');
  END IF;

  -- Transfer the voucher
  UPDATE public.claimed_vouchers
  SET user_id = v_recipient_id
  WHERE id = p_claimed_voucher_id;

  -- Get sender name for notification
  SELECT COALESCE(full_name, 'Someone') INTO v_sender_name
  FROM public.profiles WHERE id = v_sender_id;

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
    'You transferred "' || COALESCE(v_voucher_title, 'Voucher') || '" to ' || p_recipient_email,
    '📤',
    'voucher'
  );

  RETURN jsonb_build_object('success', true);
END;
$$;
