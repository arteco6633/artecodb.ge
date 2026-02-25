/**
 * Парсер LTB.ge — актуализация цен и наличия в Supabase.
 * Запуск: node scripts/ltb-parser.js
 * Требует в .env.local или переменных окружения: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

try {
  require('dotenv').config({ path: '.env.local' });
} catch (_) {}

const LTB_SHOP = 'https://ltb.ge/ge/shop';
const LTB_HOST = 'ltb.ge';
const fetchOpts = {
  headers: {
    Accept: 'text/html',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ka,en;q=0.9',
  },
};

function parseLtbListing(html) {
  const products = [];
  const blocks = html.split(/<a\s+href="\/ge\/shop\/productview\//);
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const urlMatch = block.match(/^([^"]+)/);
    const url = urlMatch
      ? 'https://ltb.ge/ge/shop/productview/' + urlMatch[1].replace(/"/g, '').trim().split('"')[0]
      : null;
    const articleMatch = block.match(/>\s*(\d{6,})\s*</);
    const priceMatch = block.match(/(\d+)\s*\.?\s*(\d*)\s*₾/);
    const price = priceMatch ? parseFloat(priceMatch[1] + '.' + (priceMatch[2] || '0')) : null;
    if (url || articleMatch || price != null) {
      products.push({
        url: url ? url.split('"')[0] : null,
        article: articleMatch ? articleMatch[1].trim() : null,
        price,
      });
    }
  }
  return products;
}

/** Площадь листа в м² по строкам размеров (мм), например "2800×1220×18". */
function parseSheetDimensionsToAreaM2(dimensions) {
  if (!dimensions || typeof dimensions !== 'string') return null;
  const str = dimensions.trim().replace(/×/g, ' ').replace(/\*/g, ' ').replace(/x/gi, ' ');
  const numbers = str.split(/[\s,;]+/).map((s) => parseFloat(s)).filter((n) => !Number.isNaN(n) && n > 0);
  if (numbers.length < 2) return null;
  const areaM2 = (numbers[0] / 1000) * (numbers[1] / 1000);
  return areaM2 > 0 ? areaM2 : null;
}

function calcCostPerM2FromSheet(costPerSheet, dimensions) {
  if (costPerSheet == null || Number(costPerSheet) <= 0) return null;
  const areaM2 = parseSheetDimensionsToAreaM2(dimensions);
  if (areaM2 == null || areaM2 <= 0) return null;
  return Math.round((Number(costPerSheet) / areaM2) * 100) / 100;
}

function parseLtbProductPage(html, productUrl) {
  let price = null;
  const schemaMatch = html.match(/schema\.org\/price[\s\S]{0,300}"@value"\s*:\s*"(\d+[.,]?\d*)"/);
  if (schemaMatch) price = parseFloat(String(schemaMatch[1]).replace(',', '.'));
  if (price == null || Number.isNaN(price)) {
    const priceMatch = html.match(/(\d+)\s*\.?\s*(\d*)\s*₾/);
    price = priceMatch ? parseFloat(priceMatch[1] + '.' + (priceMatch[2] || '0')) : null;
  }
  const available = /კალათაში|добавить|add to cart|buy|в корзину/i.test(html) || price != null;
  return { url: productUrl, price, available };
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Задайте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  let productsFromListing = [];
  const listingRes = await fetch(LTB_SHOP, fetchOpts);
  if (listingRes.ok) {
    const html = await listingRes.text();
    productsFromListing = parseLtbListing(html);
    console.log('Найдено товаров в каталоге LTB:', productsFromListing.length);
  } else {
    console.log('Каталог LTB недоступен, будем обновлять по ссылкам на товары.');
  }

  const { data: items } = await supabase.from('items').select('id, name, article, link, ltb_url, dimensions');
  let updated = 0;
  for (const item of items || []) {
    const itemUrl = (item.ltb_url || item.link || '').trim();
    const isLtbLink = itemUrl && itemUrl.includes(LTB_HOST);

    let match = null;
    if (productsFromListing.length > 0) {
      const matchByUrl =
        itemUrl &&
        productsFromListing.find((p) => p.url && (itemUrl.includes(p.url) || (p.url && itemUrl.includes(p.url.split('?')[0]))));
      const matchByArticle =
        item.article &&
        productsFromListing.find((p) => p.article && String(p.article).trim() === String(item.article).trim());
      match = matchByUrl || matchByArticle;
    }

    if (!match && isLtbLink) {
      try {
        const pageRes = await fetch(itemUrl, fetchOpts);
        if (pageRes.ok) {
          const pageHtml = await pageRes.text();
          const parsed = parseLtbProductPage(pageHtml, itemUrl);
          if (parsed.price != null || parsed.available) {
            match = { url: parsed.url, price: parsed.price, available: parsed.available };
          }
        }
      } catch (_) {}
    }

    if (match) {
      const updatePayload = {
        ltb_price: match.price,
        ltb_available: match.available !== undefined ? match.available : true,
        ltb_updated_at: new Date().toISOString(),
      };
      if (match.price != null) {
        updatePayload.cost_per_sheet = match.price;
        const costM2 = item.dimensions ? calcCostPerM2FromSheet(match.price, item.dimensions) : null;
        if (costM2 != null) updatePayload.cost_per_m2 = costM2;
      }
      if (match.url && !item.ltb_url) updatePayload.ltb_url = match.url;
      const { error } = await supabase.from('items').update(updatePayload).eq('id', item.id);
      if (error) console.error(item.name, error.message);
      else updated++;
    }
  }
  console.log('Обновлено позиций в базе:', updated);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
