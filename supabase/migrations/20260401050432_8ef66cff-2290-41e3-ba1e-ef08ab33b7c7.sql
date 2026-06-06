ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

INSERT INTO storage.buckets (id, name, public) VALUES ('member-documents', 'member-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can upload docs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'member-documents');

CREATE POLICY "Anyone can view docs" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'member-documents');

CREATE POLICY "Admins can delete docs" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'member-documents' AND public.has_role(auth.uid(), 'admin'));