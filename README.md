# Artecodb.ge — база материалов (стиль Notion)

База данных материалов с вкладками (AGT, Аркопа, Фурнитура, Петли, Направляющие и свои), CRUD позиций, загрузкой фото в Supabase Storage и актуализацией цен/наличия с LTB.ge.

## Структура

- **Вкладки** — категории. По умолчанию: AGT, Аркопа, Фурнитура, Петли, Направляющие. Можно добавлять и удалять.
- **Позиции** в каждой вкладке: название, артикул, стоимость за м², стоимость за лист, фото, размеры, страна производитель, ссылка. Дополнительно для парсера LTB: цена и наличие с сайта.

## Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com).
2. В **SQL Editor** выполните миграции по порядку:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_storage.sql`
   - `supabase/migrations/003_rls.sql`
3. В **Storage** создайте bucket `product-photos` (публичный), если не создался через SQL. Разрешенные типы: image/jpeg, image/png, image/webp, image/gif; лимит размера файла 5 МБ.
4. Скопируйте `.env.local.example` в `.env.local` и укажите:
   - `NEXT_PUBLIC_SUPABASE_URL` — URL проекта (например `https://xxxx.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — публичный (anon) ключ из Settings → API

## Запуск

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

- Главная: вкладки и таблица позиций, добавление/редактирование/удаление позиций и вкладок, загрузка фото.
- [http://localhost:3000/parser](http://localhost:3000/parser): актуализация с LTB.ge — обновляются поля «цена LTB» и «наличие» у позиций, у которых указана ссылка на LTB или совпадает артикул.

## Парсер LTB.ge

Парсер загружает каталог с [ltb.ge/ge/shop](https://ltb.ge/ge/shop), извлекает артикул, цену и ссылку на товар. В вашей базе обновляются позиции, у которых:

- в поле **Ссылка** или **ltb_url** указана ссылка на ltb.ge, или  
- **артикул** совпадает с артикулом товара на LTB.

Обновляются поля: `ltb_price`, `ltb_available`, `ltb_updated_at` (и при необходимости `ltb_url`).
