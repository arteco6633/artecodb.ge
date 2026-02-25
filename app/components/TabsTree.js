'use client';

import { useState } from 'react';

const Chevron = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }} aria-hidden>
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const FolderIcon = ({ hasChildren, open }) => (
  <span className="tabs-tree-icon" aria-hidden>
    {hasChildren ? (open ? '📂' : '📁') : '📄'}
  </span>
);

function TreeNode({ node, level, selectedTabId, onSelect, onDeleteTab, onEditFields, onMoveTab, expandedIds, onToggle }) {
  const hasChildren = node.children?.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedTabId === node.id;

  return (
    <div className="tabs-tree-node" data-level={level}>
      <div
        className={`tabs-tree-row ${isSelected ? 'tabs-tree-row--active' : ''}`}
        style={{ paddingLeft: 12 + level * 16 }}
      >
        <button
          type="button"
          className="tabs-tree-toggle"
          onClick={() => hasChildren && onToggle(node.id)}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-label={hasChildren ? (isExpanded ? 'Свернуть' : 'Развернуть') : undefined}
        >
          {hasChildren ? <Chevron open={isExpanded} /> : <span className="tabs-tree-spacer" />}
        </button>
        <FolderIcon hasChildren={hasChildren} open={isExpanded} />
        <button
          type="button"
          className="tabs-tree-label"
          onClick={() => onSelect(node.id)}
        >
          {node.name}
        </button>
        <div className="tabs-tree-actions">
          {onMoveTab && (
            <button
              type="button"
              className="tabs-tree-btn tabs-tree-btn--move"
              onClick={() => onMoveTab(node)}
              title="Переместить в другую папку"
              aria-label={`Переместить ${node.name}`}
            >
              ↷
            </button>
          )}
          {onEditFields && (
            <button
              type="button"
              className="tabs-tree-btn tabs-tree-btn--settings"
              onClick={() => onEditFields(node)}
              title="Настройки полей"
              aria-label={`Настройки: ${node.name}`}
            >
              ⚙
            </button>
          )}
          {onDeleteTab && (
            <button
              type="button"
              className="tabs-tree-btn tabs-tree-btn--remove"
              onClick={() => onDeleteTab(node)}
              title="Удалить категорию"
              aria-label={`Удалить ${node.name}`}
            >
              ×
            </button>
          )}
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className="tabs-tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedTabId={selectedTabId}
              onSelect={onSelect}
              onDeleteTab={onDeleteTab}
              onEditFields={onEditFields}
              onMoveTab={onMoveTab}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TabsTree({ tree, selectedTabId, onSelect, onAddTab, onDeleteTab, onEditFields, onMoveTab }) {
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const handleToggle = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="tabs-tree">
      {tree.length === 0 ? (
        <p className="tabs-tree-empty">Нет категорий. Добавьте первую.</p>
      ) : (
        <div className="tabs-tree-list">
          {tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              level={0}
              selectedTabId={selectedTabId}
              onSelect={onSelect}
              onDeleteTab={onDeleteTab}
              onEditFields={onEditFields}
              onMoveTab={onMoveTab}
              expandedIds={expandedIds}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}
      <button type="button" className="tabs-bar-add" onClick={onAddTab}>
        + Новая категория
      </button>
    </div>
  );
}
