import FaqAccordion from '../components/FaqAccordion';
import { faqItems } from '../data/faq';
import { usePageMeta } from '../hooks/usePageMeta';
import FinalCta from '../sections/FinalCta';

export default function FaqPage() {
  usePageMeta({
    title: 'FAQ',
    description: 'Frequently asked questions about PosHive plans, feature packs, Shopify, and AI.',
    path: '/faq',
  });

  return (
    <>
      <div className="page-shell">
        <header className="container page-hero">
          <p className="section-label">FAQ</p>
          <h1>Frequently asked questions</h1>
          <p>Straight answers grounded in the product as it ships today.</p>
        </header>
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container" style={{ maxWidth: 800 }}>
            <FaqAccordion items={faqItems} />
          </div>
        </section>
      </div>
      <FinalCta />
    </>
  );
}
