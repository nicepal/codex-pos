import { Link } from 'react-router-dom';
import { featurePages, featureHighlights } from '../data/features';
import { usePageMeta } from '../hooks/usePageMeta';
import FinalCta from '../sections/FinalCta';

export default function FeaturesPage() {
  const overview = featurePages.overview;
  usePageMeta({
    title: 'Features',
    description: overview.description,
    path: '/features',
  });

  return (
    <>
      <div className="page-shell">
        <header className="container page-hero">
          <p className="section-label">Features</p>
          <h1>{overview.title}</h1>
          <p>{overview.description}</p>
        </header>

        <section className="container" style={{ marginBottom: '3rem' }}>
          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            }}
          >
            {overview.groups.map((g) => (
              <div
                key={g.title}
                style={{
                  padding: '1.35rem',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-line)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <h2 style={{ fontSize: '1.15rem' }}>{g.title}</h2>
                <ul style={{ color: 'var(--color-muted)', paddingLeft: '1.1rem' }}>
                  {g.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="container">
          <h2 className="section-title">Dive deeper</h2>
          <div
            style={{
              display: 'grid',
              gap: '1rem',
              marginTop: '1.5rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            }}
          >
            {featureHighlights.map((f) => (
              <Link
                key={f.id}
                to={f.href}
                style={{
                  display: 'block',
                  padding: '1.35rem',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-line)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <strong style={{ display: 'block', marginBottom: '0.5rem' }}>{f.title}</strong>
                <span style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>{f.body}</span>
              </Link>
            ))}
            <Link
              to="/features/analytics"
              style={{
                display: 'block',
                padding: '1.35rem',
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-line)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
                Analytics & AI insights
              </strong>
              <span style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
                Reports with Recharts; assistive AI reorder insights on AI Pro.
              </span>
            </Link>
          </div>
        </section>
      </div>
      <FinalCta />
    </>
  );
}
