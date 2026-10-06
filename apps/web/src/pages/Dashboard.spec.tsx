import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from './Dashboard';

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
}

const quiet = {
  sales: { confirmedOrders: 0, confirmedValue: 0, draftOrders: 0 },
  production: {},
  quality: { results: 0, failed: 0 },
  inventory: { ledgerEntries: 0, negativeProducts: 0, totalKg: 0 },
  packing: {},
  dispatch: {},
  procurement: { pendingApproval: 0, openOrders: 0 },
  maintenance: { openBreakdowns: 0, overduePlans: 0, lowStockParts: 0, suspendedMachines: 0 },
  workforce: {},
  finance: { receivablesOutstanding: 0, expensesPending: 0, expensesApprovedValue: 0 },
  export: {},
  ai: { proposed: 0, critical: 0 },
};

function stubApi(overview: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.endsWith('/health')) return jsonResponse({ status: 'ok' });
      if (url.endsWith('/reports/overview')) return jsonResponse(overview);
      return jsonResponse([]);
    }),
  );
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe('Dashboard', () => {
  it('shows API connected once the health check succeeds, and KPIs from the overview', async () => {
    stubApi({ ...quiet, sales: { confirmedOrders: 3, confirmedValue: 1250000, draftOrders: 1 } });

    renderDashboard();

    const statusBadge = await screen.findByTestId('api-status');
    expect(within(statusBadge).getByText('API connected')).toBeInTheDocument();
    expect(await screen.findByText('₹12,50,000')).toBeInTheDocument(); // Indian digit grouping
    expect(screen.getByText(/3 orders · 1 in draft/)).toBeInTheDocument();
  });

  it('lists only the things that need attention, with counts and a link to act', async () => {
    stubApi({
      ...quiet,
      procurement: { pendingApproval: 2, openOrders: 4 },
      maintenance: { openBreakdowns: 1, overduePlans: 0, lowStockParts: 0, suspendedMachines: 1 },
      ai: { proposed: 5, critical: 2 },
    });

    renderDashboard();

    expect(await screen.findByText('2 purchase orders awaiting approval')).toBeInTheDocument();
    expect(screen.getByText(/1 open breakdown — machines suspended/)).toBeInTheDocument();
    expect(screen.getByText('5 AI findings to review (2 critical)')).toBeInTheDocument();
    expect(screen.queryByText(/maintenance plans? overdue/)).not.toBeInTheDocument(); // zero-count signals are omitted
  });

  it('shows an error badge when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('fetch failed'))));

    renderDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent('API unreachable: fetch failed');
  });

  it('shows the empty state when nothing needs attention', async () => {
    stubApi(quiet);

    renderDashboard();

    expect(await screen.findByText('Nothing needs attention')).toBeInTheDocument();
  });
});
