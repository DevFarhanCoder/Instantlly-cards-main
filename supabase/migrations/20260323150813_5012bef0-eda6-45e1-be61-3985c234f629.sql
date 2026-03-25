
-- Remove FK to auth.users on business_cards (best practice: don't FK to auth schema)
ALTER TABLE public.business_cards DROP CONSTRAINT IF EXISTS business_cards_user_id_fkey;
