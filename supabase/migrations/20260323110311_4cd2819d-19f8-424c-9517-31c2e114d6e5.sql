-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  venue TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  price NUMERIC DEFAULT 0,
  is_free BOOLEAN DEFAULT true,
  max_attendees INTEGER,
  organizer_name TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_registrations table
CREATE TABLE public.event_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  qr_code TEXT NOT NULL UNIQUE,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Events are publicly viewable
CREATE POLICY "Events are viewable by everyone"
  ON public.events FOR SELECT USING (true);

-- Anyone can register
CREATE POLICY "Anyone can register for events"
  ON public.event_registrations FOR INSERT WITH CHECK (true);

-- Registrations viewable for QR verification
CREATE POLICY "Anyone can view registrations"
  ON public.event_registrations FOR SELECT USING (true);

-- Allow updating verification status
CREATE POLICY "Anyone can update registration verification"
  ON public.event_registrations FOR UPDATE USING (true);

-- Indexes
CREATE INDEX idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX idx_event_registrations_qr_code ON public.event_registrations(qr_code);
CREATE INDEX idx_events_date ON public.events(date);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed sample events
INSERT INTO public.events (title, description, venue, date, time, category, is_free, price, max_attendees, organizer_name, is_featured) VALUES
  ('Maharashtra Shree Samman 2026', 'Grand awards ceremony celebrating excellence across Maharashtra', 'Mayor Hall, Juhu Lane, Andheri (W)', '2026-04-17', '7:00 PM', 'Awards', true, 0, 500, 'Maharashtra Foundation', true),
  ('Digital Marketing Summit', 'Learn cutting-edge digital marketing strategies from industry leaders', 'Jio Convention Centre, Mumbai', '2026-04-25', '10:00 AM', 'Conference', false, 1999, 300, 'DigiConnect India', true),
  ('Startup India Meetup', 'Network with founders, investors and mentors in the startup ecosystem', 'WeWork, BKC Mumbai', '2026-05-05', '6:30 PM', 'Networking', true, 0, 100, 'Startup India', true),
  ('Food and Flavours Festival', 'A culinary extravaganza featuring 50+ top restaurants', 'Bandra Kurla Complex, Mumbai', '2026-05-10', '11:00 AM', 'Festival', false, 499, 2000, 'Mumbai Foodie Collective', false),
  ('AI and Tech Conference 2026', 'Explore the future of AI, blockchain and emerging technologies', 'HICC, Hyderabad', '2026-05-20', '9:00 AM', 'Conference', false, 2999, 500, 'TechVista Events', true),
  ('Wellness and Yoga Retreat', 'A day of mindfulness, yoga, and holistic wellness', 'Rishikesh Yoga Shala, Mumbai', '2026-06-01', '6:00 AM', 'Wellness', false, 799, 50, 'Inner Peace Foundation', false);