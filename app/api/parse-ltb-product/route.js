import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const LTB_HOST = 'ltb.ge';
const BUCKET_PHOTOS = 'product-photos';
const GEORGIAN_REGEX = /[\u10A0-\u10FF]/; // грузинский алфавит

const fetchOpts = {
  headers: {
    Accept: 'text/html,application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ka,en;q=0.9',
  },
};

/** Извлекает из URL LTB артикул (pap3069) и размеры (2800122018mm → 2800×1220×18). */
function parseLtbSlug(url) {
  const slugMatch = url && url.match(/productview\/\d+-([^/?#]+)/);
  const slug = slugMatch ? slugMatch[1] : '';
  let article = null;
  let dimensions = null;
  // Артикул: первая часть слага (pap3069) или число в конце (2277)
  const articleMatch = slug.match(/^([a-z]+\d+)/i) || slug.match(/-(\d{4,6})$/);
  if (articleMatch) article = articleMatch[1].toUpperCase().replace(/^([A-Z]+)(\d+)$/, (_, a, b) => a + b);
  // Размеры: 2800122018mm или 2800*1220*18 в слаге
  const dimMatch = slug.match(/(\d{4})\s*[\*x×]\s*(\d{4})\s*[\*x×]?\s*(\d{2,4})?/i) || slug.match(/(\d{4})(\d{4})(\d{2,4})mm/i);
  if (dimMatch) {
    if (dimMatch[0].includes('*') || dimMatch[0].includes('×')) {
      dimensions = `${dimMatch[1]}×${dimMatch[2]}${dimMatch[3] ? '×' + dimMatch[3] : ''}`;
    } else {
      dimensions = `${dimMatch[1]}×${dimMatch[2]}×${dimMatch[3] || ''}`.replace(/×$/, '');
    }
  }
  return { article, dimensions };
}

/** Маппинг грузинских названий характеристик LTB на русские. */
const LTB_SPEC_LABELS = {
  'ფერი': 'Цвет',
  'ბრენდი': 'Бренд',
  'მასალა': 'Материал',
  'წონა': 'Вес',
  'წარმოშობის ქვეყანა': 'Страна происхождения',
  'კლასი': 'Класс',
};
/** Значения для перевода (грузинский → русский). */
const LTB_VALUE_TRANSLATE = {
  'თეთრი': 'Белый', 'თურქეთი': 'Турция', 'ავსტრია': 'Австрия', 'გერმანია': 'Германия',
  'მეტალი+პლასტმასი': 'Металл+пластик', 'სტანდარტი': 'Стандарт',
};

/** Парсит страницу товара LTB: название, артикул, размеры, цена, страна, характеристики. */
function parseLtbProductPageFull(html, productUrl) {
  const result = {
    name: null,
    article: null,
    dimensions: null,
    cost_per_sheet: null,
    cost_per_m2: null,
    cost_per_piece: null,
    country: null,
    photo_url: null,
    extra: {},
    url: productUrl,
  };

  // Название: <title>, og:title или <h1>
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i) || html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (titleMatch) result.name = titleMatch[1].trim().replace(/\s+/g, ' ');
  if (!result.name) {
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) result.name = h1Match[1].trim().replace(/\s+/g, ' ');
  }

  // Артикул: внутренний код LTB (000014841) из Schema.org/sku или со страницы, не часть названия (PAP3052)
  const skuSchemaMatch = html.match(/schema\.org\/sku[\s\S]{0,80}"@value"\s*:\s*"([^"]+)"/) || html.match(/"http:\/\/schema\.org\/sku"[\s\S]{0,80}"@value"\s*:\s*"([^"]+)"/);
  if (skuSchemaMatch) result.article = skuSchemaMatch[1].trim();
  if (!result.article) {
    const articleNumMatch = html.match(/>\s*(0\d{8,})\s*</) || html.match(/"sku"\s*:\s*"(\d{6,})"/) || html.match(/"article"\s*:\s*"(\d{6,})"/);
    if (articleNumMatch) result.article = articleNumMatch[1].trim();
  }

  // Размеры: 2800*1220*18 или 2800×1220×18 в тексте (ზომა:, size и т.д.)
  const dimInHtml = html.match(/(\d{3,4})\s*[\*×x]\s*(\d{3,4})\s*[\*×x]?\s*(\d{2,4})?\s*м?м?м?/i) || html.match(/(\d{4})(\d{4})(\d{2,4})\s*м?м?/i);
  if (dimInHtml) {
    if (dimInHtml[0].includes('*') || dimInHtml[0].includes('×')) {
      result.dimensions = `${dimInHtml[1]}×${dimInHtml[2]}${dimInHtml[3] ? '×' + dimInHtml[3] : ''}`.replace(/×$/, '');
    } else {
      result.dimensions = `${dimInHtml[1]}×${dimInHtml[2]}×${dimInHtml[3] || ''}`.replace(/×$/, '');
    }
  }

  /** Размеры считаем листовыми только если есть «толщина» 1–100 мм (формат длина×ширина×толщина). */
  const isSheetLikeDimensions = (dims) => {
    if (!dims) return false;
    const parts = dims.replace(/×/g, ' ').replace(/\*/g, ' ').split(/\s+/).map((s) => parseFloat(s)).filter((n) => !Number.isNaN(n) && n > 0);
    if (parts.length < 3) return false;
    const [a, b, c] = parts;
    const thickness = Math.min(a, b, c);
    const side1 = Math.max(a, b, c);
    const side2 = [a, b, c].sort((x, y) => x - y)[1];
    return thickness >= 1 && thickness <= 100 && side1 >= 500 && side2 >= 500;
  };

  // Цена: Schema.org и варианты в HTML
  let price = null;
  const pricePatterns = [
    /schema\.org\/price[\s\S]{0,300}"@value"\s*:\s*"(\d+[.,]?\d*)"/,
    /"http:\/\/schema\.org\/price"[\s\S]{0,100}"@value"\s*:\s*"(\d+[.,]?\d*)"/,
    /(\d+)\s*\.?\s*(\d*)\s*₾/,
    /(\d+)\s*[,.]\s*(\d*)\s*₾/,
    /"price"\s*:\s*(\d+[,.]?\d*)/,
  ];
  for (const re of pricePatterns) {
    const m = html.match(re);
    if (!m) continue;
    const num = m[2] !== undefined ? parseFloat(m[1] + '.' + (m[2] || '0')) : parseFloat(String(m[1]).replace(',', '.'));
    if (!Number.isNaN(num) && num >= 0 && num < 1e6) {
      price = Math.round(num * 100) / 100;
      break;
    }
  }
  // Листовой товар (размеры в формате листа: длина×ширина×толщина) — цена за лист и за м²; иначе — только за штуку
  const sheetLike = isSheetLikeDimensions(result.dimensions);
  if (price != null && sheetLike && result.dimensions) {
    result.cost_per_sheet = price;
    const parts = result.dimensions.replace(/×/g, ' ').replace(/\*/g, ' ').split(/\s+/).map((s) => parseFloat(s)).filter((n) => !Number.isNaN(n) && n > 0);
    if (parts.length >= 2) {
      const areaM2 = (parts[0] / 1000) * (parts[1] / 1000);
      if (areaM2 > 0) result.cost_per_m2 = Math.round((price / areaM2) * 100) / 100;
    }
  } else if (price != null) {
    result.cost_per_piece = price;
  }

  // Страна: წარმოშობის ქვეყანა:თურქეთი или "country" в JSON
  const countryMatch = html.match(/წარმოშობის ქვეყანა\s*:\s*([^<\s,]+)/) ||
    html.match(/"countryOfOrigin"[^"]*"([^"]+)"/) ||
    html.match(/"country"\s*:\s*"([^"]+)"/);
  if (countryMatch) {
    const c = countryMatch[1].trim();
    // Маппинг грузинского названия на русский при необходимости
    if (c === 'თურქეთი') result.country = 'Турция';
    else if (c === 'ავსტრია') result.country = 'Австрия';
    else if (c === 'გერმანია') result.country = 'Германия';
    else result.country = c;
  }

  // Фото: Schema.org image или og:image (на LTB в schema.org/image есть @id с URL картинки)
  const imageSchemaMatch = html.match(/schema\.org\/image[\s\S]{0,200}"@id"\s*:\s*"([^"]+)"/) || html.match(/"http:\/\/schema\.org\/image"[\s\S]{0,200}"@id"\s*:\s*"([^"]+)"/);
  if (imageSchemaMatch) result.photo_url = imageSchemaMatch[1].trim();
  if (!result.photo_url) {
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogImageMatch && ogImageMatch[1].trim()) result.photo_url = ogImageMatch[1].trim();
  }

  // Характеристики (მახასიათებლები): ключ:значение из списка или из schema.org/description
  const specKeyRegex = /(ფერი|ბრენდი|მასალა|წონა|წარმოშობის ქვეყანა|კლასი)\s*:\s*([^\s<]+(?:\+[^\s<]+)*)/g;
  const seen = new Set();
  let specM;
  specKeyRegex.lastIndex = 0;
  while ((specM = specKeyRegex.exec(html)) !== null) {
    const rawKey = specM[1].trim();
    const rawVal = specM[2].trim();
    const label = LTB_SPEC_LABELS[rawKey] || rawKey;
    if (label && rawVal && !seen.has(label)) {
      seen.add(label);
      const val = LTB_VALUE_TRANSLATE[rawVal] || rawVal;
      result.extra[label] = val;
    }
  }
  const descMatch = html.match(/schema\.org\/description[\s\S]{0,300}"@value"\s*:\s*"([^"]+)"/);
  if (descMatch && descMatch[1]) {
    const desc = descMatch[1];
    specKeyRegex.lastIndex = 0;
    while ((specM = specKeyRegex.exec(desc)) !== null) {
      const rawKey = specM[1].trim();
      const rawVal = specM[2].trim();
      const label = LTB_SPEC_LABELS[rawKey] || rawKey;
      if (label && rawVal && !seen.has(label)) {
        seen.add(label);
        result.extra[label] = LTB_VALUE_TRANSLATE[rawVal] || rawVal;
      }
    }
  }
  if (result.country && !result.extra['Страна происхождения']) result.extra['Страна происхождения'] = result.country;

  // Дополняем из URL только размеры (артикул из слага — это код типа PAP3052, не внутренний артикул LTB)
  const fromSlug = parseLtbSlug(productUrl);
  if (!result.dimensions && fromSlug.dimensions) result.dimensions = fromSlug.dimensions;

  return result;
}

/** Переводит текст с грузинского на русский через MyMemory API. */
async function translateGeorgianToRussian(text) {
  if (!text || !GEORGIAN_REGEX.test(text)) return text;
  try {
    const encoded = encodeURIComponent(text.slice(0, 2000)); // лимит запроса
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encoded}&langpair=ka|ru`, { method: 'GET' });
    if (!res.ok) return text;
    const json = await res.json();
    const translated = json?.responseData?.translatedText;
    if (translated && translated !== text) return translated;
  } catch (_) {}
  return text;
}

/** Скачивает изображение по URL и загружает в Supabase Storage. Возвращает публичный URL или null. */
async function uploadImageToSupabase(imageUrl, tabId) {
  if (!imageUrl || !tabId) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    const imgRes = await fetch(imageUrl, { headers: { ...fetchOpts.headers } });
    if (!imgRes.ok) return null;
    const contentType = imgRes.headers.get('content-type') || '';
    const ext = imageUrl.includes('.webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpg';
    const buffer = await imgRes.arrayBuffer();
    const supabase = createClient(supabaseUrl, supabaseKey);
    const path = `${tabId}/ltb-${Date.now()}.${ext}`;
    const { data: uploadData, error } = await supabase.storage.from(BUCKET_PHOTOS).upload(path, buffer, {
      contentType: imgRes.headers.get('content-type') || `image/${ext}`,
      upsert: true,
    });
    if (error) return null;
    const { data: urlData } = supabase.storage.from(BUCKET_PHOTOS).getPublicUrl(uploadData.path);
    return urlData.publicUrl;
  } catch (_) {
    return null;
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const url = (body.url || '').trim();
    const tabId = body.tabId || null;
    if (!url || !url.includes(LTB_HOST)) {
      return NextResponse.json(
        { ok: false, error: 'Укажите ссылку на товар LTB (ltb.ge)' },
        { status: 400 }
      );
    }

    const res = await fetch(url, fetchOpts);
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Страница недоступна: ${res.status}` },
        { status: 502 }
      );
    }
    const html = await res.text();
    const data = parseLtbProductPageFull(html, url);

    if (data.name && GEORGIAN_REGEX.test(data.name)) {
      data.name = await translateGeorgianToRussian(data.name);
    }

    if (data.photo_url && tabId) {
      const ourPhotoUrl = await uploadImageToSupabase(data.photo_url, tabId);
      if (ourPhotoUrl) data.photo_url = ourPhotoUrl;
    }

    return NextResponse.json({
      ok: true,
      data: {
        name: data.name,
        article: data.article,
        dimensions: data.dimensions,
        cost_per_sheet: data.cost_per_sheet,
        cost_per_m2: data.cost_per_m2,
        cost_per_piece: data.cost_per_piece,
        country: data.country,
        link: data.url,
        photo_url: data.photo_url || null,
        extra: data.extra && Object.keys(data.extra).length > 0 ? data.extra : null,
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
