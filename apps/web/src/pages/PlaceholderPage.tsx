interface PlaceholderPageProps {
  title: string;
}

/**
 * Stand-in for every module screen that hasn't been built yet (see
 * docs/project-state.md for what's actually implemented). Renders the
 * module name so navigation/routing is provably correct end-to-end
 * before real screens exist.
 */
export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <section>
      <h1>{title}</h1>
      <p>This module is not implemented yet.</p>
    </section>
  );
}
