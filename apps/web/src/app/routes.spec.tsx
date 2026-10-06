import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { navigationItems } from './navigation';
import { pages, routes } from './routes';

// Pages fire real fetch() calls on mount; stub it so route tests don't need a backend.
vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no backend in this test'))));

afterEach(() => {
  localStorage.clear();
});

describe('routes', () => {
  it('redirects to /login when there is no session', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/'] });
    render(<RouterProvider router={router} />);

    // RequireAuth (app/RequireAuth.tsx) redirects unauthenticated visitors — verified here rather than
    // assuming Dashboard renders directly, since every "/" route is now behind that guard.
    expect(router.state.location.pathname).toBe('/login');
  });

  it('renders a not-found page for an unknown address when signed in', async () => {
    localStorage.setItem('cpf_token', 'test-token');
    const router = createMemoryRouter(routes, { initialEntries: ['/no-such-module'] });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toBeInTheDocument();
  });

  it('has a real screen for every navigation entry', () => {
    const missing = navigationItems.filter((item) => item.path !== '' && !(item.path in pages)).map((item) => item.path);
    expect(missing).toEqual([]);
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
    expect(childPaths).toContain('*'); // not-found fallback
    expect(childPaths).toHaveLength(21); // 1 index + 19 named routes + the not-found fallback
  });

  it('groups navigation into labelled sections', () => {
    const groups = [...new Set(navigationItems.map((i) => i.group))];
    expect(groups).toEqual(['Overview', 'Inbound', 'Factory', 'Outbound', 'Support', 'Insight', 'System']);
  });
});
