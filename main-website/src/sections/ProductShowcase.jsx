import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import './ProductShowcase.css';

const panels = [
  {
    title: 'Cashier POS',
    body: 'Search, variants, cash/card/split, tips, gift cards, and held sales — with PIN lock and shift support when Staff Pro is on.',
    href: '/features/pos',
    tone: 'a',
  },
  {
    title: 'Catalog & stock',
    body: 'Products, images, categories, and branch stock. Inventory Pro adds transfers, stock take, and PO receiving.',
    href: '/features/inventory',
    tone: 'b',
  },
  {
    title: 'Business dashboard',
    body: 'Orders, customers, team, settings, and reports in one tenant workspace — gated by plan limits and feature packs.',
    href: '/features',
    tone: 'c',
  },
];

export default function ProductShowcase() {
  const { ref, visible } = useReveal();
  return (
    <section className="section showcase" ref={ref}>
      <div className={`container reveal ${visible ? 'is-visible' : ''}`}>
        <p className="section-label">Product</p>
        <h2 className="section-title">See the surface cashiers and owners actually use</h2>
        <p className="section-lead">
          Marketing previews of real modules — POS, inventory, and the business dashboard.
        </p>
        <div className="showcase-grid">
          {panels.map((p) => (
            <article key={p.title} className={`showcase-card showcase-card--${p.tone}`}>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <Link className="text-link" to={p.href}>
                Details →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
