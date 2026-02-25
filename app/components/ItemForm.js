'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, BUCKET_PHOTOS } from '../../lib/supabase';
import { FIELD_IDS, getCustomFields, newCustomFieldId } from '../../lib/fields';
import { calcCostPerM2FromSheet } from '../../lib/fields';

export function ItemForm({ tabId, item, selectedTab, enabledFields: enabledFromProp, onClose, onTabCustomFieldsAdded }) {
  const isEdit = !!item;
  const enabledFields = Array.isArray(enabledFromProp) && enabledFromProp.length > 0 ? enabledFromProp : FIELD_IDS;
  const customFields = selectedTab ? getCustomFields(selectedTab) : [];
  const has = (id) => enabledFields.includes(id);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [form, setForm] = useState({
    name: '',
    article: '',
    cost_per_m2: '',
    cost_per_sheet: '',
    cost_per_piece: '',
    photo_url: '',
    dimensions: '',
    country: '',
    link: '',
    custom_data: {},
  });

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || '',
        article: item.article || '',
        cost_per_m2: item.cost_per_m2 ?? '',
        cost_per_sheet: item.cost_per_sheet ?? '',
        cost_per_piece: item.cost_per_piece ?? '',
        photo_url: item.photo_url || '',
        dimensions: item.dimensions || '',
        country: item.country || '',
        link: item.link || '',
        custom_data: item.custom_data && typeof item.custom_data === 'object' ? { ...item.custom_data } : {},
      });
    }
  }, [item]);

  const update = useCallback((key, value) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if ((key === 'dimensions' || key === 'cost_per_sheet') && enabledFields.includes('cost_per_m2') && enabledFields.includes('cost_per_sheet') && enabledFields.includes('dimensions')) {
        const sheet = key === 'cost_per_sheet' ? value : f.cost_per_sheet;
        const dims = key === 'dimensions' ? value : f.dimensions;
        const sheetNum = parseFloat(sheet);
        if (sheetNum > 0 && dims) {
          const calculated = calcCostPerM2FromSheet(sheetNum, dims);
          if (calculated != null) next.cost_per_m2 = String(calculated);
        }
      }
      return next;
    });
  }, [enabledFields]);

  const updateCustom = useCallback((fieldId, value) => {
    setForm((f) => ({
      ...f,
      custom_data: { ...(f.custom_data || {}), [fieldId]: value === '' ? undefined : value },
    }));
  }, []);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${tabId}/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from(BUCKET_PHOTOS).upload(path, file, { upsert: true });
    setUploading(false);
    if (error) {
      alert('Ошибка загрузки: ' + error.message);
      return;
    }
    const { data: urlData } = supabase.storage.from(BUCKET_PHOTOS).getPublicUrl(data.path);
    update('photo_url', urlData.publicUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setLoading(true);

    let name = form.name.trim();
    let article = form.article.trim();
    let dimensions = form.dimensions.trim();
    let cost_per_sheet = form.cost_per_sheet !== '' ? form.cost_per_sheet : null;
    let cost_per_m2 = form.cost_per_m2 !== '' ? form.cost_per_m2 : null;
    let cost_per_piece = form.cost_per_piece !== '' ? form.cost_per_piece : null;
    let country = form.country.trim();
    let link = form.link.trim();
    let photo_url = form.photo_url || '';
    let customDataMerged = form.custom_data && typeof form.custom_data === 'object' ? { ...form.custom_data } : {};

    // При добавлении позиции: если указана ссылка LTB — парсим страницу и подставляем данные
    if (!isEdit && link && link.includes('ltb.ge')) {
      try {
        const res = await fetch('/api/parse-ltb-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: link, tabId }),
        });
        const json = await res.json();
        if (json.ok && json.data) {
          const d = json.data;
          if (d.name && !name) name = d.name;
          if (d.article && !article) article = d.article;
          if (d.dimensions && !dimensions) dimensions = d.dimensions;
          if (d.cost_per_sheet != null && cost_per_sheet == null) cost_per_sheet = String(d.cost_per_sheet);
          if (d.cost_per_m2 != null && cost_per_m2 == null) cost_per_m2 = String(d.cost_per_m2);
          if (d.cost_per_piece != null && cost_per_piece == null) cost_per_piece = String(d.cost_per_piece);
          if (d.country && !country) country = d.country;
          if (d.photo_url && !photo_url) photo_url = d.photo_url;
          if (d.extra && Object.keys(d.extra).length > 0 && selectedTab && onTabCustomFieldsAdded) {
            const existing = selectedTab.custom_fields || [];
            const newFieldDefs = [];
            for (const label of Object.keys(d.extra)) {
              if (!existing.some((f) => f && f.label === label)) newFieldDefs.push({ id: newCustomFieldId(), label });
            }
            if (newFieldDefs.length) await onTabCustomFieldsAdded(tabId, newFieldDefs);
            const allFields = [...existing, ...newFieldDefs];
            for (const label of Object.keys(d.extra)) {
              const field = allFields.find((f) => f && f.label === label);
              if (field) customDataMerged[field.id] = d.extra[label];
            }
            setForm((prev) => ({ ...prev, custom_data: { ...prev.custom_data, ...customDataMerged } }));
          }
        }
      } catch (_) {
        // при ошибке парсинга сохраняем то, что ввёл пользователь
      }
    }

    if (!name) {
      setLoading(false);
      setSubmitError(link && link.includes('ltb.ge')
        ? 'Не удалось получить название по ссылке LTB. Введите название вручную или проверьте ссылку.'
        : 'Укажите название позиции.');
      return;
    }

    const customDataClean = Object.fromEntries(Object.entries(customDataMerged).filter(([, v]) => v !== undefined && v !== null && v !== ''));
    const payload = {
      tab_id: tabId,
      name,
      article: has('article') ? (article || null) : null,
      cost_per_m2: has('cost_per_m2') && cost_per_m2 !== '' ? parseFloat(cost_per_m2) : null,
      cost_per_sheet: has('cost_per_sheet') && cost_per_sheet !== '' ? parseFloat(cost_per_sheet) : null,
      cost_per_piece: has('cost_per_piece') && cost_per_piece !== '' ? parseFloat(cost_per_piece) : null,
      photo_url: photo_url || form.photo_url || null,
      dimensions: has('dimensions') ? (dimensions || null) : null,
      country: has('country') ? (country || null) : null,
      link: has('link') ? (link || null) : null,
      custom_data: Object.keys(customDataClean).length > 0 ? customDataClean : {},
    };
    if (isEdit) {
      await supabase.from('items').update(payload).eq('id', item.id);
    } else {
      await supabase.from('items').insert(payload);
    }
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="item-form-title">
      <div className="modal" style={{ padding: '24px' }} onClick={(e) => e.stopPropagation()}>
        <h2 id="item-form-title" className="modal-title">{isEdit ? 'Редактировать позицию' : 'Новая позиция'}</h2>
        {submitError && (
          <p className="form-error" role="alert" style={{ marginBottom: 16, color: '#f87171', fontSize: '0.9rem' }}>{submitError}</p>
        )}
        <form onSubmit={handleSubmit}>
          {has('name') && (
            <div className="form-group">
              <label className="label" htmlFor="item-name">Название {isEdit ? '*' : '(или укажите ссылку LTB — подставится автоматически)'}</label>
              <input
                id="item-name"
                className="input"
                value={form.name}
                onChange={(e) => { setSubmitError(null); update('name', e.target.value); }}
                placeholder="Например: Фасад МДФ"
              />
            </div>
          )}
          {(has('article') || has('country')) && (
            <div className="form-row">
              {has('article') && (
                <div className="form-group">
                  <label className="label" htmlFor="item-article">Артикул</label>
                  <input id="item-article" className="input" value={form.article} onChange={(e) => update('article', e.target.value)} placeholder="000040695" />
                </div>
              )}
              {has('country') && (
                <div className="form-group">
                  <label className="label" htmlFor="item-country">Страна производитель</label>
                  <input id="item-country" className="input" value={form.country} onChange={(e) => update('country', e.target.value)} placeholder="Австрия" />
                </div>
              )}
            </div>
          )}
          {(has('cost_per_m2') || has('cost_per_sheet') || has('cost_per_piece')) && (
            <div className="form-row">
              {has('cost_per_m2') && (
                <div className="form-group">
                  <label className="label" htmlFor="item-cost-m2">Стоимость за м² (₾)</label>
                  <input id="item-cost-m2" type="number" step="0.01" className="input" value={form.cost_per_m2} onChange={(e) => update('cost_per_m2', e.target.value)} placeholder="Рассчитывается по листу" />
                </div>
              )}
              {has('cost_per_sheet') && (
                <div className="form-group">
                  <label className="label" htmlFor="item-cost-sheet">Стоимость за лист (₾)</label>
                  <input id="item-cost-sheet" type="number" step="0.01" className="input" value={form.cost_per_sheet} onChange={(e) => update('cost_per_sheet', e.target.value)} />
                </div>
              )}
              {has('cost_per_piece') && (
                <div className="form-group">
                  <label className="label" htmlFor="item-cost-piece">Стоимость за штуку (₾)</label>
                  <input id="item-cost-piece" type="number" step="0.01" className="input" value={form.cost_per_piece} onChange={(e) => update('cost_per_piece', e.target.value)} />
                </div>
              )}
            </div>
          )}
          {has('dimensions') && (
            <div className="form-group">
              <label className="label" htmlFor="item-dimensions">Размеры (мм, для листа: длина×ширина×толщина)</label>
              <input id="item-dimensions" className="input" value={form.dimensions} onChange={(e) => update('dimensions', e.target.value)} placeholder="2800×1220×18" />
              {has('cost_per_sheet') && form.dimensions && form.cost_per_sheet && (
                <span className="form-hint">Стоимость за м² рассчитается автоматически по размерам листа</span>
              )}
            </div>
          )}
          {has('photo') && (
            <div className="form-group">
              <label className="label">Фото</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploading} />
                {uploading && <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Загрузка…</span>}
              </div>
              {form.photo_url && (
                <img src={form.photo_url} alt="" style={{ marginTop: 10, maxHeight: 100, borderRadius: 'var(--radius-sm)' }} />
              )}
            </div>
          )}
          {has('link') && (
            <div className="form-group">
              <label className="label" htmlFor="item-link">Ссылка</label>
              <input id="item-link" type="url" className="input" value={form.link} onChange={(e) => update('link', e.target.value)} placeholder="https://ltb.ge/ge/shop/..." />
              {!isEdit && (
                <span className="form-hint">При добавлении позиции по ссылке LTB название, артикул, цена и размеры подставятся автоматически.</span>
              )}
            </div>
          )}
          {customFields.length > 0 && customFields.map((f) => (
            <div key={f.id} className="form-group">
              <label className="label" htmlFor={`item-custom-${f.id}`}>{f.label}</label>
              <input
                id={`item-custom-${f.id}`}
                className="input"
                value={form.custom_data?.[f.id] ?? ''}
                onChange={(e) => updateCustom(f.id, e.target.value)}
                placeholder={f.label}
              />
            </div>
          ))}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
