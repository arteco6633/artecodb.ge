'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getEnabledFields, getCustomFields } from '../lib/fields';
import { buildTree, getBreadcrumb } from '../lib/tabsTree';
import { TabsTree } from './components/TabsTree';
import { ItemsTable } from './components/ItemsTable';
import { ItemForm } from './components/ItemForm';
import { ItemCard } from './components/ItemCard';
import { AddTabForm } from './components/AddTabForm';
import { MoveTabForm } from './components/MoveTabForm';
import { TabFieldsForm } from './components/TabFieldsForm';
import { Search } from './components/Search';

export default function Home() {
  const [tabs, setTabs] = useState([]);
  const [selectedTabId, setSelectedTabId] = useState(null);
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showAddTab, setShowAddTab] = useState(false);
  const [addTabDefaultParentId, setAddTabDefaultParentId] = useState(null);
  const [movingTab, setMovingTab] = useState(null);
  const [editingTabFields, setEditingTabFields] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItemCard, setSelectedItemCard] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const loadTabs = async () => {
    const { data, error } = await supabase
      .from('tabs')
      .select('*')
      .order('sort_order');
    const list = data || [];
    if (!error) setTabs(list);
    if (list.length && !selectedTabId) {
      const roots = buildTree(list);
      setSelectedTabId(roots[0]?.id ?? list[0].id);
    }
  };

  const loadItems = async () => {
    if (!selectedTabId) {
      setItems([]);
      return;
    }
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('tab_id', selectedTabId)
      .order('created_at', { ascending: false });
    if (!error) setItems(data || []);
  };

  useEffect(() => {
    loadTabs();
  }, []);

  useEffect(() => {
    if (selectedTabId && tabs.length > 0 && !tabs.some((t) => t.id === selectedTabId)) {
      const roots = buildTree(tabs);
      setSelectedTabId(roots[0]?.id ?? tabs[0]?.id ?? null);
    }
  }, [tabs, selectedTabId]);

  useEffect(() => {
    setSelectedIds([]);
    setLoading(true);
    loadItems().finally(() => setLoading(false));
  }, [selectedTabId]);

  const handleAddItem = () => {
    setEditingItem(null);
    setShowItemForm(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowItemForm(true);
  };

  const handleCloseItemForm = () => {
    setShowItemForm(false);
    setEditingItem(null);
    loadItems();
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Удалить позицию?')) return;
    await supabase.from('items').delete().eq('id', id);
    loadItems();
  };

  const handleAddTab = () => {
    setAddTabDefaultParentId(null);
    setShowAddTab(true);
  };
  const handleCloseAddTab = (opts) => {
    setShowAddTab(false);
    const newParentId = opts?.newParentId ?? null;
    setAddTabDefaultParentId(newParentId);
    loadTabs().then(() => {
      if (newParentId) {
        setShowAddTab(true);
      }
    });
  };

  const handleDeleteTab = async (tab) => {
    if (!confirm(`Удалить вкладку «${tab.name}» и все позиции?`)) return;
    await supabase.from('tabs').delete().eq('id', tab.id);
    if (selectedTabId === tab.id) {
      const rest = tabs.filter((t) => t.id !== tab.id);
      setSelectedTabId(rest[0]?.id ?? null);
    }
    loadTabs();
  };

  const handleReorderTabs = async (draggedId, toIndex) => {
    const fromIndex = tabs.findIndex((t) => t.id === draggedId);
    if (fromIndex === -1 || fromIndex === toIndex) return;
    const reordered = [...tabs];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed);
    setTabs(reordered);
    await Promise.all(
      reordered.map((tab, i) =>
        supabase.from('tabs').update({ sort_order: i }).eq('id', tab.id)
      )
    );
  };

  const handleCloseTabFields = () => {
    setEditingTabFields(null);
    loadTabs();
  };

  const handleMoveTab = (tab) => setMovingTab(tab);
  const handleCloseMoveTab = () => {
    setMovingTab(null);
    loadTabs();
  };

  const handleOpenItemCard = (item) => setSelectedItemCard(item);
  const handleCloseItemCard = () => setSelectedItemCard(null);

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };
  const handleSelectAll = (checked) => {
    if (!selectedTabId) return;
    setSelectedIds(checked ? items.map((i) => i.id) : []);
  };
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Удалить выбранные позиции (${selectedIds.length})?`)) return;
    for (const id of selectedIds) {
      await supabase.from('items').delete().eq('id', id);
    }
    setSelectedIds([]);
    loadItems();
  };

  const handleSearchSelectItem = (item) => {
    setSelectedTabId(item.tab_id);
    setSelectedItemCard(item);
  };

  const handleTabCustomFieldsAdded = async (tabId, newFieldDefs) => {
    if (!newFieldDefs?.length) return;
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;
    const updated = [...(tab.custom_fields || []), ...newFieldDefs];
    await supabase.from('tabs').update({ custom_fields: updated }).eq('id', tabId);
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, custom_fields: updated } : t)));
  };

  const selectedTab = tabs.find((t) => t.id === selectedTabId);
  const enabledFields = selectedTab ? getEnabledFields(selectedTab) : [];
  const customFields = selectedTab ? getCustomFields(selectedTab) : [];

  return (
    <div className="app-root">
      <main className={`app-main ${sidebarCollapsed ? 'app-main--sidebar-collapsed' : ''}`}>
        <aside className={`app-sidebar ${sidebarCollapsed ? 'app-sidebar--collapsed' : ''}`} aria-label="Меню">
          <div className="app-sidebar-logo">
            <a href="/" className="app-logo" aria-label="Artecodb">
              <img src="/logo.png" alt="Artecodb" className="app-logo-img" />
            </a>
          </div>
          <div className="app-sidebar-header">
            <button
              type="button"
              className="app-sidebar-toggle"
              onClick={() => setSidebarCollapsed((v) => !v)}
              title={sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
              aria-expanded={!sidebarCollapsed}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none' }}>
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {!sidebarCollapsed && <span className="app-sidebar-title">Категории</span>}
          </div>
          {!sidebarCollapsed && (
            <>
              <div className="app-sidebar-tools">
                <Search tabs={tabs} onSelectItem={handleSearchSelectItem} />
                <a href="/parser" className="app-link app-link--block">
                  Актуализация с LTB.ge →
                </a>
              </div>
              <div className="app-sidebar-body">
                <TabsTree
                tree={buildTree(tabs)}
                selectedTabId={selectedTabId}
                onSelect={setSelectedTabId}
                onAddTab={handleAddTab}
                onDeleteTab={handleDeleteTab}
                onEditFields={setEditingTabFields}
                onMoveTab={handleMoveTab}
              />
              </div>
            </>
          )}
        </aside>

        <div className="app-content">
          <div className="container">
          {!selectedTab && (
            <div className="content-placeholder">
              <p>Выберите категорию в меню слева или добавьте новую.</p>
            </div>
          )}
          {selectedTab && (
            <section className="content-section card">
              <div className="content-section-header">
                <h2 className="section-title content-section-title">
                  {getBreadcrumb(tabs, selectedTab.id).length > 1 ? (
                    <span className="breadcrumb">
                      {getBreadcrumb(tabs, selectedTab.id).join(' → ')}
                    </span>
                  ) : (
                    selectedTab.name
                  )}
                </h2>
                <button type="button" onClick={handleAddItem} className="btn btn-primary">
                  + Добавить позицию
                </button>
              </div>

              {loading ? (
                <div className="loading-state">
                  <span>Загрузка…</span>
                </div>
              ) : (
                <ItemsTable
                  items={items}
                  enabledFields={enabledFields}
                  customFields={customFields}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                  onOpenCard={handleOpenItemCard}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onSelectAll={handleSelectAll}
                  onBulkDelete={handleBulkDelete}
                />
              )}
            </section>
          )}

          {showItemForm && (
            <ItemForm
              tabId={selectedTabId}
              item={editingItem}
              selectedTab={selectedTab}
              enabledFields={enabledFields}
              onClose={handleCloseItemForm}
              onTabCustomFieldsAdded={handleTabCustomFieldsAdded}
            />
          )}

          {showAddTab && (
            <AddTabForm
              tabsFlat={tabs}
              defaultParentId={addTabDefaultParentId ?? selectedTabId}
              onClose={handleCloseAddTab}
            />
          )}
          {movingTab && (
            <MoveTabForm
              tab={movingTab}
              tabsFlat={tabs}
              onClose={handleCloseMoveTab}
            />
          )}
          {editingTabFields && (
            <TabFieldsForm tab={editingTabFields} onClose={handleCloseTabFields} />
          )}

          {selectedItemCard && (
            <ItemCard
              item={selectedItemCard}
              tab={tabs.find((t) => t.id === selectedItemCard.tab_id)}
              onClose={handleCloseItemCard}
              onEdit={(item) => { setSelectedItemCard(null); setEditingItem(item); setShowItemForm(true); }}
            />
          )}
          </div>
        </div>
      </main>
    </div>
  );
}
