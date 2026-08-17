import { Link } from 'react-router-dom';
import { plans } from '../data/pricing';
import { registerUrl } from '../data/site';
import { useReveal } from '../hooks/useReveal';
import './PricingTeaser.css';

export default function PricingTeaser() {
  const { ref, visible } = useReveal();
  return (
    <section className="section pricing-teaser" id="pricing-teaser" ref={ref}>
      <div className={`container reveal ${visible ? 'is-visible' : ''}`}>
        <p className="section-label">Pricing</p>
        <h2 className="section-title">Simple plans from seed configuration</h2>
        <p className="section-lead">
          Starter, Professional, and Enterprise — prices and limits match backend seed data. Annual
          billing saves roughly two months.
        </p>
        <div className="pt-grid">
          {plans.map((p) => (
            <article key={p.id} className={`pt-card ${p.highlighted ? 'is-hot' : ''}`}>
              {p.highlighted && <span className="badge">Most popular</span>}
              <h3>{p.name}</h3>
              <p className="pt-price">
                <strong>${p.monthly}</strong>
                <span>/mo</span>
              </p>
              <p>{p.blurb}</p>
              <ul>
                <li>{p.limits.products}</li>
                <li>{p.limits.users}</li>
                <li>{p.limits.branches}</li>
                <li>{p.trialDays}-day trial</li>
              </ul>
              <a className="btn btn-primary" href={registerUrl}>
                Get Started
              </a>
            </article>
          ))}
        </div>
        <p className="pt-more">
          <Link className="text-link" to="/pricing">
            Full comparison & feature packs →
          </Link>
        </p>
      </div>
    </section>
  );
}
