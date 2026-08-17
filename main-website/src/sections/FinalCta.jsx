import { registerUrl, loginUrl } from '../data/site';
import './FinalCta.css';

export default function FinalCta() {
  return (
    <section className="final-cta">
      <div className="container final-cta-inner">
        <h2>Ready to put retail ops on one platform?</h2>
        <p>Start a trial on Starter or Professional (14 days) or Enterprise (30 days).</p>
        <div className="final-cta-actions">
          <a className="btn btn-on-dark" href={registerUrl}>
            Get Started
          </a>
          <a className="btn btn-ghost-on-dark" href={loginUrl}>
            Login
          </a>
        </div>
      </div>
    </section>
  );
}
