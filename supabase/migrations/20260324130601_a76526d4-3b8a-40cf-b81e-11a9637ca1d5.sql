
-- Activity Logs table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text,
  entity_id text,
  user_id uuid,
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert activity logs" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Admin Alerts table
CREATE TABLE public.admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  severity text DEFAULT 'medium',
  message text NOT NULL,
  entity_id text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view alerts" ON public.admin_alerts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update alerts" ON public.admin_alerts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert alerts" ON public.admin_alerts
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Campaigns table
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  campaign_type text DEFAULT 'push',
  target_audience text DEFAULT 'all',
  status text DEFAULT 'draft',
  sent_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaigns" ON public.campaigns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for admin_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_alerts;

-- Triggers to auto-log activity
CREATE OR REPLACE FUNCTION public.log_activity_on_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.activity_logs (event_type, entity_type, entity_id, user_id, description)
  VALUES ('new_booking', 'booking', NEW.id::text, NEW.user_id, 'New booking at ' || NEW.business_name);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_booking AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.log_activity_on_booking();

CREATE OR REPLACE FUNCTION public.log_activity_on_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.activity_logs (event_type, entity_type, entity_id, user_id, description)
  VALUES ('new_review', 'review', NEW.id::text, NEW.user_id, NEW.rating || '-star review');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_review AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.log_activity_on_review();

CREATE OR REPLACE FUNCTION public.log_activity_on_business()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.activity_logs (event_type, entity_type, entity_id, user_id, description)
  VALUES ('new_business', 'business', NEW.id::text, NEW.user_id, 'New listing: ' || NEW.full_name);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_business AFTER INSERT ON public.business_cards
FOR EACH ROW EXECUTE FUNCTION public.log_activity_on_business();

CREATE OR REPLACE FUNCTION public.log_activity_on_dispute()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.activity_logs (event_type, entity_type, entity_id, user_id, description)
  VALUES ('new_dispute', 'dispute', NEW.id::text, NEW.user_id, NEW.dispute_type || ' dispute filed');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_dispute AFTER INSERT ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.log_activity_on_dispute();

CREATE OR REPLACE FUNCTION public.log_activity_on_ticket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.activity_logs (event_type, entity_type, entity_id, user_id, description)
  VALUES ('new_ticket', 'ticket', NEW.id::text, NEW.user_id, 'Support: ' || LEFT(NEW.subject, 60));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_ticket AFTER INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.log_activity_on_ticket();
