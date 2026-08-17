import { Link } from 'react-router-dom';
import { shopifyPage } from '../data/integrations';
import { usePageMeta } from '../hooks/usePageMeta';
import FinalCta from '../sections/FinalCta';

export default function ShopifyPage() {
  usePageMeta({
    title: 'Shopify integration',
    description: shopifyPage.description,
    path: '/integrations/shopify',
  });

  return (
    <>
      <div className="page-shell">
        <header className="container page-hero">
          <p className="section-label">
            <Link to="/">Integrations</Link> / Shopify
          </p>
          <h1>{shopifyPage.title}</h1>
          <p>{shopifyPage.description}</p>
        </header>
        <section className="section">
          <div className="container prose">
            <h2>How import works</h2>
            <ol>
              {shopifyPage.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <h2>Honest limits</h2>
            <ul>
              {shopifyPage.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
      <FinalCta />
    </>
  );
}
