
ALTER TABLE public.business_cards ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.business_cards ADD COLUMN IF NOT EXISTS longitude double precision;

-- Update demo data with coordinates
UPDATE public.business_cards SET latitude = 19.0760, longitude = 72.8777 WHERE full_name = 'Sharma Electronics';
UPDATE public.business_cards SET latitude = 19.0830, longitude = 72.8900 WHERE full_name = 'Green Farms Organic';
UPDATE public.business_cards SET latitude = 12.9716, longitude = 77.5946 WHERE full_name = 'TechVista Solutions';
UPDATE public.business_cards SET latitude = 28.6139, longitude = 77.2090 WHERE full_name = 'Delhi Darbar Restaurant';
UPDATE public.business_cards SET latitude = 19.0896, longitude = 72.8656 WHERE full_name = 'StyleCraft Salon';
UPDATE public.business_cards SET latitude = 18.5204, longitude = 73.8567 WHERE full_name = 'FitZone Gym';
UPDATE public.business_cards SET latitude = 19.0176, longitude = 72.8562 WHERE full_name = 'Bright Minds Academy';
UPDATE public.business_cards SET latitude = 13.0827, longitude = 80.2707 WHERE full_name = 'AutoCare Workshop';
UPDATE public.business_cards SET latitude = 22.5726, longitude = 88.3639 WHERE full_name = 'Legal Eagles Associates';
UPDATE public.business_cards SET latitude = 17.3850, longitude = 78.4867 WHERE full_name = 'PetCare Clinic';
UPDATE public.business_cards SET latitude = 23.0225, longitude = 72.5714 WHERE full_name = 'HomeDecor Studio';
UPDATE public.business_cards SET latitude = 26.9124, longitude = 75.7873 WHERE full_name = 'CloudNet Services';
