import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import CodexPOSLogo from './CodexPOSLogo';
import { nav } from '../data/navigation';
import { loginUrl, registerUrl } from '../data/site';
import './Navbar.css';

const CLOSE_DELAY_MS = 160;

const DESKTOP_MENUS = [
  { key: 'product', label: 'Product', items: nav.product },
  { key: 'solutions', label: 'Solutions', items: nav.solutions },
  { key: 'resources', label: 'Resources', items: nav.resources },
];

function Dropdown({ label, items, open, onOpen, onClose }) {
  const id = useId();
  const closeTimer = useRef(null);

  const clearClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const handleEnter = () => {
    clearClose();
    onOpen();
  };

  const handleLeave = () => {
    clearClose();
    closeTimer.current = setTimeout(onClose, CLOSE_DELAY_MS);
  };

  useEffect(() => () => clearClose(), []);

  return (
    <div
      className={`nav-dropdown ${open ? 'is-open' : ''}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        className="nav-dropdown-trigger"
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="true"
        onClick={() => (open ? onClose() : onOpen())}
      >
        {label}
        <span aria-hidden="true">▾</span>
      </button>
      <div id={id} className="nav-dropdown-panel" role="menu" hidden={!open}>
        {items.map((item) => (
          <Link
            key={item.href + item.label}
            to={item.href}
            role="menuitem"
            onClick={onClose}
          >
            <strong>{item.label}</strong>
            {item.description && <span>{item.description}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}

function MobileAccordion({ label, items, open, onToggle, onNavigate }) {
  const id = useId();
  return (
    <div className={`nav-mobile-acc ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="nav-mobile-acc-trigger"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
      >
        {label}
        <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div id={id} className="nav-mobile-acc-panel">
          {items.map((item) => (
            <Link key={item.href + item.label} to={item.href} onClick={onNavigate}>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileSection, setMobileSection] = useState(null);
  const navRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onDoc = (e) => {
      if (!navRef.current?.contains(e.target)) {
        setOpenMenu(null);
        setMobileOpen(false);
        setMobileSection(null);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
        setMobileOpen(false);
        setMobileSection(null);
      }
    };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) setMobileSection(null);
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const closeMobile = () => {
    setMobileOpen(false);
    setMobileSection(null);
  };

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`} ref={navRef}>
      <div className="container site-header-inner">
        <CodexPOSLogo size="md" variant="light" />
        <nav className="nav-desktop" aria-label="Primary">
          {DESKTOP_MENUS.map((menu) => (
            <Dropdown
              key={menu.key}
              label={menu.label}
              items={menu.items}
              open={openMenu === menu.key}
              onOpen={() => setOpenMenu(menu.key)}
              onClose={() => setOpenMenu(null)}
            />
          ))}
          <NavLink to="/pricing" className="nav-link">
            Pricing
          </NavLink>
        </nav>
        <div className="nav-actions">
          <a className="btn btn-ghost nav-signin" href={loginUrl}>
            Login
          </a>
          <a className="btn btn-primary" href={registerUrl}>
            Get Started
          </a>
          <button
            type="button"
            className="nav-burger"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="nav-mobile container">
          {DESKTOP_MENUS.map((menu) => (
            <MobileAccordion
              key={menu.key}
              label={menu.label}
              items={menu.items}
              open={mobileSection === menu.key}
              onToggle={() =>
                setMobileSection((cur) => (cur === menu.key ? null : menu.key))
              }
              onNavigate={closeMobile}
            />
          ))}
          <Link to="/pricing" onClick={closeMobile}>
            Pricing
          </Link>
          <a href={loginUrl}>Login</a>
          <a className="btn btn-primary" href={registerUrl}>
            Get Started
          </a>
        </div>
      )}
    </header>
  );
}
