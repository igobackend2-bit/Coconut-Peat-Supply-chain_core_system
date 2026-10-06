import type { Icon } from '@phosphor-icons/react';
import {
  Database,
  ChartBar,
  Coins,
  Factory,
  Flask,
  Gear,
  Globe,
  ListMagnifyingGlass,
  Package,
  Plant,
  Receipt,
  Robot,
  Scales,
  ShoppingCart,
  SquaresFour,
  Stack,
  Truck,
  UsersThree,
  Wrench,
  BookOpenText,
} from '@phosphor-icons/react';

/**
 * Single source of truth for the main navigation, per docs/design.md §3.
 * Drives both the sidebar links and the route table (see routes.tsx) —
 * add a module here once and it appears in both places.
 */
export interface NavItem {
  /** Path segment relative to the app root, e.g. "procurement". Empty string = index/dashboard. */
  path: string;
  label: string;
  group: string;
  icon: Icon;
}

export const navigationItems: NavItem[] = [
  { path: '', label: 'Dashboard', group: 'Overview', icon: SquaresFour },
  { path: 'master-data', label: 'Master Data', group: 'Overview', icon: Database },
  { path: 'procurement', label: 'Procurement', group: 'Inbound', icon: ShoppingCart },
  { path: 'gate-weighment', label: 'Gate & Weighment', group: 'Inbound', icon: Scales },
  { path: 'raw-materials', label: 'Raw Materials', group: 'Inbound', icon: Plant },
  { path: 'production', label: 'Production', group: 'Factory', icon: Factory },
  { path: 'quality', label: 'Quality', group: 'Factory', icon: Flask },
  { path: 'inventory', label: 'Inventory', group: 'Factory', icon: Stack },
  { path: 'packing', label: 'Packing', group: 'Factory', icon: Package },
  { path: 'sales', label: 'Sales', group: 'Outbound', icon: Receipt },
  { path: 'dispatch', label: 'Dispatch', group: 'Outbound', icon: Truck },
  { path: 'export', label: 'Export', group: 'Outbound', icon: Globe },
  { path: 'maintenance', label: 'Maintenance', group: 'Support', icon: Wrench },
  { path: 'workforce', label: 'Workforce', group: 'Support', icon: UsersThree },
  { path: 'finance', label: 'Finance', group: 'Support', icon: Coins },
  { path: 'reports', label: 'Reports', group: 'Insight', icon: ChartBar },
  { path: 'ai-agents', label: 'AI Agents', group: 'Insight', icon: Robot },
  { path: 'audit-activity', label: 'Audit & Activity', group: 'Insight', icon: ListMagnifyingGlass },
  { path: 'memory', label: 'Memory', group: 'Insight', icon: BookOpenText },
  { path: 'settings', label: 'Settings', group: 'System', icon: Gear },
];
