import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import './MultiBranch.css';

export default function MultiBranch() {
  const { ref, visible } = useReveal();
  return (
    <section className="section multi-branch" id="multi-branch" ref={ref}>
      <div className={`container reveal ${visible ? 'is-visible' : ''}`}>
        <p className="section-label">Multi-branch</p>
        <h2 className="section-title">Grow from one counter to many locations</h2>
        <p className="section-lead">
          Branches are first-class entities with plan limits from seed data: Starter 1, Professional
          3, Enterprise unlimited. Shared catalog; transfers under Inventory Pro.
        </p>
        <div className="branch-map" aria-hidden="true">
          <div className="branch-node is-hq">
            <strong>HQ</strong>
            <span>Main branch</span>
          </div>
          <div className="branch-line" />
          <div className="branch-nodes">
            <div className="branch-node">
              <strong>Mall</strong>
              <span>Branch 2</span>
            </div>
            <div className="branch-node">
              <strong>Downtown</strong>
              <span>Branch 3</span>
            </div>
          </div>
        </div>
        <p className="branch-note">
          <Link className="text-link" to="/pricing">
            Compare branch limits on Pricing →
          </Link>
        </p>
      </div>
    </section>
  );
}
