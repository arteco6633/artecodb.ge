-- Таблицы для базы в стиле Notion (Artecodb)

-- Вкладки (категории): AGT, Аркопа, Фурнитура, Петли, Направляющие и пользовательские
CREATE TABLE IF NOT EXISTS tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Позиции в каждой вкладке
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_id UUID NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  article TEXT,
  cost_per_m2 NUMERIC(12, 2),
  cost_per_sheet NUMERIC(12, 2),
  photo_url TEXT,
  dimensions TEXT,
  country TEXT,
  link TEXT,
  -- Для парсера LTB: внешняя ссылка и последняя актуализация
  ltb_url TEXT,
  ltb_price NUMERIC(12, 2),
  ltb_available BOOLEAN,
  ltb_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_items_tab_id ON items(tab_id);
CREATE INDEX IF NOT EXISTS idx_items_article ON items(article);
CREATE INDEX IF NOT EXISTS idx_items_ltb_url ON items(ltb_url);

-- Триггер обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tabs_updated_at
  BEFORE UPDATE ON tabs
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- Начальные вкладки
INSERT INTO tabs (name, sort_order) VALUES
  ('AGT', 1),
  ('Аркопа', 2),
  ('Фурнитура', 3),
  ('Петли', 4),
  ('Направляющие', 5)
ON CONFLICT (name) DO NOTHING;
