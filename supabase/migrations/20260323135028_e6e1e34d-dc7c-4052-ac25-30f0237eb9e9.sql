
-- Create storage bucket for business logos
INSERT INTO storage.buckets (id, name, public) VALUES ('business-logos', 'business-logos', true);

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'business-logos');

-- Allow public read access to logos
CREATE POLICY "Public can view logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'business-logos');

-- Allow users to update their own logos
CREATE POLICY "Users can update own logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'business-logos');

-- Allow users to delete their own logos
CREATE POLICY "Users can delete own logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'business-logos');
