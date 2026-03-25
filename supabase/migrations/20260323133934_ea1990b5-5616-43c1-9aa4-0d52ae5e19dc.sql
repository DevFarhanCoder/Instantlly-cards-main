
CREATE TABLE public.business_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  full_name TEXT NOT NULL,
  birthdate DATE,
  anniversary DATE,
  gender TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  location TEXT,
  maps_link TEXT,
  company_name TEXT,
  job_title TEXT,
  company_phone TEXT,
  company_email TEXT,
  website TEXT,
  company_address TEXT,
  company_maps_link TEXT,
  logo_url TEXT,
  description TEXT,
  business_hours TEXT,
  category TEXT,
  established_year TEXT,
  instagram TEXT,
  facebook TEXT,
  linkedin TEXT,
  youtube TEXT,
  twitter TEXT,
  keywords TEXT,
  offer TEXT,
  services TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cards" ON public.business_cards FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cards" ON public.business_cards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON public.business_cards FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cards" ON public.business_cards FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Public can view all cards" ON public.business_cards FOR SELECT TO anon USING (true);

CREATE TRIGGER update_business_cards_updated_at BEFORE UPDATE ON public.business_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
