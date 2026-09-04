# PosHive Marketing Website

Standalone React + Vite marketing site for **PosHive** (`poshive.store`).

## Scripts

```bash
npm install
npm run dev      # Vite dev server (default http://localhost:5173)
npm run build
npm run preview
```

## Environment

Copy `.env.example` to `.env`:

| Variable | Purpose |
|----------|---------|
| `VITE_APP_URL` | Business app base (Login / Get Started → `/login`, `/register`) |
| `VITE_API_URL` | Optional API base for contact form |
| `VITE_SITE_URL` | Canonical site URL for SEO (`https://poshive.store`) |

## Brand assets

All logos live in `public/assets/images/branding/`:

| File | Use |
|------|-----|
| `poshive-logo-light.svg` / `poshive-logo.svg` | Horizontal lockup (light backgrounds) |
| `poshive-logo-dark.svg` | Horizontal lockup (dark backgrounds) |
| `poshive-logo-stacked.svg` | Icon above wordmark |
| `poshive-icon.svg` | Icon / favicon (light backgrounds) |
| `poshive-icon-dark.svg` | Icon on dark backgrounds |
| `poshive-logo-monochrome-*.svg` | Black / white lockups |
| `poshive-favicon-32.png` / `64.png` | Favicons |
| `poshive-apple-touch-icon-180.png` | Apple touch icon |
| `poshive-og-image-1200x630.png` | Open Graph / Twitter |

React: `<PosHiveLogo variant="light\|dark" size="sm\|md\|lg" preferIconOnMobile />`

## Notes

Copy and pricing are grounded in `backend/src/database/seed.js` and shipped modules. Do not invent testimonials, stats, or marketplace claims.
