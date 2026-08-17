import { businessTypes } from '../data/features';
import { registerUrl } from '../data/site';
import { useReveal } from '../hooks/useReveal';
import './BusinessTypes.css';

export default function BusinessTypes() {
  const { ref, visible } = useReveal();
  return (
    <section className="section business-types" id="business-types" ref={ref}>
      <div className={`container reveal ${visible ? 'is-visible' : ''}`}>
        <p className="section-label">Onboarding</p>
        <h2 className="section-title">Built for how you sell</h2>
        <p className="section-lead">
          Pick a business type during onboarding and load a starter catalog — categories and sample
          products so day one is not empty.
        </p>
        <ul className="biz-grid">
          {businessTypes.map((b) => (
            <li key={b.id}>
              <a href={registerUrl} className="biz-card">
                <strong>{b.label}</strong>
                <span>{b.description}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="biz-cta">
          <a className="btn btn-primary" href={registerUrl}>
            Get Started
          </a>
        </p>
      </div>
    </section>
  );
}
