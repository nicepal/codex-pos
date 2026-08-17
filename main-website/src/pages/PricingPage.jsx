import { useState } from 'react';
import { plans, comparisonRows, billingToggle } from '../data/pricing';
import { registerUrl } from '../data/site';
import { usePageMeta } from '../hooks/usePageMeta';
import FinalCta from '../sections/FinalCta';
import './PricingPage.css';

function Cell({ value }) {
  if (value === true) return <span className="cell-yes">Yes</span>;
  if (value === false) return <span className="cell-no">—</span>;
  return value;
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  usePageMeta({
    title: 'Pricing',
    description:
      'CodexPOS plans: Starter $29/mo, Professional $79/mo, Enterprise $199/mo. Annual billing saves roughly two months.',
    path: '/pricing',
  });

  return (
    <>
      <div className="page-shell">
        <header className="container page-hero">
          <p className="section-label">Pricing</p>
          <h1>Clear plans for every stage</h1>
          <p>
            Starter $29, Professional $79, Enterprise $199 — with trials and limits that match the
            live product configuration. Feature packs follow Professional and Enterprise defaults.
          </p>
          <div className="billing-toggle" role="group" aria-label="Billing period">
            <button
              type="button"
              className={!yearly ? 'is-active' : ''}
              onClick={() => setYearly(false)}
            >
              {billingToggle.monthly}
            </button>
            <button
              type="button"
              className={yearly ? 'is-active' : ''}
              onClick={() => setYearly(true)}
            >
              {billingToggle.yearly}
            </button>
          </div>
          {yearly && <p className="billing-note">{billingToggle.yearlyNote}</p>}
        </header>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container pricing-grid">
            {plans.map((plan) => {
              const price = yearly ? plan.yearly : plan.monthly;
              const period = yearly ? '/yr' : '/mo';
              return (
                <article
                  key={plan.id}
                  className={`pricing-card ${plan.highlighted ? 'is-featured' : ''}`}
                >
                  {plan.highlighted && <span className="pricing-badge">Most chosen</span>}
                  <h2>{plan.name}</h2>
                  <p className="pricing-blurb">{plan.blurb}</p>
                  <p className="pricing-price">
                    <strong>${price}</strong>
                    <span>{period}</span>
                  </p>
                  <p className="pricing-trial">{plan.trialDays}-day trial</p>
                  <ul className="pricing-limits">
                    {Object.values(plan.limits).map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                  <ul className="pricing-includes">
                    {plan.includes.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                  {plan.excludes.length > 0 && (
                    <ul className="pricing-excludes">
                      {plan.excludes.map((i) => (
                        <li key={i}>{i}</li>
                      ))}
                    </ul>
                  )}
                  <a className="btn btn-primary" href={registerUrl}>
                    Get Started
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section">
          <div className="container">
            <h2 className="section-title">Compare plans</h2>
            <div className="compare-wrap">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Capability</th>
                    <th>Starter</th>
                    <th>Professional</th>
                    <th>Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      <td>
                        <Cell value={row.starter} />
                      </td>
                      <td>
                        <Cell value={row.professional} />
                      </td>
                      <td>
                        <Cell value={row.enterprise} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
      <FinalCta />
    </>
  );
}
