'use client';

import { FIELD_IDS } from '../../lib/fields';

export function ItemsTable({ items, enabledFields, customFields = [], onEdit, onDelete }) {
  const fields = Array.isArray(enabledFields) && enabledFields.length > 0 ? enabledFields : FIELD_IDS;
  const has = (id) => fields.includes(id);
  const customList = Array.isArray(customFields) ? customFields : [];

  if (!items.length) {
    return (
      <div className="items-empty">
        <p className="items-empty-text">Позиций пока нет</p>
        <p className="items-empty-hint">Нажмите «Добавить позицию», чтобы создать первую запись</p>
      </div>
    );
  }

  const renderCell = (item, fieldId) => {
    switch (fieldId) {
      case 'photo':
        return item.photo_url ? (
          <img src={item.photo_url} alt="" className="items-photo" />
        ) : (
          <span className="items-no-photo">—</span>
        );
      case 'name':
        return item.name || '—';
      case 'article':
        return item.article || '—';
      case 'cost_per_m2':
        return item.cost_per_m2 != null ? item.cost_per_m2 : '—';
      case 'cost_per_sheet':
        return item.cost_per_sheet != null ? item.cost_per_sheet : '—';
      case 'cost_per_piece':
        return item.cost_per_piece != null ? item.cost_per_piece : '—';
      case 'dimensions':
        return item.dimensions || '—';
      case 'country':
        return item.country || '—';
      case 'link':
        return item.link ? (
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="items-link">Открыть</a>
        ) : (
          '—'
        );
      case 'ltb':
        return item.ltb_updated_at ? (
          <span title={new Date(item.ltb_updated_at).toLocaleString('ru')} className="items-ltb">
            {item.ltb_price != null ? `${item.ltb_price} ₾` : '—'}
            {item.ltb_available != null && (
              <span className="items-ltb-badge" aria-label={item.ltb_available ? 'В наличии' : 'Нет в наличии'}>
                {item.ltb_available ? '✓' : '✗'}
              </span>
            )}
          </span>
        ) : (
          '—'
        );
      default:
        if (typeof fieldId === 'string' && fieldId.startsWith('custom_')) {
          const val = item.custom_data?.[fieldId];
          return val !== undefined && val !== null && val !== '' ? String(val) : '—';
        }
        return '—';
    }
  };

  const thClass = (id) => {
    if (id === 'photo') return 'items-th items-th--photo';
    if (['cost_per_m2', 'cost_per_sheet', 'cost_per_piece'].includes(id)) return 'items-th items-th--num';
    if (id === 'ltb') return 'items-th items-th--ltb';
    return 'items-th';
  };

  const tdClass = (id) => {
    if (id === 'photo') return 'items-td items-td--photo';
    if (id === 'name') return 'items-td items-td--name';
    if (['cost_per_m2', 'cost_per_sheet', 'cost_per_piece'].includes(id)) return 'items-td items-td--num';
    if (id === 'ltb') return 'items-td items-td--ltb';
    return 'items-td';
  };

  return (
    <>
      <div className="items-table-wrap">
        <table className="items-table">
          <thead>
            <tr>
              {has('photo') && <th className={thClass('photo')}>Фото</th>}
              {has('name') && <th className={thClass('name')}>Название</th>}
              {has('article') && <th className={thClass('article')}>Артикул</th>}
              {has('cost_per_m2') && <th className={thClass('cost_per_m2')}>₾/м²</th>}
              {has('cost_per_sheet') && <th className={thClass('cost_per_sheet')}>₾/лист</th>}
              {has('cost_per_piece') && <th className={thClass('cost_per_piece')}>₾/шт</th>}
              {has('dimensions') && <th className={thClass('dimensions')}>Размеры</th>}
              {has('country') && <th className={thClass('country')}>Страна</th>}
              {has('link') && <th className={thClass('link')}>Ссылка</th>}
              {has('ltb') && <th className={thClass('ltb')}>LTB</th>}
              {customList.map((f) => (
                <th key={f.id} className="items-th">{f.label}</th>
              ))}
              <th className="items-th items-th--actions"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="items-tr">
                {has('photo') && <td className={tdClass('photo')}>{renderCell(item, 'photo')}</td>}
                {has('name') && <td className={tdClass('name')}>{renderCell(item, 'name')}</td>}
                {has('article') && <td className={tdClass('article')}>{renderCell(item, 'article')}</td>}
                {has('cost_per_m2') && <td className={tdClass('cost_per_m2')}>{renderCell(item, 'cost_per_m2')}</td>}
                {has('cost_per_sheet') && <td className={tdClass('cost_per_sheet')}>{renderCell(item, 'cost_per_sheet')}</td>}
                {has('cost_per_piece') && <td className={tdClass('cost_per_piece')}>{renderCell(item, 'cost_per_piece')}</td>}
                {has('dimensions') && <td className={tdClass('dimensions')}>{renderCell(item, 'dimensions')}</td>}
                {has('country') && <td className={tdClass('country')}>{renderCell(item, 'country')}</td>}
                {has('link') && <td className={tdClass('link')}>{renderCell(item, 'link')}</td>}
                {has('ltb') && <td className={tdClass('ltb')}>{renderCell(item, 'ltb')}</td>}
                {customList.map((f) => (
                  <td key={f.id} className="items-td">{renderCell(item, f.id)}</td>
                ))}
                <td className="items-td items-td--actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEdit(item)}>Изменить</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)}>Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="items-cards">
        {items.map((item) => (
          <article key={item.id} className={`item-card card ${!has('photo') ? 'item-card--no-photo' : ''}`}>
            {has('photo') && (
              <div className="item-card-media">
                {item.photo_url ? (
                  <img src={item.photo_url} alt="" className="item-card-photo" />
                ) : (
                  <div className="item-card-no-photo">Фото</div>
                )}
              </div>
            )}
            <div className="item-card-body">
              {has('name') && <h3 className="item-card-name">{item.name || '—'}</h3>}
              <dl className="item-card-meta">
                {has('article') && <div><dt>Артикул</dt><dd>{item.article || '—'}</dd></div>}
                {has('cost_per_m2') && <div><dt>₾/м²</dt><dd>{item.cost_per_m2 != null ? item.cost_per_m2 : '—'}</dd></div>}
                {has('cost_per_sheet') && <div><dt>₾/лист</dt><dd>{item.cost_per_sheet != null ? item.cost_per_sheet : '—'}</dd></div>}
                {has('cost_per_piece') && <div><dt>₾/шт</dt><dd>{item.cost_per_piece != null ? item.cost_per_piece : '—'}</dd></div>}
                {has('dimensions') && <div><dt>Размеры</dt><dd>{item.dimensions || '—'}</dd></div>}
                {has('country') && <div><dt>Страна</dt><dd>{item.country || '—'}</dd></div>}
                {has('ltb') && item.ltb_updated_at && (
                  <div><dt>LTB</dt><dd>{item.ltb_price != null ? `${item.ltb_price} ₾` : '—'} {item.ltb_available ? '✓' : '✗'}</dd></div>
                )}
                {customList.map((f) => (
                  <div key={f.id}><dt>{f.label}</dt><dd>{item.custom_data?.[f.id] ?? '—'}</dd></div>
                ))}
              </dl>
              <div className="item-card-actions">
                {has('link') && item.link && (
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Ссылка</a>
                )}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEdit(item)}>Изменить</button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)}>Удалить</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
