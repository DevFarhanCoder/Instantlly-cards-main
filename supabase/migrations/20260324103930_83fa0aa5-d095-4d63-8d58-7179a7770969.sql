
-- Business leads table for lead generation forms
CREATE TABLE public.business_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_card_id UUID NOT NULL REFERENCES public.business_cards(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'contact_form',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_leads ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a lead (public form)
CREATE POLICY "Anyone can submit leads" ON public.business_leads
  FOR INSERT TO public WITH CHECK (true);

-- Business owners can view leads for their business
CREATE POLICY "Owners can view leads" ON public.business_leads
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.business_cards
    WHERE business_cards.id = business_leads.business_card_id
      AND business_cards.user_id = auth.uid()
  ));

-- Business owners can update lead status
CREATE POLICY "Owners can update leads" ON public.business_leads
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.business_cards
    WHERE business_cards.id = business_leads.business_card_id
      AND business_cards.user_id = auth.uid()
  ));

-- Admins can view all leads
CREATE POLICY "Admins can view all leads" ON public.business_leads
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER set_business_leads_updated_at
  BEFORE UPDATE ON public.business_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
