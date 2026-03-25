CREATE POLICY "Business owners can view spam flags for their reviews"
ON public.spam_flags FOR SELECT TO authenticated
USING (
  entity_type = 'review' AND
  EXISTS (
    SELECT 1 FROM reviews r
    JOIN business_cards bc ON bc.id::text = r.business_id
    WHERE r.id::text = spam_flags.entity_id
    AND bc.user_id = auth.uid()
  )
);