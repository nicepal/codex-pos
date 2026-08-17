import { useReveal } from '../hooks/useReveal';
import './DeveloperPlatform.css';

const snippet = `curl -s https://api.codexpos.store/api/v1/public/v1/products \\
  -H "Authorization: Bearer cx_live_***" \\
  -H "X-Tenant-Slug: demo"`;

export default function DeveloperPlatform() {
  const { ref, visible } = useReveal();
  return (
    <section className="section developer-platform section--dark" id="developers" ref={ref}>
      <div className={`container developer-grid reveal ${visible ? 'is-visible' : ''}`}>
        <div>
          <p className="section-label">Developer platform</p>
          <h2 className="section-title">API keys, metering, and webhooks</h2>
          <p className="section-lead">
            Issue keys from the business Developers page, call the public API, and wire webhooks for
            automation. Enterprise seed plans include an api_access flag.
          </p>
        </div>
        <pre className="code-panel" tabIndex={0}>
          <code>{snippet}</code>
        </pre>
      </div>
    </section>
  );
}
