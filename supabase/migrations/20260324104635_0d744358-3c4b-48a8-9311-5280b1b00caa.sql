
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id
  FROM public.business_cards
  WHERE id = NEW.business_card_id;

  IF owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, description, emoji, type)
    VALUES (
      owner_id,
      '📩 New Lead Inquiry',
      'You received a new inquiry from ' || NEW.full_name || COALESCE(': "' || LEFT(NEW.message, 80) || '"', ''),
      '📩',
      'lead'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_lead_notify
  AFTER INSERT ON public.business_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_lead();
