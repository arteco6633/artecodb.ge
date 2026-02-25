-- Иерархия категорий: каждая вкладка может иметь родителя (подкатегории)
ALTER TABLE tabs ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES tabs(id) ON DELETE CASCADE;

-- Убираем уникальность имени: одна и та же подкатегория может быть в разных ветках
ALTER TABLE tabs DROP CONSTRAINT IF EXISTS tabs_name_key;

-- Уникальность имени в рамках одного родителя (не два "Петли" под одной папкой)
CREATE UNIQUE INDEX IF NOT EXISTS tabs_parent_name_key ON tabs (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

COMMENT ON COLUMN tabs.parent_id IS 'Родительская категория; NULL — корневая';
