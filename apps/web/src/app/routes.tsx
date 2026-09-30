import type { ReactElement } from 'react';
import type { RouteObject } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Dashboard } from '../pages/Dashboard';
import { GateWeighmentPage } from '../pages/GateWeighmentPage';
import { InventoryPage } from '../pages/InventoryPage';
import { Login } from '../pages/Login';
import { MasterDataPage } from '../pages/MasterDataPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { ProcurementPage } from '../pages/ProcurementPage';
import { ProductionPage } from '../pages/ProductionPage';
import { QualityPage } from '../pages/QualityPage';
import { RawMaterialsPage } from '../pages/RawMaterialsPage';
import { navigationItems } from './navigation';
import { RequireAuth } from './RequireAuth';

/**
 * Real pages for every module with a working backend (see
 * docs/roadmap.md for what's built). Everything else still renders
 * PlaceholderPage — there's no API for Inventory, Packing, Sales,
 * Dispatch, Export, Maintenance, Workforce, Finance, Reports, AI Agents,
 * Audit & Activity, or Memory yet, so building screens for them would
 * just be fake UI with nothing behind it.
 */
const REAL_PAGES: Record<string, ReactElement> = {
  'master-data': <MasterDataPage />,
  procurement: <ProcurementPage />,
  'gate-weighment': <GateWeighmentPage />,
  'raw-materials': <RawMaterialsPage />,
  production: <ProductionPage />,
  quality: <QualityPage />,
  inventory: <InventoryPage />,
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
              element: REAL_PAGES[item.path] ?? <PlaceholderPage title={item.label} />,
            })),
        ],
      },
    ],
  },
];
