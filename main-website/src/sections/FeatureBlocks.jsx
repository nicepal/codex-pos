import { Link } from 'react-router-dom';
import { featureHighlights } from '../data/features';
import { useReveal } from '../hooks/useReveal';
import './FeatureBlocks.css';

export default function FeatureBlocks() {
  const { ref, visible } = useReveal();
  const [lead, ...rest] = featureHighlights;

  return (
    <section className="section features-home" id="features" ref={ref}>
      <div className={`container reveal ${visible ? 'is-visible' : ''}`}>
        <p className="section-label">Capabilities</p>
        <h2 className="section-title">What CodexPOS ships today</h2>
        <p className="section-lead">
          Core retail ops on one tenant — with feature packs for depth. No invented marketplace
          networks or autonomous AI buying.
        </p>

        <article className="feat-lead">
          <div>
            <h3>{lead.title}</h3>
            <p>{lead.body}</p>
            <ul>
              {lead.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <Link className="text-link" to={lead.href}>
              Explore POS →
            </Link>
          </div>
          <div className="feat-lead-visual" aria-hidden="true">
            <div className="pos-mock">
              <div className="pos-mock-bar">POS · Register 1</div>
              <div className="pos-mock-grid">
                <span>Coffee</span>
                <span>Mug</span>
                <span>Pastry</span>
                <span>Gift card</span>
              </div>
              <div className="pos-mock-cart">
                <div>
                  <span>2 items</span>
                  <strong>$18.50</strong>
                </div>
                <div className="pos-mock-pay">Cash · Card · Split</div>
              </div>
            </div>
          </div>
        </article>

        <div className="feat-pair">
          {rest.map((f) => (
            <article key={f.id} className="feat-card">
              <h3>{f.title}</h3>
              <p>{f.body}</p>
              <ul>
                {f.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <Link className="text-link" to={f.href}>
                Learn more →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
