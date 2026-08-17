import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import './InventorySection.css';

export default function InventorySection() {
  const { ref, visible } = useReveal();
  return (
    <section className="section inventory-sec" id="inventory" ref={ref}>
      <div className={`container inventory-layout reveal ${visible ? 'is-visible' : ''}`}>
        <div>
          <p className="section-label">Inventory</p>
          <h2 className="section-title">Stock that follows every sale</h2>
          <p className="section-lead">
            Catalog with variants and images. Movements tied to orders. Inventory Pro unlocks
            transfers, stock take, and purchase-order receiving.
          </p>
          <ul className="inv-list">
            <li>Branch stock visibility within plan limits</li>
            <li>Suppliers and purchase orders</li>
            <li>Low-stock awareness on the dashboard</li>
          </ul>
          <Link className="text-link" to="/features/inventory">
            Inventory details →
          </Link>
        </div>
        <div className="inv-panel" aria-hidden="true">
          <div className="inv-row">
            <span>MUG-01 · Ceramic Mug</span>
            <strong>42</strong>
          </div>
          <div className="inv-row">
            <span>BEAN-12 · House Blend</span>
            <strong>7</strong>
          </div>
          <div className="inv-row inv-row--warn">
            <span>Transfer · Downtown → Mall</span>
            <strong>Pending</strong>
          </div>
          <div className="inv-row">
            <span>PO #104 · Receiving</span>
            <strong>Open</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
