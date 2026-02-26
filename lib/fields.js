/** Список всех полей позиции и их меток. name всегда обязателен. */
export const FIELD_IDS = [
  'name',
  'article',
  'cost_per_m2',
  'cost_per_sheet',
  'cost_per_piece',
  'dimensions',
  'photo',
  'country',
  'link',
  'ltb',
  'documentation_url',
  'official_website_url',
  'video_url',
];

export const FIELD_LABELS = {
  name: 'Название',
  article: 'Артикул',
  cost_per_m2: 'Стоимость за м²',
  cost_per_sheet: 'Стоимость за лист',
  cost_per_piece: 'Стоимость за штуку',
  dimensions: 'Размеры',
  photo: 'Фото',
  country: 'Страна производитель',
  link: 'Ссылка',
  ltb: 'LTB (цена / наличие)',
  documentation_url: 'Документация',
  official_website_url: 'Официальный сайт',
  video_url: 'Видео',
};

/** Поля, которые можно отключать в настройках категории (name всегда показывается). */
export const CONFIGURABLE_FIELD_IDS = FIELD_IDS.filter((id) => id !== 'name');

export function getEnabledFields(tab) {
  const raw = tab?.enabled_fields;
  if (Array.isArray(raw) && raw.length > 0) return raw;
  return FIELD_IDS;
}

/** Пользовательские поля категории (добавленные вручную). */
export function getCustomFields(tab) {
  const raw = tab?.custom_fields;
  if (!Array.isArray(raw)) return [];
  return raw.filter((f) => f && f.id && f.label);
}

/** Генерирует уникальный id для нового пользовательского поля. */
export function newCustomFieldId() {
  return 'custom_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/**
 * Парсит размеры листа (мм) и возвращает площадь в м².
 * Ожидает формат: "2800×1220×18" или "2800*1220" или "2800 1220" — первые два числа длина и ширина.
 */
export function parseSheetDimensionsToAreaM2(dimensions) {
  if (!dimensions || typeof dimensions !== 'string') return null;
  const str = dimensions.trim().replace(/×/g, ' ').replace(/\*/g, ' ').replace(/x/gi, ' ');
  const numbers = str.split(/[\s,;]+/).map((s) => parseFloat(s)).filter((n) => !Number.isNaN(n) && n > 0);
  if (numbers.length < 2) return null;
  const lengthMm = numbers[0];
  const widthMm = numbers[1];
  const areaM2 = (lengthMm / 1000) * (widthMm / 1000);
  return areaM2 > 0 ? areaM2 : null;
}

/**
 * Рассчитывает стоимость за м² по стоимости листа и размерам листа (в мм).
 * Возвращает число или null.
 */
export function calcCostPerM2FromSheet(costPerSheet, dimensions) {
  if (costPerSheet == null || Number(costPerSheet) <= 0) return null;
  const areaM2 = parseSheetDimensionsToAreaM2(dimensions);
  if (areaM2 == null || areaM2 <= 0) return null;
  const cost = Number(costPerSheet) / areaM2;
  return Math.round(cost * 100) / 100;
}
