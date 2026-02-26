'use client';

import { FIELD_LABELS, getEnabledFields, getCustomFields } from '../../lib/fields';

export function ItemCard({ item, tab, onClose, onEdit, onAskGPT }) {
  const enabledFields = tab ? getEnabledFields(tab) : Object.keys(FIELD_LABELS);
  const customFields = tab ? getCustomFields(tab) : [];
  const has = (id) => enabledFields.includes(id);

  const renderValue = (fieldId) => {
    switch (fieldId) {
      case 'photo':
        return null;
      case 'name':
        return item.name || '—';
      case 'article':
        return item.article || '—';
      case 'cost_per_m2':
        return item.cost_per_m2 != null ? `${item.cost_per_m2} ₾` : '—';
      case 'cost_per_sheet':
        return item.cost_per_sheet != null ? `${item.cost_per_sheet} ₾` : '—';
      case 'cost_per_piece':
        return item.cost_per_piece != null ? `${item.cost_per_piece} ₾` : '—';
      case 'dimensions':
        return item.dimensions || '—';
      case 'country':
        return item.country || '—';
      case 'link':
        return item.link ? (
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="item-card-detail-link">Открыть ссылку</a>
        ) : '—';
      case 'ltb':
        return item.ltb_updated_at ? (
          <span>
            {item.ltb_price != null ? `${item.ltb_price} ₾` : '—'}
            {item.ltb_available != null && (item.ltb_available ? ' ✓ В наличии' : ' Нет в наличии')}
          </span>
        ) : '—';
      case 'documentation_url':
      case 'official_website_url':
      case 'video_url':
        return null; /* показываем отдельным блоком ниже */
      default:
        if (typeof fieldId === 'string' && fieldId.startsWith('custom_')) {
          const val = item.custom_data?.[fieldId];
          return val !== undefined && val !== null && val !== '' ? String(val) : '—';
        }
        return '—';
    }
  };

  return (
    <div className="modal-overlay item-card-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="item-card-title">
      <div className="modal item-card-modal" onClick={(e) => e.stopPropagation()}>
        <div className="item-card-detail">
          <div className="item-card-detail-header">
            <h2 id="item-card-title" className="modal-title item-card-detail-title">{item.name || 'Позиция'}</h2>
            <button type="button" className="btn btn-ghost item-card-detail-close" onClick={onClose} aria-label="Закрыть">×</button>
          </div>
          <div className="item-card-detail-body">
            {has('photo') && (
              <div className="item-card-detail-photo-wrap">
                {item.photo_url ? (
                  <img src={item.photo_url} alt="" className="item-card-detail-photo" />
                ) : (
                  <div className="item-card-detail-no-photo">Нет фото</div>
                )}
              </div>
            )}
            <dl className="item-card-detail-specs">
              {has('article') && (
                <div className="item-card-detail-row">
                  <dt>{FIELD_LABELS.article}</dt>
                  <dd>{renderValue('article')}</dd>
                </div>
              )}
              {has('cost_per_m2') && (
                <div className="item-card-detail-row">
                  <dt>{FIELD_LABELS.cost_per_m2}</dt>
                  <dd>{renderValue('cost_per_m2')}</dd>
                </div>
              )}
              {has('cost_per_sheet') && (
                <div className="item-card-detail-row">
                  <dt>{FIELD_LABELS.cost_per_sheet}</dt>
                  <dd>{renderValue('cost_per_sheet')}</dd>
                </div>
              )}
              {has('cost_per_piece') && (
                <div className="item-card-detail-row">
                  <dt>{FIELD_LABELS.cost_per_piece}</dt>
                  <dd>{renderValue('cost_per_piece')}</dd>
                </div>
              )}
              {has('dimensions') && (
                <div className="item-card-detail-row">
                  <dt>{FIELD_LABELS.dimensions}</dt>
                  <dd>{renderValue('dimensions')}</dd>
                </div>
              )}
              {has('country') && (
                <div className="item-card-detail-row">
                  <dt>{FIELD_LABELS.country}</dt>
                  <dd>{renderValue('country')}</dd>
                </div>
              )}
              {has('link') && (
                <div className="item-card-detail-row">
                  <dt>{FIELD_LABELS.link}</dt>
                  <dd>{renderValue('link')}</dd>
                </div>
              )}
              {has('ltb') && (
                <div className="item-card-detail-row">
                  <dt>{FIELD_LABELS.ltb}</dt>
                  <dd>{renderValue('ltb')}</dd>
                </div>
              )}
              {customFields.map((f) => (
                <div key={f.id} className="item-card-detail-row">
                  <dt>{f.label}</dt>
                  <dd>{item.custom_data?.[f.id] ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
          {(has('documentation_url') && item.documentation_url) || (has('official_website_url') && item.official_website_url) || (has('video_url') && item.video_url) ? (
            <div className="item-card-detail-extra-links">
              {has('documentation_url') && item.documentation_url && (
                <a href={item.documentation_url} target="_blank" rel="noopener noreferrer" className="item-card-extra-link item-card-extra-link--doc">
                  <span className="item-card-extra-link-icon">📄</span>
                  <span>Документация</span>
                </a>
              )}
              {has('official_website_url') && item.official_website_url && (
                <a href={item.official_website_url} target="_blank" rel="noopener noreferrer" className="item-card-extra-link item-card-extra-link--site">
                  <span className="item-card-extra-link-icon">🌐</span>
                  <span>Официальный сайт</span>
                </a>
              )}
              {has('video_url') && item.video_url && (
                <a href={item.video_url} target="_blank" rel="noopener noreferrer" className="item-card-extra-link item-card-extra-link--video">
                  <span className="item-card-extra-link-icon">▶</span>
                  <span>Видео</span>
                </a>
              )}
            </div>
          ) : null}
          <div className="item-card-detail-actions">
            {onAskGPT && (
              <button type="button" className="btn btn-secondary" onClick={() => onAskGPT(item, tab)}>
                Спросить GPT об этой позиции
              </button>
            )}
            {item.link && (
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Открыть на LTB</a>
            )}
            {onEdit && (
              <button type="button" className="btn btn-primary" onClick={() => { onClose(); onEdit(item); }}>Изменить</button>
            )}
            <button type="button" className="btn btn-ghost" onClick={onClose}>Закрыть</button>
          </div>
        </div>
      </div>
    </div>
  );
}
