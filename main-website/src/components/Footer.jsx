import { Link } from 'react-router-dom';
import PosHiveLogo from './PosHiveLogo';
import { footerLinks } from '../data/navigation';
import { site, registerUrl } from '../data/site';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <PosHiveLogo variant="dark" size="md" />
          <p>{site.tagline}</p>
          <a className="btn btn-on-dark" href={registerUrl}>
            Get Started
          </a>
        </div>
        <div>
          <h3>Product</h3>
          <ul>
            {footerLinks.product.map((l) => (
              <li key={l.href}>
                <Link to={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Company</h3>
          <ul>
            {footerLinks.company.map((l) => (
              <li key={l.href}>
                <Link to={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Contact</h3>
          <ul>
            <li>
              <a href={`mailto:${site.email}`}>{site.email}</a>
            </li>
            <li>
              <span className="muted" style={{ color: 'rgba(244,247,246,0.5)' }}>
                {site.domain}
              </span>
            </li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} PosHive. All rights reserved.</p>
        <p>Multi-tenant retail software for growing shops.</p>
      </div>
    </footer>
  );
}
