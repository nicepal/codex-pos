import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './HeroDashboard.css';

/** Illustrative sample only — labeled as demo, not real metrics. */
const chartData = [
  { d: 'Mon', revenue: 4200 },
  { d: 'Tue', revenue: 5100 },
  { d: 'Wed', revenue: 4800 },
  { d: 'Thu', revenue: 6200 },
  { d: 'Fri', revenue: 7100 },
  { d: 'Sat', revenue: 8600 },
  { d: 'Sun', revenue: 6400 },
];

const orders = [
  { id: '#1842', customer: 'Walk-in', total: '$86.40', status: 'Paid' },
  { id: '#1841', customer: 'Card', total: '$42.00', status: 'Paid' },
  { id: '#1840', customer: 'Gift card', total: '$25.00', status: 'Paid' },
];

const products = [
  { name: 'House Blend Coffee', sold: 128 },
  { name: 'Ceramic Mug', sold: 96 },
  { name: 'Gift Card $25', sold: 74 },
];

const lowStock = [
  { sku: 'MUG-01', qty: 4 },
  { sku: 'BEAN-12', qty: 7 },
];

export default function HeroDashboard() {
  return (
    <div className="hero-dash" aria-hidden="true">
      <div className="hero-dash-shell">
        <header className="hero-dash-top">
          <div>
            <strong>Operations</strong>
            <span>Product preview · sample data</span>
          </div>
          <div className="hero-dash-pills">
            <span>Today</span>
            <span className="is-active">7 days</span>
          </div>
        </header>

        <div className="hero-kpis">
          <div>
            <span>Revenue</span>
            <strong>$42,480</strong>
          </div>
          <div>
            <span>Orders</span>
            <strong>1,286</strong>
          </div>
          <div>
            <span>Customers</span>
            <strong>842</strong>
          </div>
          <div>
            <span>SKUs</span>
            <strong>1,024</strong>
          </div>
        </div>

        <div className="hero-dash-main">
          <div className="hero-chart-panel">
            <div className="hero-panel-title">Revenue (sample)</div>
            <div className="hero-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f766e" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="d" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid rgba(11,31,42,0.1)',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#0f766e"
                    strokeWidth={2.2}
                    fill="url(#revFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="hero-side-panels">
            <div>
              <div className="hero-panel-title">Recent orders</div>
              <ul>
                {orders.map((o) => (
                  <li key={o.id}>
                    <span>{o.id}</span>
                    <span>{o.customer}</span>
                    <strong>{o.total}</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="hero-panel-title">Top products</div>
              <ul>
                {products.map((p) => (
                  <li key={p.name}>
                    <span>{p.name}</span>
                    <strong>{p.sold}</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="hero-panel-title">Low stock</div>
              <ul>
                {lowStock.map((s) => (
                  <li key={s.sku}>
                    <span>{s.sku}</span>
                    <strong className="warn">{s.qty}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <aside className="hero-float hero-float-a anim-float">
        <span>Branch transfer</span>
        <strong>12 units · Downtown → Mall</strong>
      </aside>
      <aside className="hero-float hero-float-b anim-float">
        <span>Offline queue</span>
        <strong>3 orders syncing</strong>
      </aside>
    </div>
  );
}
