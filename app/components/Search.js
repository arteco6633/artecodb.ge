'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

const DEBOUNCE_MS = 280;

export function Search({ tabs, onSelectItem }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      const q = query.trim().replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .or(`name.ilike.%${q}%,article.ilike.%${q}%`)
        .limit(30)
        .order('created_at', { ascending: false });
      setLoading(false);
      if (!error) setResults(data || []);
      else setResults([]);
      setOpen(true);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const getTabName = (tabId) => {
    const tab = (tabs || []).find((t) => t.id === tabId);
    return tab ? tab.name : '';
  };

  const handleSelect = (item) => {
    onSelectItem(item);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="search-wrap" ref={wrapRef}>
      <span className="search-icon-wrap" aria-hidden>🔍</span>
      <input
        type="search"
        className="search-input"
        placeholder="Поиск по артикулу или названию..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setOpen(true)}
        autoComplete="off"
      />
      {open && (query.length >= 2 || results.length > 0) && (
        <div className="search-results">
          {loading ? (
            <div className="search-results-empty">Поиск…</div>
          ) : results.length === 0 ? (
            <div className="search-results-empty">Ничего не найдено</div>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                className="search-results-item"
                onClick={() => handleSelect(item)}
              >
                <div className="search-results-item-name">{item.name || '—'}</div>
                <div className="search-results-item-meta">
                  {item.article && `Артикул: ${item.article}`}
                  {item.article && getTabName(item.tab_id) && ' · '}
                  {getTabName(item.tab_id)}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
