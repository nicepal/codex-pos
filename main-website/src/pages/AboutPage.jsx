import { site } from '../data/site';
import { usePageMeta } from '../hooks/usePageMeta';
import FinalCta from '../sections/FinalCta';

export default function AboutPage() {
  usePageMeta({
    title: 'About',
    description:
      'PosHive is a multi-tenant SaaS for POS, inventory, and storefronts — with strict tenant isolation.',
    path: '/about',
  });

  return (
    <>
      <div className="page-shell">
        <header className="container page-hero">
          <p className="section-label">About</p>
          <h1>Built for multi-tenant retail</h1>
          <p>
            PosHive ({site.domain}) is a production multi-tenant platform where super admins run
            the platform and each business runs POS, inventory, and optional storefronts on shared
            infrastructure — isolated by tenant_id.
          </p>
        </header>
        <div className="container" style={{ maxWidth: 720 }}>
          <h2>What we optimize for</h2>
          <ul style={{ color: 'var(--color-muted)', lineHeight: 1.7 }}>
            <li>Tenant isolation first — scoped queries and RBAC</li>
            <li>Honest packaging — feature packs and plan limits you can verify in seed data</li>
            <li>Operational depth — POS, stock, reports, Shopify import, developer API</li>
          </ul>
          <h2 style={{ marginTop: '2rem' }}>What we do not claim</h2>
          <ul style={{ color: 'var(--color-muted)', lineHeight: 1.7 }}>
            <li>Full marketplace networks (Amazon/eBay stubs only)</li>
            <li>Autonomous AI purchasing or guaranteed forecasts</li>
            <li>Being a drop-in Shopify replacement</li>
          </ul>
        </div>
      </div>
      <FinalCta />
    </>
  );
}
