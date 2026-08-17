import { Link } from 'react-router-dom';
import FaqAccordion from '../components/FaqAccordion';
import { faqItems } from '../data/faq';
import { useReveal } from '../hooks/useReveal';

export default function FaqTeaser() {
  const { ref, visible } = useReveal();
  return (
    <section className="section" ref={ref}>
      <div className={`container reveal ${visible ? 'is-visible' : ''}`}>
        <p className="section-label">FAQ</p>
        <h2 className="section-title">Quick answers</h2>
        <div style={{ marginTop: '1.5rem', maxWidth: 760 }}>
          <FaqAccordion items={faqItems.slice(0, 4)} />
        </div>
        <p style={{ marginTop: '1.25rem' }}>
          <Link className="text-link" to="/faq">
            See all FAQs →
          </Link>
        </p>
      </div>
    </section>
  );
}
