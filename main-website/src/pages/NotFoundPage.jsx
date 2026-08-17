import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';

export default function NotFoundPage() {
  usePageMeta({
    title: 'Page not found',
    description: 'The page you requested does not exist on CodexPOS.',
    path: '/404',
  });

  return (
    <div className="page-shell">
      <div className="container page-hero">
        <h1>Page not found</h1>
        <p>That route is not part of the CodexPOS marketing site.</p>
        <Link className="btn btn-primary" to="/">
          Back home
        </Link>
      </div>
    </div>
  );
}
