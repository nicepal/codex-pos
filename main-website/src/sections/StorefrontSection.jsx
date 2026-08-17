import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import './StorefrontSection.css';

export default function StorefrontSection() {
  const { ref, visible } = useReveal();
  return (
    <section className="section storefront-sec" id="storefront" ref={ref}>
      <div className={`container storefront-layout reveal ${visible ? 'is-visible' : ''}`}>
        <div className="sf-visual" aria-hidden="true">
          <div className="sf-browser">
            <div className="sf-chrome">
              <span /><span /><span />
              <code>yourshop.codexpos.store</code>
            </div>
            <div className="sf-body">
              <div className="sf-hero-block" />
              <div className="sf-products">
                <span /><span /><span />
              </div>
            </div>
          </div>
        </div>
        <div>
          <p className="section-label">Storefront</p>
          <h2 className="section-title">Sell online on your subdomain</h2>
          <p className="section-lead">
            Tenant storefronts on {'{slug}'}.codexpos.store with cart, checkout, accounts,
            wishlists, and reviews. Custom domains via Omnichannel (Professional+ defaults).
            Starter seed features omit storefront.
          </p>
          <ul className="sf-list">
            <li>Not a full Shopify clone — import catalogs, run CodexPOS commerce</li>
            <li>Marketplace channels are stubs today — not live Amazon/eBay networks</li>
          </ul>
          <Link className="text-link" to="/features/ecommerce">
            Storefront details →
          </Link>
        </div>
      </div>
    </section>
  );
}
