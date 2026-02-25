import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SYSTEM_BASE = `Ты — помощник по материалам и фурнитуре для мебели и корпусного производства. 
Отвечай на вопросы о материалах (ЛДСП, МДФ, пластик, кромка и т.д.), фурнитуре (петли, направляющие, навесы, ручки), технологиях и подборе. 
Отвечай на русском языке, кратко и по делу. Если вопрос не по теме — вежливо уточни.

Важно: когда пользователь спрашивает про петли, ответные планки, направляющие и т.п. — имей в виду именно те позиции, которые перечислены в его базе данных ниже. Отвечай с опорой на эти данные (какие ответные планки подходят к каким петлям из базы, совместимость, подбор).`;

const MAX_ITEMS_FOR_CONTEXT = 400;
const MAX_CHARS_CONTEXT = 6000;

/** Строит хлебные крошки для вкладки по плоскому списку. */
function getBreadcrumb(flat, tabId) {
  const byId = new Map(flat.map((t) => [t.id, t]));
  const path = [];
  let cur = byId.get(tabId);
  while (cur) {
    path.unshift(cur.name);
    cur = cur.parent_id ? byId.get(cur.parent_id) : null;
  }
  return path.join(' → ');
}

/** Загружает из БД категории и позиции, возвращает текст для контекста GPT. */
async function fetchDatabaseContext() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return '';

  const supabase = createClient(url, key);
  const { data: tabs } = await supabase.from('tabs').select('id, name, parent_id').order('sort_order');
  const { data: items } = await supabase
    .from('items')
    .select('id, name, article, tab_id')
    .order('created_at', { ascending: false })
    .limit(MAX_ITEMS_FOR_CONTEXT);

  if (!tabs?.length) return 'В базе пока нет категорий.';
  const flat = tabs || [];
  const byTabId = new Map();
  for (const item of items || []) {
    const tabId = item.tab_id;
    if (!byTabId.has(tabId)) byTabId.set(tabId, []);
    byTabId.get(tabId).push(item);
  }

  const lines = ['Содержимое базы данных пользователя (категории и позиции):', ''];
  let totalChars = 0;
  for (const tab of flat) {
    const path = getBreadcrumb(flat, tab.id);
    const list = byTabId.get(tab.id) || [];
    const itemsStr = list
      .slice(0, 80)
      .map((i) => (i.article ? `${i.name} (арт. ${i.article})` : i.name))
      .join(', ');
    const block = `• ${path}: ${itemsStr || '—'}`;
    if (totalChars + block.length > MAX_CHARS_CONTEXT) break;
    lines.push(block);
    totalChars += block.length;
  }
  return lines.join('\n');
}

export async function POST(req) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY не задан. Добавьте ключ в .env.local' },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Неверное тело запроса' }, { status: 400 });
  }

  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  if (!question) {
    return NextResponse.json({ error: 'Введите вопрос' }, { status: 400 });
  }

  const item = body?.item && typeof body.item === 'object' ? body.item : null;
  let userContent = question;

  const dbContext = await fetchDatabaseContext();
  const systemContent = dbContext
    ? `${SYSTEM_BASE}\n\n${dbContext}`
    : SYSTEM_BASE;

  if (item) {
    const parts = ['Пользователь смотрит выбранную позицию в базе. Контекст:'];
    if (item.name) parts.push(`Название: ${item.name}`);
    if (item.article) parts.push(`Артикул: ${item.article}`);
    if (item.tabName) parts.push(`Категория: ${item.tabName}`);
    if (item.link) parts.push(`Ссылка на товар: ${item.link}`);
    if (item.ltb_url) parts.push(`Ссылка LTB: ${item.ltb_url}`);
    if (item.dimensions) parts.push(`Размеры: ${item.dimensions}`);
    if (item.country) parts.push(`Страна: ${item.country}`);
    if (item.cost_per_m2 != null) parts.push(`₾/м²: ${item.cost_per_m2}`);
    if (item.cost_per_sheet != null) parts.push(`₾/лист: ${item.cost_per_sheet}`);
    if (item.cost_per_piece != null) parts.push(`₾/шт: ${item.cost_per_piece}`);
    parts.push('', 'Вопрос пользователя по этой позиции:', question);
    userContent = parts.join('\n');
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
      max_tokens: 1024,
    });

    const message = completion.choices?.[0]?.message?.content;
    if (message == null) {
      return NextResponse.json({ error: 'Пустой ответ от модели' }, { status: 502 });
    }

    return NextResponse.json({ answer: message });
  } catch (err) {
    const msg = err?.message || String(err);
    const status = err?.status === 401 ? 401 : err?.status === 429 ? 429 : 500;
    return NextResponse.json(
      { error: msg.includes('api_key') ? 'Неверный API-ключ' : msg },
      { status }
    );
  }
}
