import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { routes } from './routes';

// Dashboard fires a real fetch() on mount; stub it so route tests don't
// depend on a running backend.
vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no backend in this test'))));

describe('routes', () => {
  it('redirects to /login when there is no session', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/'] });
    render(<RouterProvider router={router} />);

    // RequireAuth (app/RequireAuth.tsx) redirects unauthenticated visitors — verified here rather than
    // assuming Dashboard renders directly, since every "/" route is now behind that guard.
    expect(router.state.location.pathname).toBe('/login');
  });

  it('renders a PlaceholderPage for a module with no backend yet', async () => {
    localStorage.setItem('cpf_token', 'test-token');
    // /packing: still genuinely unimplemented (no API) as of this test —
    // /inventory used to be the example here but is real now (see
    // docs/changelog.md's Inventory/stock_ledger entry).
    const router = createMemoryRouter(routes, { initialEntries: ['/packing'] });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'Packing' })).toBeInTheDocument();
    expect(screen.getByText('This module is not implemented yet.')).toBeInTheDocument();
    localStorage.clear();
  });

  it('covers every navigationItems entry with a route', () => {
    // Structural check: routes.tsx generates from navigationItems, so
    // this mostly guards against someone hand-editing one without the
    // other in the future.
    const appShellRoute = routes[1].children?.[0];
    const childPaths = appShellRoute && 'children' in appShellRoute
      ? appShellRoute.children?.map((r) => ('path' in r ? r.path : '__index__')) ?? []
      : [];
    expect(childPaths).toContain('__index__'); // Dashboard (index route)
    expect(childPaths).toContain('master-data');
    expect(childPaths).toContain('production');
    expect(childPaths).toContain('audit-activity');
    expect(childPaths).toHaveLength(20); // 1 index + 19 named routes (18 from docs/design.md §3 + Master Data)
  });
});
