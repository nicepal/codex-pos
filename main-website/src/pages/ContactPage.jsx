import { useState } from 'react';
import { submitContact } from '../services/contactService';
import { usePageMeta } from '../hooks/usePageMeta';
import { site } from '../data/site';
import './ContactPage.css';

const initial = { name: '', email: '', company: '', message: '' };

export default function ContactPage() {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [pending, setPending] = useState(false);

  usePageMeta({
    title: 'Contact',
    description: 'Contact the CodexPOS team about plans, demos, or partnership.',
    path: '/contact',
  });

  function validate(values) {
    const next = {};
    if (!values.name.trim()) next.name = 'Name is required';
    if (!values.email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = 'Enter a valid email';
    if (!values.message.trim() || values.message.trim().length < 10) {
      next.message = 'Message should be at least 10 characters';
    }
    return next;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length) return;

    setPending(true);
    setStatus(null);
    const result = await submitContact(form);
    setPending(false);
    setStatus(result);
    if (result.success) setForm(initial);
  }

  return (
    <div className="page-shell">
      <header className="container page-hero">
        <p className="section-label">Contact</p>
        <h1>Talk with CodexPOS</h1>
        <p>
          Questions about plans, Shopify import, or enterprise packs? Email{' '}
          <a href={`mailto:${site.email}`}>{site.email}</a> or send a note below.
        </p>
      </header>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container contact-layout">
          <form className="contact-form card-surface" onSubmit={onSubmit} noValidate>
            <label>
              Name
              <input
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoComplete="name"
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </label>
            <label>
              Company <span className="optional">(optional)</span>
              <input
                name="company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                autoComplete="organization"
              />
            </label>
            <label>
              Message
              <textarea
                name="message"
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
              {errors.message && <span className="field-error">{errors.message}</span>}
            </label>
            <button className="btn btn-primary" type="submit" disabled={pending}>
              {pending ? 'Sending…' : 'Send message'}
            </button>
            {status && (
              <p className={`form-status ${status.success ? 'is-ok' : 'is-err'}`}>{status.message}</p>
            )}
          </form>
          <aside className="contact-aside">
            <h2>What to expect</h2>
            <p>
              There is no public contact API in the backend yet — submissions are validated in the
              browser and stored locally with a TODO for API wiring.
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}
