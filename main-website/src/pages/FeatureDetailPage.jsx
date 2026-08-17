import { Link } from 'react-router-dom';
import { featurePages } from '../data/features';
import { usePageMeta } from '../hooks/usePageMeta';
import FinalCta from '../sections/FinalCta';

const META = {
  pos: { path: '/features/pos' },
  inventory: { path: '/features/inventory' },
  ecommerce: { path: '/features/ecommerce' },
  analytics: { path: '/features/analytics' },
};

export default function FeatureDetailPage({ featureKey }) {
  const data = featurePages[featureKey];
  const meta = META[featureKey];

  usePageMeta({
    title: data.title,
    description: data.description,
    path: meta.path,
  });

  return (
    <>
      <div className="page-shell">
        <header className="container page-hero">
          <p className="section-label">
            <Link to="/features">Features</Link> / {data.title}
          </p>
          <h1>{data.title}</h1>
          <p>{data.description}</p>
        </header>
        <section className="section">
          <div className="container prose">
            {data.sections.map((s) => (
              <article key={s.heading} style={{ marginBottom: '2rem' }}>
                <h2>{s.heading}</h2>
                <p>{s.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
      <FinalCta />
    </>
  );
}
