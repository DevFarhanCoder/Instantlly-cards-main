CREATE POLICY "Business owners can reply to reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM business_cards
    WHERE business_cards.id::text = reviews.business_id
    AND business_cards.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM business_cards
    WHERE business_cards.id::text = reviews.business_id
    AND business_cards.user_id = auth.uid()
  )
);