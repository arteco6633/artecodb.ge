'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FIELD_IDS, FIELD_LABELS, getEnabledFields, getCustomFields, newCustomFieldId } from '../../lib/fields';

export function TabFieldsForm({ tab, onClose }) {
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(() =>
    FIELD_IDS.reduce((acc, id) => ({ ...acc, [id]: true }), {})
  );
  const [customFields, setCustomFields] = useState([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');

  useEffect(() => {
    if (!tab) return;
    const enabled = getEnabledFields(tab);
    setSelected(FIELD_IDS.reduce((acc, id) => ({ ...acc, [id]: enabled.includes(id) }), {}));
    setCustomFields(getCustomFields(tab));
  }, [tab?.id]);

  const toggle = (id) => {
    if (id === 'name') return;
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  const addCustomField = () => {
    const label = newFieldLabel.trim();
    if (!label) return;
    setCustomFields((prev) => [...prev, { id: newCustomFieldId(), label }]);
    setNewFieldLabel('');
  };

  const removeCustomField = (id) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  };

  const updateCustomFieldLabel = (id, label) => {
    setCustomFields((prev) => prev.map((f) => (f.id === id ? { ...f, label } : f)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const enabledFields = FIELD_IDS.filter((id) => selected[id]);
    const { error } = await supabase
      .from('tabs')
      .update({ enabled_fields: enabledFields, custom_fields: customFields })
      .eq('id', tab.id);
    setLoading(false);
    if (error) {
      alert('Ошибка: ' + error.message);
      return;
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="tab-fields-title">
      <div className="modal tab-fields-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="tab-fields-title" className="modal-title">Поля категории «{tab?.name}»</h2>
        <p className="tab-fields-hint">Отметьте критерии, которые нужны для этой категории. «Название» всегда отображается. Ниже можно добавить свои поля.</p>
        <form onSubmit={handleSubmit}>
          <div className="tab-fields-block">
            <span className="tab-fields-block-title">Стандартные поля</span>
            <div className="tab-fields-list">
              {FIELD_IDS.map((id) => (
                <label key={id} className="tab-fields-item">
                  <input
                    type="checkbox"
                    checked={!!selected[id]}
                    onChange={() => toggle(id)}
                    disabled={id === 'name'}
                  />
                  <span>{FIELD_LABELS[id]}</span>
                  {id === 'name' && <span className="tab-fields-required">(всегда)</span>}
                </label>
              ))}
            </div>
          </div>

          <div className="tab-fields-block">
            <span className="tab-fields-block-title">Свои поля</span>
            <div className="tab-fields-add">
              <input
                type="text"
                className="input tab-fields-add-input"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="Название нового поля"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomField())}
              />
              <button type="button" className="btn btn-primary" onClick={addCustomField} disabled={!newFieldLabel.trim()}>
                Добавить поле
              </button>
            </div>
            {customFields.length > 0 && (
              <ul className="tab-fields-custom-list">
                {customFields.map((f) => (
                  <li key={f.id} className="tab-fields-custom-item">
                    <input
                      type="text"
                      className="input tab-fields-custom-input"
                      value={f.label}
                      onChange={(e) => updateCustomFieldLabel(f.id, e.target.value)}
                      placeholder="Название поля"
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm tab-fields-custom-remove"
                      onClick={() => removeCustomField(f.id)}
                      title="Удалить поле"
                      aria-label="Удалить поле"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
