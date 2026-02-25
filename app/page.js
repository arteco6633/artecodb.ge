'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getEnabledFields, getCustomFields } from '../lib/fields';
import { TabsBar } from './components/TabsBar';
import { ItemsTable } from './components/ItemsTable';
import { ItemForm } from './components/ItemForm';
import { ItemCard } from './components/ItemCard';
import { AddTabForm } from './components/AddTabForm';
import { TabFieldsForm } from './components/TabFieldsForm';
import { Search } from './components/Search';

export default function Home() {
  const [tabs, setTabs] = useState([]);
  const [selectedTabId, setSelectedTabId] = useState(null);
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showAddTab, setShowAddTab] = useState(false);
  const [editingTabFields, setEditingTabFields] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItemCard, setSelectedItemCard] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const loadTabs = async () => {
    const { data, error } = await supabase
      .from('tabs')
      .select('*')
      .order('sort_order');
    if (!error) setTabs(data || []);
    if (data?.length && !selectedTabId) setSelectedTabId(data[0].id);
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

  const handleAddTab = () => setShowAddTab(true);
  const handleCloseAddTab = () => {
    setShowAddTab(false);
    loadTabs();
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
      <header className="app-header" role="banner">
        <div className="app-header-bar container">
          <a href="/" className="app-logo">
            <span className="app-logo-crop">
              <img src="/logo.png" alt="Artecodb" className="app-logo-img" />
            </span>
          </a>
          <div className="app-header-right">
            <Search tabs={tabs} onSelectItem={handleSearchSelectItem} />
            <a href="/parser" className="app-link">
              Актуализация с LTB.ge →
            </a>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          <section className="tabs-section card">
            <div className="tabs-section-header">
              <h2 className="section-title">Категории</h2>
              <TabsBar
                tabs={tabs}
                selectedTabId={selectedTabId}
                onSelect={setSelectedTabId}
                onAddTab={handleAddTab}
                onDeleteTab={handleDeleteTab}
                onEditFields={setEditingTabFields}
                onReorder={handleReorderTabs}
              />
            </div>
          </section>

          {selectedTab && (
            <section className="content-section card">
              <div className="content-section-header">
                <h2 className="section-title content-section-title">{selectedTab.name}</h2>
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

          {showAddTab && <AddTabForm onClose={handleCloseAddTab} />}
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
      </main>
    </div>
  );
}
