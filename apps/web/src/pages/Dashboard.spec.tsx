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

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe('Dashboard', () => {
  it('shows API connected once the health check succeeds, and renders counts from each module', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.endsWith('/health')) return jsonResponse({ status: 'ok', service: 'coco-pith-factory-api' });
        if (url.endsWith('/products')) return jsonResponse([{ id: '1' }, { id: '2' }]);
        if (url.endsWith('/purchase-orders')) return jsonResponse([{ id: '1', poNumber: 'PO-1', status: 'PENDING_APPROVAL', totalAmount: '5000' }]);
        return jsonResponse([]);
      }),
    );

    renderDashboard();

    const statusBadge = await screen.findByTestId('api-status');
    expect(within(statusBadge).getByText('API connected')).toBeInTheDocument();
    expect(await screen.findByText('2')).toBeInTheDocument(); // Products count
    expect(await screen.findByText(/PO-1/)).toBeInTheDocument(); // Needs Attention row
  });

  it('shows an error badge when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('fetch failed'))));

    renderDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent('API unreachable: fetch failed');
  });

  it('shows the empty state when nothing needs attention', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse([])));

    renderDashboard();

    expect(await screen.findByText(/Nothing pending/)).toBeInTheDocument();
  });
});
