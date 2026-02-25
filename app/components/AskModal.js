'use client';

import { useState } from 'react';

/** Формирует объект позиции для контекста GPT (только нужные поля). */
function buildItemContext(item, tab) {
  if (!item) return null;
  return {
    name: item.name || undefined,
    article: item.article || undefined,
    tabName: tab?.name || undefined,
    link: item.link || undefined,
    ltb_url: item.ltb_url || undefined,
    dimensions: item.dimensions || undefined,
    country: item.country || undefined,
    cost_per_m2: item.cost_per_m2 != null ? item.cost_per_m2 : undefined,
    cost_per_sheet: item.cost_per_sheet != null ? item.cost_per_sheet : undefined,
    cost_per_piece: item.cost_per_piece != null ? item.cost_per_piece : undefined,
  };
}

export function AskModal({ onClose, itemContext }) {
  const { item, tab } = itemContext || {};
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setError('');
    setAnswer('');
    setLoading(true);
    const payload = { question: q };
    const ctx = buildItemContext(item, tab);
    if (ctx) payload.item = ctx;
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Ошибка запроса');
        return;
      }
      setAnswer(data.answer || '');
    } catch (err) {
      setError(err?.message || 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay ask-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ask-modal-title"
    >
      <div className="modal ask-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ask-modal-header">
          <span className="ask-modal-badge">GPT</span>
          <h2 id="ask-modal-title" className="ask-modal-title">
            {item ? 'Вопрос по выбранной позиции' : 'Вопрос по материалам и фурнитуре'}
          </h2>
          <button
            type="button"
            className="ask-modal-close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="ask-modal-desc">
          {item
            ? `GPT знает контекст: «${item.name || 'Позиция'}»${tab?.name ? ` (${tab.name})` : ''}. Задайте вопрос — ответ будет с учётом этой позиции и ссылки.`
            : 'Задайте вопрос — GPT подскажет по материалам, фурнитуре и технологиям.'}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group ask-modal-field">
            <label className="label" htmlFor="ask-question">Вопрос</label>
            <textarea
              id="ask-question"
              className="input ask-modal-textarea"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={item
                ? 'Например: подойдёт ли это для кухни? чем заменить? какая совместимость?'
                : 'Например: чем отличается МДФ от ЛДСП? какие петли лучше для тяжёлых дверей?'}
              disabled={loading}
            />
          </div>
          {error && <p className="ask-modal-error">{error}</p>}
          {loading && (
            <div className="ask-modal-loading" aria-hidden>
              <span className="ask-modal-loading-dot" />
              <span className="ask-modal-loading-dot" />
              <span className="ask-modal-loading-dot" />
            </div>
          )}
          {answer && !loading && (
            <div className="ask-modal-answer">
              <span className="ask-modal-answer-label">Ответ</span>
              <div className="ask-modal-answer-text">{answer}</div>
            </div>
          )}
          <div className="ask-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Закрыть</button>
            <button
              type="submit"
              className="btn btn-primary ask-modal-submit"
              disabled={loading || !question.trim()}
            >
              {loading ? 'Отправка…' : 'Спросить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
