
-- Admin metrics daily table for cached dashboard stats
CREATE TABLE public.admin_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  total_businesses integer DEFAULT 0,
  total_events integer DEFAULT 0,
  total_vouchers integer DEFAULT 0,
  total_bookings integer DEFAULT 0,
  total_ads integer DEFAULT 0,
  total_reviews integer DEFAULT 0,
  total_subscriptions integer DEFAULT 0,
  total_tickets integer DEFAULT 0,
  total_users integer DEFAULT 0,
  active_ads integer DEFAULT 0,
  active_subscriptions integer DEFAULT 0,
  pending_businesses integer DEFAULT 0,
  pending_events integer DEFAULT 0,
  pending_ads integer DEFAULT 0,
  pending_vouchers integer DEFAULT 0,
  open_tickets integer DEFAULT 0,
  open_disputes integer DEFAULT 0,
  open_reports integer DEFAULT 0,
  flagged_reviews integer DEFAULT 0,
  new_users_today integer DEFAULT 0,
  new_bookings_today integer DEFAULT 0,
  new_businesses_today integer DEFAULT 0,
  revenue_ads numeric DEFAULT 0,
  revenue_subscriptions numeric DEFAULT 0,
  revenue_vouchers numeric DEFAULT 0,
  revenue_events numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(metric_date)
);

-- RLS: only admins can read
ALTER TABLE public.admin_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read metrics"
ON public.admin_metrics_daily
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Spam flags table for detected issues
CREATE TABLE public.spam_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_type text NOT NULL, -- 'duplicate_business', 'review_spam', 'suspicious_signup'
  entity_type text NOT NULL, -- 'business_card', 'review', 'profile'
  entity_id text NOT NULL,
  reason text NOT NULL,
  severity text DEFAULT 'medium', -- 'low', 'medium', 'high'
  is_resolved boolean DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.spam_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage spam flags"
ON public.spam_flags
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
