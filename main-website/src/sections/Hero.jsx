import { Link } from 'react-router-dom';
import HeroDashboard from './HeroDashboard';
import { registerUrl, loginUrl } from '../data/site';
import './Hero.css';

export default function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy anim-fade-up">
          <p className="hero-brand">PosHive</p>
          <h1>POS, inventory, and storefront — one platform.</h1>
          <p className="hero-lead">
            Multi-tenant retail software for growing shops. Checkout that survives offline, stock
            across branches, and a real storefront on your subdomain.
          </p>
          <div className="hero-cta">
            <a className="btn btn-primary" href={registerUrl}>
              Get Started
            </a>
            <a className="btn btn-secondary" href={loginUrl}>
              Login
            </a>
            <Link className="hero-inline" to="/pricing">
              View pricing →
            </Link>
          </div>
        </div>
        <div className="hero-visual anim-fade-up" style={{ animationDelay: '0.1s' }}>
          <HeroDashboard />
        </div>
      </div>
    </section>
  );
}
