import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { calcCostPerM2FromSheet } from '../../../lib/fields';

const LTB_SHOP = 'https://ltb.ge/ge/shop';
const LTB_HOST = 'ltb.ge';
const fetchOpts = {
  headers: {
    Accept: 'text/html,application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ka,en;q=0.9',
  },
};

/** Извлекает ID товара из URL LTB: productview/32054-... → 32054 */
function getProductIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/productview\/(\d+)(?:-|$|\?)/);
  return m ? m[1] : null;
}

/** Пытается получить цену из возможного API LTB (по ID товара). */
async function fetchLtbProductApi(productId) {
  const candidates = [
    `https://ltb.ge/api/shop/product/${productId}`,
    `https://ltb.ge/api/products/${productId}`,
    `https://ltb.ge/ge/api/product/${productId}`,
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { ...fetchOpts, headers: { ...fetchOpts.headers, Accept: 'application/json' } });
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('json')) continue;
      const data = await res.json();
      const price = data?.price ?? data?.product?.price ?? data?.data?.price ?? data?.currentPrice;
      if (typeof price === 'number' && price >= 0) return { price, available: true };
      if (typeof price === 'string') {
        const num = parseFloat(price.replace(/[^\d.,]/g, '').replace(',', '.'));
        if (!Number.isNaN(num) && num >= 0) return { price: num, available: true };
      }
    } catch (_) {}
  }
  return null;
}

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

/** Парсит цену из HTML. LTB вставляет цену в JSON-LD (Schema.org): "http://schema.org/price": [{ "@value": "196.26" }] */
function parseLtbProductPage(html, productUrl) {
  let price = null;
  const patterns = [
    // Schema.org price в JSON-LD (как на LTB.ge)
    /schema\.org\/price[\s\S]{0,300}"@value"\s*:\s*"(\d+[.,]?\d*)"/,
    /"http:\/\/schema\.org\/price"[\s\S]{0,100}"@value"\s*:\s*"(\d+[.,]?\d*)"/,
    // Обычный вид в HTML
    /(\d+)\s*\.?\s*(\d*)\s*₾/,
    /(\d+)\s*[,.]\s*(\d*)\s*₾/,
    /"price"\s*:\s*(\d+[,.]?\d*)/,
    /"currentPrice"\s*:\s*(\d+[,.]?\d*)/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (!m) continue;
    let num = NaN;
    if (m[2] !== undefined) {
      num = parseFloat(m[1] + '.' + (m[2] || '0'));
    } else if (m[1] !== undefined) {
      num = parseFloat(String(m[1]).replace(',', '.'));
    }
    if (!Number.isNaN(num) && num >= 0 && num < 1e6) {
      price = Math.round(num * 100) / 100;
      break;
    }
  }
  const available = /კალათაში|добавить|add to cart|buy|в корзину/i.test(html) || price != null;
  return { url: productUrl, price, available };
}

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: items } = await supabase.from('items').select('id, name, article, link, ltb_url, dimensions');
    const updates = [];
    const details = [];
    let productsFromListing = [];

    const listingRes = await fetch(LTB_SHOP, fetchOpts);
    if (listingRes.ok) {
      const html = await listingRes.text();
      productsFromListing = parseLtbListing(html);
    }

    const itemsWithLtb = (items || []).filter((i) => {
      const u = (i.ltb_url || i.link || '').trim();
      return u && u.includes(LTB_HOST);
    });

    for (const item of items || []) {
      const itemUrl = (item.ltb_url || item.link || '').trim();
      const isLtbLink = itemUrl && itemUrl.includes(LTB_HOST);

      let match = null;
      let detail = { name: item.name, url: itemUrl ? itemUrl.slice(0, 60) + '…' : '', status: 'no_link' };

      if (productsFromListing.length > 0) {
        const matchByUrl =
          itemUrl &&
          productsFromListing.find((p) => p.url && (itemUrl.includes(p.url) || (p.url && itemUrl.includes(p.url.split('?')[0]))));
        const matchByArticle =
          item.article &&
          productsFromListing.find((p) => p.article && String(p.article).trim() === String(item.article).trim());
        match = matchByUrl || matchByArticle;
        if (match) detail.status = 'from_listing';
      }

      if (!match && isLtbLink) {
        const productId = getProductIdFromUrl(itemUrl);
        const apiResult = productId ? await fetchLtbProductApi(productId) : null;
        if (apiResult) {
          match = { url: itemUrl, price: apiResult.price, available: apiResult.available };
          detail.status = 'from_api';
        }
      }

      if (!match && isLtbLink) {
        try {
          const pageRes = await fetch(itemUrl, fetchOpts);
          detail.status = pageRes.ok ? 'fetch_ok_no_price' : 'fetch_failed';
          if (pageRes.ok) {
            const pageHtml = await pageRes.text();
            const parsed = parseLtbProductPage(pageHtml, itemUrl);
            if (parsed.price != null || parsed.available) {
              match = { url: parsed.url, price: parsed.price, available: parsed.available };
              detail.status = 'from_page';
            }
          }
        } catch (_) {
          detail.status = 'fetch_error';
        }
      }

      if (match) {
        const updatePayload = {
          ltb_price: match.price,
          ltb_available: match.available !== undefined ? match.available : true,
          ltb_updated_at: new Date().toISOString(),
        };
        // Актуальную цену с LTB записываем в основное поле «Стоимость за лист», чтобы отображалась во вкладке
        if (match.price != null) {
          updatePayload.cost_per_sheet = match.price;
          const costM2 = item.dimensions ? calcCostPerM2FromSheet(match.price, item.dimensions) : null;
          if (costM2 != null) updatePayload.cost_per_m2 = costM2;
        }
        if (match.url && !item.ltb_url) updatePayload.ltb_url = match.url;
        const { error } = await supabase.from('items').update(updatePayload).eq('id', item.id);
        updates.push({
          name: item.name,
          article: item.article,
          price: match.price,
          error: error?.message,
        });
        detail.status = error ? 'update_failed' : 'updated';
      }

      if (isLtbLink) details.push(detail);
    }

    const noPriceCount = details.filter((d) => d.status === 'fetch_ok_no_price').length;

    return NextResponse.json({
      ok: true,
      productsCount: productsFromListing.length,
      updated: updates.length,
      updates,
      diagnostics: {
        itemsWithLtbLink: itemsWithLtb.length,
        details,
        message:
          noPriceCount > 0
            ? `Сайт LTB.ge подгружает цены через JavaScript (SPA), поэтому при запросе страницы по ссылке парсер не видит цену. Обновлено по каталогу или API: ${updates.length}. Для актуализации можно вручную скопировать цену с LTB в поле «Стоимость за лист» или «₾/м²».`
            : null,
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
