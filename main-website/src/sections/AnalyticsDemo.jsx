import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import './AnalyticsDemo.css';

const sample = [
  { name: 'Mon', sales: 12 },
  { name: 'Tue', sales: 18 },
  { name: 'Wed', sales: 15 },
  { name: 'Thu', sales: 22 },
  { name: 'Fri', sales: 28 },
  { name: 'Sat', sales: 34 },
  { name: 'Sun', sales: 21 },
];

export default function AnalyticsDemo() {
  const { ref, visible } = useReveal();
  return (
    <section className="section analytics-sec" id="analytics" ref={ref}>
      <div className={`container analytics-layout reveal ${visible ? 'is-visible' : ''}`}>
        <div>
          <p className="section-label">Analytics</p>
          <h2 className="section-title">Reports operators can act on</h2>
          <p className="section-lead">
            Business dashboards and reports cover sales, inventory health, and customer signals.
            Charts in CodexPOS use Recharts. Sample chart below is illustrative only.
          </p>
          <ul className="ana-list">
            <li>Sales and order reporting on Professional+ (seed reports flag)</li>
            <li>AI Pro (Enterprise defaults): assistive reorder insights — not autonomous buying</li>
            <li>No guaranteed forecasts or “set and forget” inventory claims</li>
          </ul>
          <Link className="text-link" to="/features/analytics">
            Analytics & AI details →
          </Link>
        </div>
        <div className="ana-chart-wrap">
          <p className="ana-chart-label">Sample weekly orders (demo data)</p>
          <div className="ana-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sample}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#5a7380" />
                <YAxis tick={{ fontSize: 12 }} stroke="#5a7380" width={28} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid rgba(11,31,42,0.1)',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="sales" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
