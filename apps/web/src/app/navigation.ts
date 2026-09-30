/**
 * Single source of truth for the main navigation, per docs/design.md §3.
 * Drives both the sidebar links and the route table (see routes.tsx) —
 * add a module here once and it appears in both places.
 */
export interface NavItem {
  /** Path segment relative to the app root, e.g. "procurement". Empty string = index/dashboard. */
  path: string;
  label: string;
}

export const navigationItems: NavItem[] = [
  { path: '', label: 'Dashboard' },
  { path: 'master-data', label: 'Master Data' },
  { path: 'procurement', label: 'Procurement' },
  { path: 'gate-weighment', label: 'Gate & Weighment' },
  { path: 'raw-materials', label: 'Raw Materials' },
  { path: 'production', label: 'Production' },
  { path: 'quality', label: 'Quality' },
  { path: 'inventory', label: 'Inventory' },
  { path: 'packing', label: 'Packing' },
  { path: 'sales', label: 'Sales' },
  { path: 'dispatch', label: 'Dispatch' },
  { path: 'export', label: 'Export' },
  { path: 'maintenance', label: 'Maintenance' },
  { path: 'workforce', label: 'Workforce' },
  { path: 'finance', label: 'Finance' },
  { path: 'reports', label: 'Reports' },
  { path: 'ai-agents', label: 'AI Agents' },
  { path: 'audit-activity', label: 'Audit & Activity' },
  { path: 'memory', label: 'Memory' },
  { path: 'settings', label: 'Settings' },
];
