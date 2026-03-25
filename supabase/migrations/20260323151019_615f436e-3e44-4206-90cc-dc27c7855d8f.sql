
-- Remove FK constraints from user_id columns that reference auth.users
-- This is best practice to avoid coupling with the auth schema
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;
ALTER TABLE public.claimed_vouchers DROP CONSTRAINT IF EXISTS claimed_vouchers_user_id_fkey;
ALTER TABLE public.vouchers DROP CONSTRAINT IF EXISTS vouchers_user_id_fkey;
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_user_id_fkey;
ALTER TABLE public.ad_campaigns DROP CONSTRAINT IF EXISTS ad_campaigns_user_id_fkey;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
