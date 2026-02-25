'use client';

export function TabsBar({ tabs, selectedTabId, onSelect, onAddTab, onDeleteTab, onEditFields }) {
  return (
    <div className="tabs-bar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tabs-bar-item ${selectedTabId === tab.id ? 'tabs-bar-item--active' : ''}`}
        >
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
