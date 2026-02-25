'use client';

import { useState } from 'react';

const LTB_SHOP = 'https://ltb.ge/ge/shop';

export default function ParserPage() {
  const [status, setStatus] = useState('');
  const [results, setResults] = useState([]);
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(false);

  const runParser = async () => {
    setLoading(true);
    setStatus('Загрузка данных LTB.ge и обновление базы…');
    setResults([]);
    setDiagnostics(null);
    try {
      const res = await fetch('/api/ltb-sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      setResults(data.updates || []);
      setDiagnostics(data.diagnostics || null);
      let msg = `Готово. Обновлено позиций в базе: ${data.updated}.`;
      if (data.productsCount > 0) msg += ` С каталога LTB: ${data.productsCount} товаров.`;
      if (data.diagnostics?.itemsWithLtbLink != null) {
        msg += ` Позиций со ссылкой LTB: ${data.diagnostics.itemsWithLtbLink}.`;
      }
      setStatus(msg);
    } catch (e) {
      setStatus('Ошибка: ' + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="container">
          <div className="app-header-inner">
            <h1 className="app-logo">Artecodb</h1>
            <a href="/">← Назад к базе</a>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          <section className="card parser-section">
            <h2 className="section-title">Актуализация с LTB.ge</h2>
            <p className="parser-desc">
              Загружается каталог с сайта{' '}
              <a href={LTB_SHOP} target="_blank" rel="noopener noreferrer">
                ltb.ge/ge/shop
              </a>
              . Для позиций, у которых указана ссылка на LTB или совпадает артикул, обновляются цена и наличие. Если каталог недоступен, данные берутся со страницы каждого товара по вашей ссылке.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={runParser}
              disabled={loading}
            >
              {loading ? 'Выполняется…' : 'Запустить актуализацию'}
            </button>
            {status && <p className="parser-status">{status}</p>}
            {diagnostics?.message && (
              <div className="parser-message">
                {diagnostics.message}
              </div>
            )}
            {results.length > 0 && (
              <ul className="parser-results">
                {results.map((r, i) => (
                  <li key={i}>
                    <strong>{r.name}</strong> (арт. {r.article}) → {r.price != null ? `${r.price} ₾` : '—'}
                    {r.error && <span className="parser-error"> — {r.error}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
