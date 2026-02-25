'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export function AddTabForm({ onClose }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    const { data: tabs } = await supabase.from('tabs').select('sort_order').order('sort_order', { ascending: false }).limit(1);
    const nextOrder = (tabs?.[0]?.sort_order ?? 0) + 1;
    const { error } = await supabase.from('tabs').insert({ name: trimmed, sort_order: nextOrder });
    setLoading(false);
    if (error) {
      alert('Ошибка: ' + error.message);
      return;
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="tab-form-title">
      <div className="modal" style={{ padding: '24px', maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <h2 id="tab-form-title" className="modal-title">Новая вкладка</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="tab-name">Название вкладки</label>
            <input
              id="tab-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Стекло"
              required
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Добавление…' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
