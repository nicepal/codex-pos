import { trustItems } from '../data/features';
import { useReveal } from '../hooks/useReveal';
import './TrustIcons.css';

export default function TrustIcons() {
  const { ref, visible } = useReveal();
  return (
    <section className="section section--tight trust" ref={ref} aria-label="Platform foundations">
      <div className={`container reveal ${visible ? 'is-visible' : ''}`}>
        <p className="section-label">Built for multi-tenant retail</p>
        <ul className="trust-grid">
          {trustItems.map((item) => (
            <li key={item.label}>
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
