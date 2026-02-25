-- Storage bucket для фотографий товаров
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-photos',
  'product-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Политики: разрешить чтение всем, запись — аутентифицированным (или по anon key — зависит от настроек)
-- Для публичного доступа на запись (если используете только anon key):
CREATE POLICY "Public read product photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-photos');

CREATE POLICY "Public insert product photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-photos');

CREATE POLICY "Public update product photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-photos');

CREATE POLICY "Public delete product photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-photos');
