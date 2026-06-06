
-- Extend hostels table with extra fields
ALTER TABLE public.hostels
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS document_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS meal_deadline_time time NOT NULL DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS meal_deadline_day text NOT NULL DEFAULT 'previous';

-- meal_deadline_day: 'previous' = today's meal must be set before yesterday at deadline_time
--                    'current'  = today's meal must be set before today at deadline_time

-- Storage bucket for hostel assets (logos + documents)
INSERT INTO storage.buckets (id, name, public)
VALUES ('hostel-assets', 'hostel-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for hostel-assets
DROP POLICY IF EXISTS "Hostel assets public read" ON storage.objects;
CREATE POLICY "Hostel assets public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'hostel-assets');

-- Authenticated upload to hostel-assets
DROP POLICY IF EXISTS "Authenticated upload hostel assets" ON storage.objects;
CREATE POLICY "Authenticated upload hostel assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'hostel-assets');

DROP POLICY IF EXISTS "Authenticated update hostel assets" ON storage.objects;
CREATE POLICY "Authenticated update hostel assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'hostel-assets');

DROP POLICY IF EXISTS "Authenticated delete hostel assets" ON storage.objects;
CREATE POLICY "Authenticated delete hostel assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'hostel-assets');

-- Allow admins to view subscriptions for their hostel (already exists) and add UPDATE for super admin only — already covered by ALL policy.

-- Allow admins/managers to read hostel meal deadline (they already can SELECT via own hostel policy)
