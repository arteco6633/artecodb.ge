'use client';

import { useState } from 'react';

const GripIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx="9" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" />
    <circle cx="15" cy="6" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="15" cy="18" r="1.5" />
  </svg>
);

export function TabsBar({ tabs, selectedTabId, onSelect, onAddTab, onDeleteTab, onEditFields, onReorder }) {
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = (e, tabId) => {
    e.dataTransfer.setData('text/plain', tabId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setDragImage(e.currentTarget.closest('.tabs-bar-item'), 0, 0);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => setDragOverIndex(null);

  const handleDrop = (e, toIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || !onReorder) return;
    const fromIndex = tabs.findIndex((t) => t.id === draggedId);
    if (fromIndex === -1 || fromIndex === toIndex) return;
    onReorder(draggedId, toIndex);
  };

  const handleDragEnd = () => setDragOverIndex(null);

  return (
    <div className="tabs-bar">
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          className={`tabs-bar-item ${selectedTabId === tab.id ? 'tabs-bar-item--active' : ''} ${dragOverIndex === index ? 'tabs-bar-item--drag-over' : ''}`}
          data-index={index}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
        >
          {onReorder && (
            <span
              className="tabs-bar-drag-handle"
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragEnd={handleDragEnd}
              title="Перетащите для изменения порядка"
              aria-label="Изменить порядок"
            >
              <GripIcon />
            </span>
          )}
          <button
            type="button"
            className="tabs-bar-tab"
            onClick={() => onSelect(tab.id)}
          >
            {tab.name}
          </button>
          {onEditFields && (
            <button
              type="button"
              className="tabs-bar-settings"
              onClick={() => onEditFields(tab)}
              title="Настройки полей категории"
              aria-label={`Настройки полей: ${tab.name}`}
            >
              ⚙
            </button>
          )}
          <button
            type="button"
            className="tabs-bar-remove"
            onClick={() => onDeleteTab(tab)}
            title="Удалить вкладку"
            aria-label={`Удалить вкладку ${tab.name}`}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="tabs-bar-add" onClick={onAddTab}>
        + Новая вкладка
      </button>
    </div>
  );
}
