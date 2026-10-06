import { lazy } from 'react';

/** Route-level code splitting: each page is fetched when first visited. This file only exports components. */
export const AiAgentsPage = lazy(() => import('../pages/AiAgentsPage').then((m) => ({ default: m.AiAgentsPage })));
export const AuditActivityPage = lazy(() => import('../pages/AuditActivityPage').then((m) => ({ default: m.AuditActivityPage })));
export const DispatchPage = lazy(() => import('../pages/DispatchPage').then((m) => ({ default: m.DispatchPage })));
export const ExportPage = lazy(() => import('../pages/ExportPage').then((m) => ({ default: m.ExportPage })));
export const FinancePage = lazy(() => import('../pages/FinancePage').then((m) => ({ default: m.FinancePage })));
export const GateWeighmentPage = lazy(() => import('../pages/GateWeighmentPage').then((m) => ({ default: m.GateWeighmentPage })));
export const InventoryPage = lazy(() => import('../pages/InventoryPage').then((m) => ({ default: m.InventoryPage })));
export const MaintenancePage = lazy(() => import('../pages/MaintenancePage').then((m) => ({ default: m.MaintenancePage })));
export const MasterDataPage = lazy(() => import('../pages/MasterDataPage').then((m) => ({ default: m.MasterDataPage })));
export const MemoryPage = lazy(() => import('../pages/MemoryPage').then((m) => ({ default: m.MemoryPage })));
export const PackingPage = lazy(() => import('../pages/PackingPage').then((m) => ({ default: m.PackingPage })));
export const ProcurementPage = lazy(() => import('../pages/ProcurementPage').then((m) => ({ default: m.ProcurementPage })));
export const ProductionPage = lazy(() => import('../pages/ProductionPage').then((m) => ({ default: m.ProductionPage })));
export const QualityPage = lazy(() => import('../pages/QualityPage').then((m) => ({ default: m.QualityPage })));
export const RawMaterialsPage = lazy(() => import('../pages/RawMaterialsPage').then((m) => ({ default: m.RawMaterialsPage })));
export const ReportsPage = lazy(() => import('../pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
export const SalesPage = lazy(() => import('../pages/SalesPage').then((m) => ({ default: m.SalesPage })));
export const SettingsPage = lazy(() => import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
export const WorkforcePage = lazy(() => import('../pages/WorkforcePage').then((m) => ({ default: m.WorkforcePage })));
