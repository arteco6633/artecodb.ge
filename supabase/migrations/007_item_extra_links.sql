-- Дополнительные ссылки у позиции: документация, официальный сайт, видео
ALTER TABLE items ADD COLUMN IF NOT EXISTS documentation_url TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS official_website_url TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN items.documentation_url IS 'Ссылка на документацию (PDF, каталог и т.д.)';
COMMENT ON COLUMN items.official_website_url IS 'Ссылка на официальный сайт производителя';
COMMENT ON COLUMN items.video_url IS 'Ссылка на видео (YouTube, и т.д.)';
