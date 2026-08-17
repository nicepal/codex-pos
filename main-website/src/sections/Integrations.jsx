import { Link } from 'react-router-dom';
import { integrations } from '../data/integrations';
import { useReveal } from '../hooks/useReveal';
import './Integrations.css';

export default function Integrations() {
  const { ref, visible } = useReveal();
  return (
    <section className="section integrations" id="integrations" ref={ref}>
      <div className={`container reveal ${visible ? 'is-visible' : ''}`}>
        <p className="section-label">Integrations</p>
        <h2 className="section-title">Connect what you already run</h2>
        <p className="section-lead">
          Only integrations that ship today: Shopify import, Stripe billing, email, webhooks, and
          the developer API.
        </p>
        <div className="integrations-grid">
          {integrations.map((item) => (
            <Link key={item.id} to={item.href} className="integration-card">
              <strong>{item.name}</strong>
              <p>{item.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
