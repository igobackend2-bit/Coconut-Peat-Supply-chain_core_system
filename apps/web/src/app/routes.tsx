import type { ReactElement } from 'react';
import type { RouteObject } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Dashboard } from '../pages/Dashboard';
import { Login } from '../pages/Login';
import { NotFound } from '../pages/NotFound';
import { AiAgentsPage, AuditActivityPage, DispatchPage, ExportPage, FinancePage, GateWeighmentPage, InventoryPage, MaintenancePage, MasterDataPage, MemoryPage, PackingPage, ProcurementPage, ProductionPage, QualityPage, RawMaterialsPage, ReportsPage, SalesPage, SettingsPage, WorkforcePage } from './lazyPages';
import { navigationItems } from './navigation';
import { RequireAuth } from './RequireAuth';

/** Screen for every navigation entry except the dashboard (the index route). Exported so a test can assert none is missing. */
export const pages: Record<string, ReactElement> = {
  'master-data': <MasterDataPage />,
  procurement: <ProcurementPage />,
  'gate-weighment': <GateWeighmentPage />,
  'raw-materials': <RawMaterialsPage />,
  production: <ProductionPage />,
  quality: <QualityPage />,
  inventory: <InventoryPage />,
  packing: <PackingPage />,
  sales: <SalesPage />,
  dispatch: <DispatchPage />,
  export: <ExportPage />,
  maintenance: <MaintenancePage />,
  workforce: <WorkforcePage />,
  finance: <FinancePage />,
  reports: <ReportsPage />,
  'ai-agents': <AiAgentsPage />,
  'audit-activity': <AuditActivityPage />,
  memory: <MemoryPage />,
  settings: <SettingsPage />,
};

export const routes: RouteObject[] = [
  { path: '/login', element: <Login /> },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <Dashboard /> },
          ...navigationItems
            .filter((item) => item.path !== '')
            .map((item) => ({
              path: item.path,
              element: pages[item.path] ?? <NotFound />,
            })),
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
];
