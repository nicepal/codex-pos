import { howItWorks } from '../data/features';
import { registerUrl } from '../data/site';
import { useReveal } from '../hooks/useReveal';
import './HowItWorks.css';

export default function HowItWorks() {
  const { ref, visible } = useReveal();
  return (
    <section className="section how" id="how-it-works" ref={ref}>
      <div className={`container reveal ${visible ? 'is-visible' : ''}`}>
        <p className="section-label">How it works</p>
        <h2 className="section-title">Three steps to your first sale</h2>
        <p className="section-lead">
          Register, seed a starter catalog from your business type, then invite the team and sell.
        </p>
        <ol className="how-steps">
          {howItWorks.map((s) => (
            <li key={s.step}>
              <span className="how-num" aria-hidden="true">
                {s.step}
              </span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="how-catalog">
          <h3>Starter catalog included</h3>
          <p>
            Onboarding templates cover retail, restaurant, grocery, fashion, electronics, beauty,
            pharmacy (OTC), wholesale, and general — each with sample categories and products.
          </p>
          <a className="btn btn-primary" href={registerUrl}>
            Get Started
          </a>
        </div>
      </div>
    </section>
  );
}
