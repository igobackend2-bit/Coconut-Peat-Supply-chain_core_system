import { Link } from 'react-router-dom';
import { EmptyState, PageHeader } from '../components/ui';

export function NotFound() {
  return (
    <section>
      <PageHeader title="Page not found" />
      <EmptyState
        title="That address doesn’t lead anywhere"
        hint="The link may be out of date, or the page was moved. Use the navigation, or head back to the dashboard."
        action={
          <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Back to dashboard
          </Link>
        }
      />
    </section>
  );
}
