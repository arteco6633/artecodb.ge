/**
 * Строит дерево категорий из плоского списка (по parent_id и sort_order).
 * @param {Array<{ id: string, parent_id: string|null, sort_order: number, ... }>} flat
 * @returns {Array<{ ...tab, children: Array }>}
 */
export function buildTree(flat) {
  if (!Array.isArray(flat)) return [];
  const byId = new Map(flat.map((t) => [t.id, { ...t, children: [] }]));
  const roots = [];
  for (const tab of byId.values()) {
    const node = tab;
    if (tab.parent_id == null) {
      roots.push(node);
    } else {
      const parent = byId.get(tab.parent_id);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }
  const sortChildren = (nodes) => {
    nodes.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    nodes.forEach((n) => sortChildren(n.children));
  };
  sortChildren(roots);
  return roots;
}

/**
 * Разворачивает дерево в плоский список с уровнями (для селекта «Родитель»).
 * @param {Array<{ children: Array }>} tree
 * @param {number} level
 * @returns {Array<{ tab: object, level: number }>}
 */
export function flattenWithLevel(tree, level = 0) {
  const out = [];
  for (const node of tree) {
    const { children, ...tab } = node;
    out.push({ tab: { ...tab }, level });
    if (children?.length) out.push(...flattenWithLevel(children, level + 1));
  }
  return out;
}

/**
 * Все id потомков категории (дети, внуки и т.д.) — чтобы не допустить циклов при перемещении.
 * @param {Array<{ id: string, parent_id: string|null }>} flat
 * @param {string} tabId
 * @returns {Set<string>}
 */
export function getDescendantIds(flat, tabId) {
  const byId = new Map(flat.map((t) => [t.id, t]));
  const out = new Set();
  let frontier = [tabId];
  while (frontier.length) {
    const id = frontier.pop();
    for (const t of flat) {
      if (t.parent_id === id) {
        out.add(t.id);
        frontier.push(t.id);
      }
    }
  }
  return out;
}

/**
 * Путь от корня до вкладки (массив имён для хлебных крошек).
 * @param {Array<{ id: string, parent_id: string|null, name: string }>} flat
 * @param {string} tabId
 * @returns {string[]}
 */
export function getBreadcrumb(flat, tabId) {
  const byId = new Map(flat.map((t) => [t.id, t]));
  const path = [];
  let cur = byId.get(tabId);
  while (cur) {
    path.unshift(cur.name);
    cur = cur.parent_id ? byId.get(cur.parent_id) : null;
  }
  return path;
}
