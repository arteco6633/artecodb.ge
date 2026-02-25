-- Настраиваемые поля категорий и стоимость за штуку

-- Поле "стоимость за штуку" для фурнитуры и т.п.
ALTER TABLE items ADD COLUMN IF NOT EXISTS cost_per_piece NUMERIC(12, 2);

-- Какие поля показывать в категории (массив id полей). NULL = все по умолчанию.
ALTER TABLE tabs ADD COLUMN IF NOT EXISTS enabled_fields JSONB DEFAULT NULL;

-- По умолчанию все поля включены (приложение подставит дефолт если NULL)
COMMENT ON COLUMN tabs.enabled_fields IS 'Массив id полей: name, article, cost_per_m2, cost_per_sheet, cost_per_piece, dimensions, photo, country, link, ltb';
