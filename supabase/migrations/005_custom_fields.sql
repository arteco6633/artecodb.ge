-- Пользовательские поля категорий и данные в позициях

-- В каждой категории можно добавить свои поля: массив { id, label }
ALTER TABLE tabs ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]';

-- В позициях хранятся значения пользовательских полей: { "custom_xxx": "значение", ... }
ALTER TABLE items ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}';

COMMENT ON COLUMN tabs.custom_fields IS 'Массив объектов { id: string, label: string } — пользовательские поля категории';
COMMENT ON COLUMN items.custom_data IS 'Объект: ключ = id пользовательского поля, значение = строка или число';
