'use client';

import { useState } from 'react';

const Chevron = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }} aria-hidden>
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const FolderClosed = () => (
  <svg className="tabs-tree-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const FolderOpen = () => (
  <svg className="tabs-tree-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    <path d="M2 10h20" />
  </svg>
);

const FileIcon = () => (
  <svg className="tabs-tree-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </svg>
);

const FolderIcon = ({ hasChildren, open }) => (
  <span className="tabs-tree-icon" aria-hidden>
    {hasChildren ? (open ? <FolderOpen /> : <FolderClosed />) : <FileIcon />}
  </span>
);

function TreeNode({ node, level, rootIndex, onReorderRoots, selectedTabId, onSelect, onDeleteTab, onEditFields, onMoveTab, expandedIds, onToggle }) {
  const hasChildren = node.children?.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedTabId === node.id;
  const isRoot = level === 0;

  const handleDragStart = (e) => {
    if (!isRoot || !onReorderRoots) return;
    e.dataTransfer.setData('text/plain', String(rootIndex));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ rootIndex }));
    const row = e.target.closest('.tabs-tree-row');
    if (row) row.classList.add('tabs-tree-row--dragging');
  };

  const handleDragEnd = (e) => {
    const row = e.target.closest('.tabs-tree-row');
    if (row) row.classList.remove('tabs-tree-row--dragging');
  };

  const handleDragOver = (e) => {
    if (!isRoot || !onReorderRoots) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('tabs-tree-row--drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('tabs-tree-row--drag-over');
  };

  const handleDrop = (e) => {
    if (!isRoot || !onReorderRoots) return;
    e.preventDefault();
    e.currentTarget.classList.remove('tabs-tree-row--drag-over');
    let fromIndex;
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) fromIndex = JSON.parse(data).rootIndex;
      else fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    } catch {
      fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    }
    if (Number.isNaN(fromIndex) || fromIndex === rootIndex) return;
    onReorderRoots(fromIndex, rootIndex);
  };

  return (
    <div className="tabs-tree-node" data-level={level}>
      <div
        className={`tabs-tree-row ${isSelected ? 'tabs-tree-row--active' : ''} ${isRoot && onReorderRoots ? 'tabs-tree-row--draggable' : ''}`}
        style={{ paddingLeft: 12 + level * 16 }}
        {...(isRoot && onReorderRoots && {
          onDragOver: handleDragOver,
          onDragLeave: handleDragLeave,
          onDrop: handleDrop,
        })}
      >
        {isRoot && onReorderRoots && (
          <span
            className="tabs-tree-drag-handle"
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={(e) => e.stopPropagation()}
            title="Перетащите для изменения порядка"
            aria-hidden
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
          </span>
        )}
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
          onClick={() => {
            onSelect(node.id);
            if (hasChildren) onToggle(node.id);
          }}
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

export function TabsTree({ tree, selectedTabId, onSelect, onAddTab, onDeleteTab, onEditFields, onMoveTab, onReorderRoots }) {
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
          {tree.map((node, index) => (
            <TreeNode
              key={node.id}
              node={node}
              level={0}
              rootIndex={index}
              onReorderRoots={onReorderRoots}
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
