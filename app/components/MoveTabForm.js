'use client';

import { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { buildTree, flattenWithLevel, getDescendantIds } from '../../lib/tabsTree';

export function MoveTabForm({ tab, tabsFlat = [], onClose }) {
  const [parentId, setParentId] = useState(tab?.parent_id ?? '');
  const [loading, setLoading] = useState(false);
  const [showAddParent, setShowAddParent] = useState(false);
  const [parentName, setParentName] = useState('');
  const [addingParent, setAddingParent] = useState(false);

  const forbiddenIds = useMemo(() => {
    if (!tab?.id) return new Set();
    const desc = getDescendantIds(tabsFlat, tab.id);
    desc.add(tab.id);
    return desc;
  }, [tab?.id, tabsFlat]);

  const parentOptions = useMemo(() => {
    const tree = buildTree(tabsFlat);
    const flat = flattenWithLevel(tree);
    const options = [{ value: '', label: '— Корень —', level: 0 }];
    for (const { tab: t, level } of flat) {
      if (!forbiddenIds.has(t.id)) options.push({ value: t.id, label: t.name, level });
    }
    return options;
  }, [tabsFlat, forbiddenIds]);

  const createRootCategory = async (categoryName) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return null;
    const { data: siblings } = await supabase
      .from('tabs')
      .select('sort_order')
      .is('parent_id', null)
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextOrder = (siblings?.[0]?.sort_order ?? -1) + 1;
    const { data, error } = await supabase.from('tabs').insert({
      name: trimmed,
      sort_order: nextOrder,
      parent_id: null,
    }).select('id').single();
    if (error) {
      alert('Ошибка: ' + error.message);
      return null;
    }
    return data?.id ?? null;
  };

  const handleAddParent = async (e) => {
    e.preventDefault();
    if (!parentName.trim() || !tab?.id) return;
    setAddingParent(true);
    const newId = await createRootCategory(parentName);
    if (newId) {
      const { error } = await supabase.from('tabs').update({ parent_id: newId }).eq('id', tab.id);
      if (error) alert('Ошибка при перемещении: ' + error.message);
    }
    setAddingParent(false);
    if (newId) {
      setParentName('');
      setShowAddParent(false);
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tab?.id) return;
    const newParent = parentId || null;
    if (newParent === (tab.parent_id ?? '')) {
      onClose();
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('tabs').update({ parent_id: newParent }).eq('id', tab.id);
    setLoading(false);
    if (error) {
      alert('Ошибка: ' + error.message);
      return;
    }
    onClose();
  };

  const handleClose = (opts) => {
    if (typeof onClose === 'function') onClose(opts);
  };

  if (!tab) return null;

  return (
    <div className="modal-overlay" onClick={() => handleClose()} role="dialog" aria-modal="true" aria-labelledby="move-tab-form-title">
      <div className="modal" style={{ padding: '24px', maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <h2 id="move-tab-form-title" className="modal-title">Переместить категорию</h2>
        <p className="move-tab-desc">«{tab.name}» → в выбранную родительскую папку (или создайте новую).</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="move-tab-parent">Родительская категория</label>
            <div className="form-group-inline">
              <select
                id="move-tab-parent"
                className="input"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              >
                {parentOptions.map((opt) => (
                  <option key={opt.value || 'root'} value={opt.value}>
                    {'—'.repeat(opt.level) + (opt.level ? ' ' : '')}{opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddParent((v) => !v)}
                title="Создать новую родительскую и переместить сюда"
              >
                + Создать родителя
              </button>
            </div>
            {showAddParent && (
              <div className="add-parent-block">
                <input
                  type="text"
                  className="input"
                  placeholder="Название новой родительской категории"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setShowAddParent(false)}
                />
                <div className="form-actions form-actions--sm">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowAddParent(false); setParentName(''); }}>Отмена</button>
                  <button type="button" className="btn btn-primary" disabled={addingParent || !parentName.trim()} onClick={handleAddParent}>
                    {addingParent ? 'Создание…' : 'Создать и переместить сюда'}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => handleClose()}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Перемещение…' : 'Переместить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
