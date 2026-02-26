-- Bucket для загружаемой документации (PDF, каталоги и т.д.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-docs',
  'product-docs',
  true,
  20971520,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read product docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-docs');

CREATE POLICY "Public insert product docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-docs');

CREATE POLICY "Public update product docs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-docs');

CREATE POLICY "Public delete product docs"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-docs');
